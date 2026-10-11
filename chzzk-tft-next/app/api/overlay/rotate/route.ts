import type { NextRequest } from "next/server";
import { guardRequest, overlayFailure, overlayJson } from "../../../lib/overlay-http";
import { rotateOverlayTokenForUser } from "../../../lib/overlays";
import { getSession } from "../../../lib/session";

/*
 * POST /api/overlay/rotate — 오버레이 주소 재발급 (이전 주소는 즉시 무효)
 * - 권한: 치지직 로그인 세션의 계정(user_id)에 연결된 오버레이만. 오버레이 토큰(주소)으로는 재발급할 수 없다
 * - 로그인 안 함 401 / 이 계정의 오버레이가 없으면 404
 * 출력: { success, token, path } — 새 토큰 원문은 이 응답에서 한 번만
 */
export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, "manage", { sameOrigin: true });
  if (blocked) return blocked;

  const session = await getSession();
  if (!session) return overlayFailure("unauthorized");

  try {
    const token = await rotateOverlayTokenForUser(session.userId);
    if (!token) return overlayFailure("not_found");
    return overlayJson({ success: true, token, path: `/overlay/tft/${token}` });
  } catch (error) {
    console.error("오버레이 재발급 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    return overlayFailure("unavailable");
  }
}
