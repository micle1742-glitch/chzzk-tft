import "server-only";
import { getSupabase } from "./db";
import { createOverlaySecrets, generateOverlayToken, hashOverlaySecret, isOverlaySecretFormat } from "./overlay-token";

/*
 * 비밀 OBS 오버레이 DB 처리 (docs/sql/007_create_overlays.sql, 008 권한)
 * - 토큰(주소)·관리 키(재발급·삭제) 원문은 저장하지 않는다. SHA-256 해시로만 찾고 바꾼다
 * - 토큰으로는 조회만. 관리(재발급·삭제)는 로그인 세션의 user_id로 (아래 "로그인 계정 기준 관리")
 *   관리 키는 로그인 필수화 전에 발급된 오버레이를 계정에 연결할 때만 쓴다 (claimOverlayForUser)
 * - 폐기(revoked_at)된 행은 "없는 행"과 똑같이 null을 돌려준다
 * - 오류 메시지·로그에는 DB 오류 코드만 (토큰·관리 키·해시·PUUID 미포함)
 *
 * 시각 컬럼 (rotated_at·last_seen_at·revoked_at ≥ created_at 제약)
 * - created_at은 DB now() 기본값. 발급 때 last_seen_at은 DB가 돌려준 created_at 값을 그대로 넣는다
 * - 이후 갱신은 Supabase 클라이언트(PostgREST)로 SQL now()를 직접 쓸 수 없어서 (RPC 함수는 아직 없음),
 *   "서버 시각과 이 행의 DB 시각 중 늦은 값"을 넣는다 → 서버 시계가 DB보다 늦어도 제약을 어기지 않는다
 */

const TABLE = "overlays";
// 관리 키 쿠키: 오버레이 관리 API 경로에만 보내고, 다른 사이트에서 시작한 요청에는 붙지 않게(strict)
export const OVERLAY_MANAGE_COOKIE = "tieron_overlay_manage";
export const overlayManageCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/overlay",
  maxAge: 60 * 60 * 24 * 365, // 1년 (초)
};
// 이 기간 동안 조회되지 않은 오버레이는 정리한다 (기준: coalesce(last_seen_at, created_at))
export const OVERLAY_RETENTION_DAYS = 90;
// 마지막 조회 시각·표시용 Riot ID는 이 간격마다만 갱신 (매 요청마다 DB 쓰기 방지)
export const OVERLAY_TOUCH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type OverlayRow = {
  id: string;
  puuid: string;
  game_name: string;
  tag_line: string;
  created_at: string;
  rotated_at: string | null;
  last_seen_at: string | null;
};
const ROW_COLUMNS = "id, puuid, game_name, tag_line, created_at, rotated_at, last_seen_at";

function dbError(step: string, code: string | undefined): Error {
  return new Error(`오버레이 ${step} 실패 (${code ?? "알 수 없음"})`);
}

// 서버 시각과 주어진 DB 시각들 중 가장 늦은 값 (ISO)
function notBefore(...dbTimes: (string | null | undefined)[]): string {
  const times = dbTimes.map((t) => (t ? Date.parse(t) : NaN)).filter(Number.isFinite);
  return new Date(Math.max(Date.now(), ...times)).toISOString();
}

// 발급: 새 행을 만들고 토큰·관리 키 원문을 한 번만 돌려준다 (다시 볼 수 없음 → 잃어버리면 재발급)
export async function createOverlay(input: {
  puuid: string;
  gameName: string;
  tagLine: string;
  userId: string | null;
}): Promise<{ token: string; manageKey: string }> {
  const secrets = createOverlaySecrets();
  const db = getSupabase();
  const inserted = await db
    .from(TABLE)
    .insert({
      token_hash: secrets.tokenHash,
      manage_key_hash: secrets.manageKeyHash,
      user_id: input.userId,
      puuid: input.puuid,
      game_name: input.gameName,
      tag_line: input.tagLine,
    })
    .select("id, created_at")
    .single();
  if (inserted.error) throw dbError("발급", inserted.error.code);

  // 최초 last_seen_at = DB가 정한 created_at (같은 DB 시각이라 제약을 어기지 않음)
  // 실패해도 발급은 유효하다 — 정리 기준이 coalesce(last_seen_at, created_at)라 null이어도 정리된다
  const seen = await db
    .from(TABLE)
    .update({ last_seen_at: inserted.data.created_at })
    .eq("id", inserted.data.id);
  if (seen.error) console.error(`오버레이 최초 조회 시각 기록 실패 (${seen.error.code ?? "알 수 없음"})`);

  return { token: secrets.token, manageKey: secrets.manageKey };
}

async function findActive(column: "token_hash" | "manage_key_hash", secret: unknown): Promise<OverlayRow | null> {
  // 형식이 틀리면 DB를 조회하지 않는다
  if (!isOverlaySecretFormat(secret)) return null;
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(ROW_COLUMNS)
    .eq(column, hashOverlaySecret(secret))
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw dbError("조회", error.code);
  return (data as OverlayRow | null) ?? null;
}

// 오버레이 토큰으로 조회 (없거나 폐기됐으면 null)
export function findOverlayByToken(token: unknown) {
  return findActive("token_hash", token);
}

// 관리 키로 조회 (없거나 폐기됐으면 null)
export function findOverlayByManageKey(manageKey: unknown) {
  return findActive("manage_key_hash", manageKey);
}

