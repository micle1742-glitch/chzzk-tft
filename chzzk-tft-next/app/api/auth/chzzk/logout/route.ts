import { NextResponse } from "next/server";

// 로그아웃은 상태를 바꾸는 요청이라 GET이 아니라 POST로만 받는다
export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.delete("chzzk_channel_id");
  response.cookies.delete("chzzk_nickname");
  response.cookies.delete("chzzk_access_token");

  return response;
}
