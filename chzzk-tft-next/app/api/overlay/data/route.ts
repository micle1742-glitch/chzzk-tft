import type { NextRequest } from "next/server";
import { guardRequest, overlayFailure, overlayJson } from "../../../lib/overlay-http";
import { findOverlayByToken, needsTouch, touchOverlay, type OverlayRow } from "../../../lib/overlays";
import { RIOT_ASIA, logRiotFailure, riotGet, riotHeaders, type RiotAccount } from "../../../lib/riot";
import { runTftMatches } from "../../../lib/tft-matches";
import { fetchTftRanked, type TftRankedEntry } from "../../../lib/tft-rank";

/*
 * POST /api/overlay/data — 오버레이 토큰으로 TFT 티어 + 오늘 랭크 순위 조회 (OBS 화면용, 읽기 전용)
 * 입력: { token }. 토큰은 URL 경로가 아니라 본문으로 받는다 (API 접근 로그에 남지 않게)
 * - 없는·폐기된·형식이 틀린 토큰은 모두 같은 404
 * - Riot ID → PUUID 조회 없이 저장된 PUUID로 바로 조회한다
 *   티어: tft-league-v1 by-puuid / 오늘 순위: /api/tft/matches mode "today"와 같은 runTftMatches (캐시·제한기 공용)
 * - 같은 오버레이는 서버 메모리에 60초 동안 결과를 재사용한다 (여러 화면·새로 고침이 Riot 호출을 늘리지 않게)
 * - 응답에 PUUID·내부 id·토큰 해시를 넣지 않는다. 계정 소유권 인증 표시도 없다 (조회 정보)
 */

export type OverlayDataResponse = {
  success: true;
  gameName: string;
  tagLine: string;
  // /api/search의 tft 결과와 같은 모양 (ranked가 null이면 랭크 기록 없음)
  tft: { status: "ok"; ranked: TftRankedEntry | null } | { status: "error" };
  // 오늘(KST) 랭크 순위, 최신이 앞. 조회하지 못했으면 null
  today: { placements: number[]; complete: boolean } | null;
  checkedAt: string;
};

const RESULT_TTL_MS = 60 * 1000;
type CacheEntry = { expires: number; promise: Promise<OverlayDataResponse> };
const globalForOverlayData = globalThis as typeof globalThis & { __tieronOverlayData?: Map<string, CacheEntry> };
const results = (globalForOverlayData.__tieronOverlayData ??= new Map());

// 여러 요청이 같은 결과를 기다리므로, 한 요청의 취소가 다른 요청의 조회를 멈추지 않게 취소 없는 신호를 쓴다
const NEVER_ABORT = new AbortController().signal;

async function load(row: OverlayRow, headers: Record<string, string>): Promise<OverlayDataResponse> {
  const [ranked, today] = await Promise.allSettled([
    fetchTftRanked(row.puuid, headers, NEVER_ABORT),
    runTftMatches({ puuid: row.puuid, todayMode: true, requestedSet: null, headers, signal: NEVER_ABORT }),
  ]);
  if (ranked.status === "rejected") logRiotFailure("TFT League (오버레이)", ranked.reason);

  // 표시용 Riot ID: 6시간마다 PUUID로 최신 표기를 확인해 저장 (닉네임 변경 반영). 실패해도 저장된 값으로 표시
  let gameName = row.game_name;
  let tagLine = row.tag_line;
  if (needsTouch(row)) {
    let display: { gameName: string; tagLine: string } | null = null;
    try {
      const account = await riotGet<RiotAccount>(
        `${RIOT_ASIA}/riot/account/v1/accounts/by-puuid/${encodeURIComponent(row.puuid)}`,
        headers,
        { signal: NEVER_ABORT }
      );
      if (account?.gameName && account?.tagLine) display = { gameName: account.gameName, tagLine: account.tagLine };
    } catch (error) {
      logRiotFailure("Account by PUUID (오버레이)", error);
    }
    if (display) ({ gameName, tagLine } = display);
    try {
      await touchOverlay(row, display);
    } catch (error) {
      console.error("오버레이 조회 시각 기록 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    }
  }

  const todayOutcome = today.status === "fulfilled" ? today.value : null;
  return {
    success: true,
    gameName,
    tagLine,
    tft: ranked.status === "fulfilled" ? { status: "ok", ranked: ranked.value } : { status: "error" },
    today:
      todayOutcome?.kind === "today"
        ? { placements: todayOutcome.body.placements, complete: todayOutcome.body.complete }
        : null,
    checkedAt: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  // 읽기 전용이라 출처는 확인하지 않는다 (다른 사이트는 CORS 때문에 응답을 읽을 수 없음). 횟수만 제한
  const blocked = guardRequest(request, "data", { sameOrigin: false });
  if (blocked) return blocked;

  const body: { token?: unknown } = await request.json().catch(() => ({}));

  let row: OverlayRow | null;
  try {
    // 형식이 틀린 토큰은 DB 조회 없이 null → 없는 토큰과 같은 404
    row = await findOverlayByToken(body.token);
  } catch (error) {
    console.error("오버레이 조회 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    return overlayFailure("unavailable");
  }
  if (!row) return overlayFailure("not_found");

  const headers = riotHeaders();
  if (!headers) {
    console.error("오버레이 조회 불가: 서버에 Riot API 키가 설정되지 않음");
    return overlayFailure("unavailable");
  }

  // 토큰 확인은 매 요청마다 위에서 끝났다 → 재발급·폐기된 주소는 캐시와 상관없이 바로 404
  const now = Date.now();
  for (const [id, entry] of results) if (entry.expires <= now) results.delete(id);
  const id = row.id;
  let entry = results.get(id);
  if (!entry) {
    entry = { expires: now + RESULT_TTL_MS, promise: load(row, headers) };
    results.set(id, entry);
    // 실패한 조회는 캐시에 남기지 않는다
    entry.promise.catch(() => results.delete(id));
  }

  try {
    return overlayJson(await entry.promise);
  } catch (error) {
    console.error("오버레이 데이터 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    return overlayFailure("unavailable");
  }
}
