import { NextRequest, NextResponse } from "next/server";
import {
  LEGACY_SESSION_COOKIES,
  SESSION_COOKIE,
  deleteSession,
} from "../../../../lib/session";

// 로그아웃은 상태를 바꾸는 요청이라 GET이 아니라 POST로만 받는다
export async function POST(request: NextRequest) {
  // DB 세션 삭제 → 쿠키가 복사돼 있어도 더 이상 쓸 수 없다
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let dbDeleted = true;
  if (token) {
    try {
      await deleteSession(token);
    } catch (error) {
      dbDeleted = false;
      console.error("로그아웃 세션 삭제 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    }
  }

  // DB 삭제가 실패해도 브라우저 쿠키는 항상 지운다 (남은 DB 행은 expires_at에 만료됨)
  const response = NextResponse.json(
    { success: dbDeleted },
    { status: dbDeleted ? 200 : 500 }
  );
  response.cookies.delete(SESSION_COOKIE);
  for (const name of LEGACY_SESSION_COOKIES) response.cookies.delete(name);

  return response;
}
