import type { NextRequest } from "next/server";
import { guardRequest, overlayFailure, overlayJson } from "../../lib/overlay-http";
import { createOverlay, findOverlayByUser, purgeStaleOverlays } from "../../lib/overlays";
import { fetchAccount, logRiotFailure, riotHeaders, riotStatus } from "../../lib/riot";
import { getSession } from "../../lib/session";
import { stopReasonOf } from "../../lib/tft-matches";

/*
 * POST /api/overlay — 비밀 OBS 오버레이 주소 발급 (치지직 로그인 필수)
 * 입력: { nickname, tagline } (Riot ID). 출력: { success, token, path, gameName, tagLine }
 * - 로그인 계정(user_id)에 연결된다. 재발급·삭제도 로그인 계정으로만 (다른 브라우저·기기에서도 로그인하면 관리 가능)
 * - 토큰 원문은 이 응답에서 한 번만 준다 (DB에는 해시만). 잃어버리면 재발급
 * - 계정당 활성 오버레이 하나 (이미 있으면 409 → 재발급·삭제 안내)
 * - Riot 계정 소유권을 확인하지 않는다 — 누구 Riot ID로든 발급되는 "조회" 정보. 응답에도 인증 표시 없음
 * - DB의 manage_key_hash는 필수 칸이라 관리 키를 만들어 해시로만 저장하고, 원문은 어디에도 주지 않는다
 */
export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, "issue", { sameOrigin: true });
  if (blocked) return blocked;

  const session = await getSession();
  if (!session) return overlayFailure("unauthorized");

  const body: { nickname?: unknown; tagline?: unknown } = await request.json().catch(() => ({}));
  const { nickname, tagline } = body;
  // /api/tft/matches와 같은 기준
  if (
    typeof nickname !== "string" ||
    typeof tagline !== "string" ||
    !nickname.trim() ||
    !tagline.trim() ||
    nickname.length > 100 ||
    tagline.length > 20
  ) {
    return overlayFailure("invalid");
  }

  try {
    // 계정당 하나: 이미 있으면 새로 만들지 않는다
    if (await findOverlayByUser(session.userId)) return overlayFailure("already_issued");

    const headers = riotHeaders();
    if (!headers) {
      console.error("오버레이 발급 불가: 서버에 Riot API 키가 설정되지 않음");
      return overlayFailure("unavailable");
    }

    let account;
    try {
      account = await fetchAccount(nickname, tagline, headers, request.signal);
    } catch (error) {
      if (riotStatus(error) === 404) return overlayFailure("account_not_found");
      logRiotFailure("Account (오버레이 발급)", error);
      return overlayFailure(stopReasonOf(error) === "rate_limit" ? "too_many" : "unavailable");
    }

    await purgeStaleOverlays();
    const { token } = await createOverlay({
      puuid: account.puuid,
      gameName: account.gameName,
      tagLine: account.tagLine,
      userId: session.userId,
    });

    return overlayJson({
      success: true,
      token,
      path: `/overlay/tft/${token}`,
      gameName: account.gameName,
      tagLine: account.tagLine,
    });
  } catch (error) {
    // DB 오류 코드만 (토큰·관리 키는 오류 메시지에 들어가지 않는다)
    console.error("오버레이 발급 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    return overlayFailure("unavailable");
  }
}
