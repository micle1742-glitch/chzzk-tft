import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";

// 로그인 상태는 서버의 getSession() 결과만 기준으로 하고, 오래된 응답이 재사용되지 않게 한다
export async function GET() {
  const session = await getSession();

  return NextResponse.json(
    session ? { loggedIn: true, ...session } : { loggedIn: false },
    { headers: { "Cache-Control": "no-store" } }
  );
}
