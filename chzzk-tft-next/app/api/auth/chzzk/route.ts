import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.CHZZK_CLIENT_ID;

  const redirectUri =
    "http://localhost:3000/api/auth/chzzk/callback";

  const state = "stream_game_profile_login";

  const authUrl =
    `https://chzzk.naver.com/account-interlock` +
    `?clientId=${clientId}` +
    `&redirectUri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  return NextResponse.redirect(authUrl);
}