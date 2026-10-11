import type { NextRequest } from "next/server";
import { guardRequest, overlayFailure, overlayJson } from "../../../lib/overlay-http";
import { OVERLAY_MANAGE_COOKIE, overlayManageCookieOptions, revokeOverlay } from "../../../lib/overlays";

/*
 * POST /api/overlay/revoke — 오버레이 삭제(폐기). 주소와 관리 키 모두 더 이상 쓸 수 없다
 * - 권한: 관리 키 쿠키만 (토큰으로는 불가). 대상이 없거나 이미 폐기됐으면 404
 * - 성공·404 모두 관리 키 쿠키를 지운다 (쓸모없는 쿠키를 남기지 않게 → 다시 발급 가능)
 */
export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, "manage", { sameOrigin: true });
  if (blocked) return blocked;

  try {
    const revoked = await revokeOverlay(request.cookies.get(OVERLAY_MANAGE_COOKIE)?.value);
    const response = revoked ? overlayJson({ success: true }) : overlayFailure("not_found");
    response.cookies.set(OVERLAY_MANAGE_COOKIE, "", { ...overlayManageCookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    console.error("오버레이 삭제 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    return overlayFailure("unavailable");
  }
}