// 재발급: 같은 행의 token_hash만 바꾼다 → 이전 토큰은 즉시 무효. 새 토큰 원문을 돌려준다 (대상이 없으면 null)
export async function rotateOverlayToken(manageKey: unknown): Promise<string | null> {
  const row = await findOverlayByManageKey(manageKey);
  if (!row) return null;
  const token = generateOverlayToken();
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ token_hash: hashOverlaySecret(token), rotated_at: notBefore(row.created_at, row.rotated_at) })
    .eq("id", row.id)
    .eq("manage_key_hash", hashOverlaySecret(manageKey as string))
    .is("revoked_at", null)
    .select("id");
  if (error) throw dbError("재발급", error.code);
  // 그사이 폐기됐으면 바뀐 행이 없다
  return data && data.length === 1 ? token : null;
}

// 폐기: revoked_at을 기록한다 → 토큰·관리 키 모두 더 이상 쓸 수 없다. 폐기했으면 true
export async function revokeOverlay(manageKey: unknown): Promise<boolean> {
  const row = await findOverlayByManageKey(manageKey);
  if (!row) return false;
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ revoked_at: notBefore(row.created_at, row.rotated_at, row.last_seen_at) })
    .eq("id", row.id)
    .is("revoked_at", null)
    .select("id");
  if (error) throw dbError("폐기", error.code);
  return !!data && data.length === 1;
}

/*
 * 로그인 계정 기준 관리 (치지직 로그인 필수화 이후의 기본 방식)
 * - 권한은 세션의 user_id로만 판단한다. 다른 사용자의 오버레이는 조회·재발급·삭제 대상에 들어오지 않는다
 * - 사용자당 활성 오버레이는 하나 (발급 API가 확인. DB 제약은 없어서 동시에 두 번 발급되면 둘 다 아래 함수가 다룬다)
 */

// 로그인 사용자의 활성 오버레이 (여러 개면 가장 최근 것)
export async function findOverlayByUser(userId: string): Promise<OverlayRow | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(ROW_COLUMNS)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw dbError("조회", error.code);
  return ((data?.[0] as OverlayRow | undefined) ?? null);
}

// 재발급 (로그인 사용자 본인 것만). 새 토큰 원문, 대상이 없으면 null
export async function rotateOverlayTokenForUser(userId: string): Promise<string | null> {
  const row = await findOverlayByUser(userId);
  if (!row) return null;
  const token = generateOverlayToken();
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ token_hash: hashOverlaySecret(token), rotated_at: notBefore(row.created_at, row.rotated_at) })
    .eq("id", row.id)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id");
  if (error) throw dbError("재발급", error.code);
  return data && data.length === 1 ? token : null;
}

// 폐기 (로그인 사용자의 활성 오버레이 전부). 하나라도 폐기했으면 true
export async function revokeOverlaysForUser(userId: string): Promise<boolean> {
  const db = getSupabase();
  const { data: rows, error } = await db
    .from(TABLE)
    .select(ROW_COLUMNS)
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw dbError("조회", error.code);
  let revoked = 0;
  for (const row of (rows ?? []) as OverlayRow[]) {
    const result = await db
      .from(TABLE)
      .update({ revoked_at: notBefore(row.created_at, row.rotated_at, row.last_seen_at) })
      .eq("id", row.id)
      .eq("user_id", userId)
      .is("revoked_at", null)
      .select("id");
    if (result.error) throw dbError("폐기", result.error.code);
    revoked += result.data?.length ?? 0;
  }
  return revoked > 0;
}

// 로그인 없이 발급했던 오버레이를 관리 키(쿠키)로 확인해 로그인 계정에 연결. 아직 주인이 없는 행만. 연결했으면 true
export async function claimOverlayForUser(manageKey: unknown, userId: string): Promise<boolean> {
  const row = await findOverlayByManageKey(manageKey);
  if (!row) return false;
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ user_id: userId })
    .eq("id", row.id)
    .is("user_id", null)
    .is("revoked_at", null)
    .select("id");
  if (error) throw dbError("계정 연결", error.code);
  return !!data && data.length === 1;
}

// 마지막 조회 시각 기록 (+ 바뀐 표시용 Riot ID). 간격이 안 지났으면 아무것도 하지 않는다
export function needsTouch(row: OverlayRow): boolean {
  const last = row.last_seen_at ? Date.parse(row.last_seen_at) : NaN;
  return !Number.isFinite(last) || Date.now() - last >= OVERLAY_TOUCH_INTERVAL_MS;
}

export async function touchOverlay(row: OverlayRow, display: { gameName: string; tagLine: string } | null) {
  const update: Record<string, string> = { last_seen_at: notBefore(row.created_at, row.last_seen_at) };
  if (display && (display.gameName !== row.game_name || display.tagLine !== row.tag_line)) {
    update.game_name = display.gameName;
    update.tag_line = display.tagLine;
  }
  const { error } = await getSupabase().from(TABLE).update(update).eq("id", row.id).is("revoked_at", null);
  if (error) throw dbError("조회 시각 기록", error.code);
}

/*
 * 오래 안 쓴 오버레이 정리: coalesce(last_seen_at, created_at) < 지금 − 90일
 * (PostgREST 필터로는 coalesce를 쓸 수 없어 같은 뜻의 or 조건으로 쓴다)
 * 발급 요청 때 불리며, 서버 인스턴스마다 한 시간에 한 번만 실제로 지운다
 */
const globalForOverlays = globalThis as typeof globalThis & { __tieronOverlayPurgedAt?: number };
export async function purgeStaleOverlays(): Promise<void> {
  const now = Date.now();
  if (now - (globalForOverlays.__tieronOverlayPurgedAt ?? 0) < 60 * 60 * 1000) return;
  globalForOverlays.__tieronOverlayPurgedAt = now;
  const cutoff = new Date(now - OVERLAY_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await getSupabase()
    .from(TABLE)
    .delete()
    .or(`last_seen_at.lt.${cutoff},and(last_seen_at.is.null,created_at.lt.${cutoff})`);
  if (error) console.error(`오래된 오버레이 정리 실패 (${error.code ?? "알 수 없음"})`);
}
