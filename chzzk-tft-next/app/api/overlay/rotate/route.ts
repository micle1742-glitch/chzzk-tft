import type { NextRequest } from "next/server";
import { guardRequest, overlayFailure, overlayJson } from "../../../lib/overlay-http";
import { OVERLAY_MANAGE_COOKIE, rotateOverlayToken } from "../../../lib/overlays";

/*
 * POST /api/overlay/rotate — 오버레이 주소 재발급 (이전 주소는 즉시 무효)
 * - 권한: 발급 때 받은 관리 키 쿠키(HttpOnly)만. 오버레이 토큰(주소)으로는 재발급할 수 없다
 * - 관리 키가 없거나 폐기된 오버레이면 404 (없는 경우와 구분하지 않음)
 * 출력: { success, token, path } — 새 토큰 원문은 이 응답에서 한 번만
 */
export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, "manage", { sameOrigin: true });
  if (blocked) return blocked;

  try {
    const token = await rotateOverlayToken(request.cookies.get(OVERLAY_MANAGE_COOKIE)?.value);
    if (!token) return overlayFailure("not_found");
    return overlayJson({ success: true, token, path: `/overlay/tft/${token}` });
  } catch (error) {
    console.error("오버레이 재발급 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    return overlayFailure("unavailable");
  }
}
