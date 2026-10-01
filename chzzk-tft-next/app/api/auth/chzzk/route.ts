import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.CHZZK_CLIENT_ID;

  const redirectUri =
    "http://localhost:3000/api/auth/chzzk/callback";

  const state = crypto.randomUUID();

  const authUrl =
    `https://chzzk.naver.com/account-interlock` +
    `?clientId=${clientId}` +
    `&redirectUri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  const response = NextResponse.redirect(authUrl);

  // 콜백에서 비교할 수 있도록 같은 값을 브라우저 쿠키에 10분간 보관
  response.cookies.set("chzzk_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}