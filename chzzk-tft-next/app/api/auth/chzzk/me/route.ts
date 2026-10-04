import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";

// 로그인 상태는 서버의 getSession() 결과만 기준으로 하고, 오래된 응답이 재사용되지 않게 한다
export async function GET() {
  const session = await getSession();

  // 응답 필드를 직접 고른다 (userId 같은 내부 값이 실수로 나가지 않게 ...session을 쓰지 않음)
  return NextResponse.json(
    session
      ? { loggedIn: true, channelId: session.channelId, nickname: session.nickname }
      : { loggedIn: false },
    { headers: { "Cache-Control": "no-store" } }
  );
}
