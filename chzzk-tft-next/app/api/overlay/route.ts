import type { NextRequest } from "next/server";
import { guardRequest, overlayFailure, overlayJson } from "../../lib/overlay-http";
import {
  OVERLAY_MANAGE_COOKIE,
  createOverlay,
  findOverlayByManageKey,
  overlayManageCookieOptions,
  purgeStaleOverlays,
} from "../../lib/overlays";
import { fetchAccount, logRiotFailure, riotHeaders, riotStatus } from "../../lib/riot";
import { getSession } from "../../lib/session";
import { stopReasonOf } from "../../lib/tft-matches";

/*
 * POST /api/overlay — 비밀 OBS 오버레이 주소 발급
 * 입력: { nickname, tagline } (Riot ID). 출력: { success, token, path, gameName, tagLine }
 * - 토큰 원문은 이 응답에서 한 번만 준다 (DB에는 해시만). 잃어버리면 재발급
 * - 관리 키(재발급·삭제 권한)는 응답 본문이 아니라 HttpOnly 쿠키로만 준다 → 토큰만으로는 관리할 수 없다
 * - 브라우저 하나당 관리 중인 오버레이 하나 (이미 있으면 409 → 재발급·삭제 안내)
 * - 로그인 없이 발급 가능 (치지직 로그인 필수화는 출시 단계). 로그인 상태면 user_id를 남긴다
 * - Riot 계정 소유권을 확인하지 않는다 — 누구 Riot ID로든 발급되는 "조회" 정보. 응답에도 인증 표시 없음
 */
export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, "issue", { sameOrigin: true });
  if (blocked) return blocked;

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
    // 이 브라우저가 이미 관리 중인 오버레이가 있으면 새로 만들지 않는다 (덮어쓰면 이전 것을 관리할 수 없게 됨)
    const existing = request.cookies.get(OVERLAY_MANAGE_COOKIE)?.value;
    if (existing && (await findOverlayByManageKey(existing))) return overlayFailure("already_issued");

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

    const session = await getSession();
    await purgeStaleOverlays();
    const { token, manageKey } = await createOverlay({
      puuid: account.puuid,
      gameName: account.gameName,
      tagLine: account.tagLine,
      userId: session?.userId ?? null,
    });

    const response = overlayJson({
      success: true,
      token,
      path: `/overlay/tft/${token}`,
      gameName: account.gameName,
      tagLine: account.tagLine,
    });
    response.cookies.set(OVERLAY_MANAGE_COOKIE, manageKey, overlayManageCookieOptions);
    return response;
  } catch (error) {
    // DB 오류 코드만 (토큰·관리 키는 오류 메시지에 들어가지 않는다)
    console.error("오버레이 발급 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    return overlayFailure("unavailable");
  }
}
