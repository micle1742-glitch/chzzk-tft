import type { NextRequest } from "next/server";
import { guardRequest, overlayFailure, overlayJson } from "../../../lib/overlay-http";
import { OVERLAY_MANAGE_COOKIE, findOverlayByManageKey } from "../../../lib/overlays";

/*
 * POST /api/overlay/status — 이 브라우저가 관리 중인 오버레이가 있는지 (설정 화면용, 읽기 전용)
 * - 관리 키 쿠키는 HttpOnly + /api/overlay 경로 전용이라 화면 코드가 직접 읽을 수 없어서 서버가 대신 확인한다
 * - 토큰·관리 키·PUUID·내부 id는 돌려주지 않는다 (토큰 원문은 DB에도 없음 → 주소가 필요하면 재발급)
 * 출력: { success, managed: false } 또는 { success, managed: true, gameName, tagLine, createdAt, rotatedAt }
 */

export type OverlayStatusResponse =
  | { success: true; managed: false }
  | { success: true; managed: true; gameName: string; tagLine: string; createdAt: string; rotatedAt: string | null };

export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, "status", { sameOrigin: true });
  if (blocked) return blocked;

  try {
    const row = await findOverlayByManageKey(request.cookies.get(OVERLAY_MANAGE_COOKIE)?.value);
    const body: OverlayStatusResponse = row
      ? {
          success: true,
          managed: true,
          gameName: row.game_name,
          tagLine: row.tag_line,
          createdAt: row.created_at,
          rotatedAt: row.rotated_at,
        }
      : { success: true, managed: false };
    return overlayJson(body);
  } catch (error) {
    console.error("오버레이 상태 확인 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    return overlayFailure("unavailable");
  }
}
