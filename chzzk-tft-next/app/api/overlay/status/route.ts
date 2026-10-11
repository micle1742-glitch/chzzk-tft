import type { NextRequest } from "next/server";
import { guardRequest, overlayFailure, overlayJson } from "../../../lib/overlay-http";
import {
  OVERLAY_MANAGE_COOKIE,
  claimOverlayForUser,
  findOverlayByUser,
  overlayManageCookieOptions,
} from "../../../lib/overlays";
import { getSession } from "../../../lib/session";

/*
 * POST /api/overlay/status — 로그인한 계정의 오버레이 상태 (설정 화면용, 읽기 전용 + 예전 오버레이 연결)
 * - 권한: 치지직 로그인 세션의 계정(user_id). 로그인 안 함 401
 * - 이 계정의 오버레이가 없고, 로그인 필수화 전에 이 브라우저에서 발급해 둔 관리 키 쿠키가 있으면
 *   그 오버레이(아직 주인 없는 것만)를 이 계정에 연결하고 쿠키를 지운다 → 이후에는 로그인으로만 관리
 * - 토큰·관리 키·PUUID·내부 id는 돌려주지 않는다 (토큰 원문은 DB에도 없음 → 주소가 필요하면 재발급)
 * 출력: { success, managed: false } 또는 { success, managed: true, gameName, tagLine, createdAt, rotatedAt, linked }
 */

export type OverlayStatusResponse =
  | { success: true; managed: false }
  | {
      success: true;
      managed: true;
      gameName: string;
      tagLine: string;
      createdAt: string;
      rotatedAt: string | null;
      // 이번 요청에서 예전(로그인 없이 발급한) 오버레이를 이 계정에 연결했는지
      linked: boolean;
    };

export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, "status", { sameOrigin: true });
  if (blocked) return blocked;

  const session = await getSession();
  if (!session) return overlayFailure("unauthorized");

  try {
    let row = await findOverlayByUser(session.userId);
    let linked = false;
    const legacyKey = request.cookies.get(OVERLAY_MANAGE_COOKIE)?.value;
    if (!row && legacyKey) {
      linked = await claimOverlayForUser(legacyKey, session.userId);
      if (linked) row = await findOverlayByUser(session.userId);
    }

    const body: OverlayStatusResponse = row
      ? {
          success: true,
          managed: true,
          gameName: row.game_name,
          tagLine: row.tag_line,
          createdAt: row.created_at,
          rotatedAt: row.rotated_at,
          linked,
        }
      : { success: true, managed: false };
    const response = overlayJson(body);
    // 연결했거나 쓸 수 없는 관리 키(없는·폐기된·다른 계정 것)는 지운다. 이 계정에 이미 오버레이가 있으면 건드리지 않는다
    if (legacyKey && (linked || !row)) {
      response.cookies.set(OVERLAY_MANAGE_COOKIE, "", { ...overlayManageCookieOptions, maxAge: 0 });
    }
    return response;
  } catch (error) {
    console.error("오버레이 상태 확인 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    return overlayFailure("unavailable");
  }
}
