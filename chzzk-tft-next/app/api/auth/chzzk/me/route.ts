import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";

  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((cookie) => {
      const [key, ...value] = cookie.split("=");
      return [key, value.join("=")];
    })
  );

  const channelId = cookies.chzzk_channel_id;
  const nickname = cookies.chzzk_nickname;

  if (!channelId || !nickname) {
    return NextResponse.json({
      loggedIn: false,
    });
  }

  return NextResponse.json({
    loggedIn: true,
    channelId,
    nickname: decodeURIComponent(nickname),
  });
}