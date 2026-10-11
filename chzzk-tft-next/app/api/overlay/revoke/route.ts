import type { NextRequest } from "next/server";
import { guardRequest, overlayFailure, overlayJson } from "../../../lib/overlay-http";
import { OVERLAY_MANAGE_COOKIE, overlayManageCookieOptions, revokeOverlaysForUser } from "../../../lib/overlays";
import { getSession } from "../../../lib/session";

/*
 * POST /api/overlay/revoke — 오버레이 삭제(폐기). 주소는 즉시 작동을 멈춘다
 * - 권한: 치지직 로그인 세션의 계정(user_id)에 연결된 오버레이만 (토큰으로는 불가)
 * - 로그인 안 함 401 / 이 계정의 오버레이가 없으면 404
 * - 로그인 필수화 전에 받은 관리 키 쿠키가 남아 있으면 함께 지운다
 */
export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, "manage", { sameOrigin: true });
  if (blocked) return blocked;

  const session = await getSession();
  if (!session) return overlayFailure("unauthorized");

  try {
    const revoked = await revokeOverlaysForUser(session.userId);
    const response = revoked ? overlayJson({ success: true }) : overlayFailure("not_found");
    if (request.cookies.has(OVERLAY_MANAGE_COOKIE)) {
      response.cookies.set(OVERLAY_MANAGE_COOKIE, "", { ...overlayManageCookieOptions, maxAge: 0 });
    }
    return response;
  } catch (error) {
    console.error("오버레이 삭제 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    return overlayFailure("unavailable");
  }
}
