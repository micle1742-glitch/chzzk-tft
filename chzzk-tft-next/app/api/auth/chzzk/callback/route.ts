import axios from "axios";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  console.log("치지직 인증 코드:", code);
  console.log("State:", state);

  if (!code) {
    return NextResponse.json(
      { success: false, message: "인증 코드가 없습니다." },
      { status: 400 }
    );
  }

  try {
    const clientId = process.env.CHZZK_CLIENT_ID;
    const clientSecret = process.env.CHZZK_CLIENT_SECRET;

    const tokenResponse = await axios.post(
      "https://openapi.chzzk.naver.com/auth/v1/token",
      {
        grantType: "authorization_code",
        clientId,
        clientSecret,
        code,
        state,
      }
    );

    const accessToken = tokenResponse.data.content.accessToken;

    const userResponse = await axios.get(
      "https://openapi.chzzk.naver.com/open/v1/users/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("사용자 정보:", userResponse.data);

    const channelId = userResponse.data.content.channelId;
    const nickname = userResponse.data.content.nickname;

    // 홈페이지로 이동
    const response = NextResponse.redirect(
      new URL("/", request.url)
    );

    // 로그인 정보 저장
    response.cookies.set("chzzk_channel_id", channelId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("chzzk_nickname", nickname, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("chzzk_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.log(
      "치지직 토큰 발급 오류:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        success: false,
        message: "치지직 인증 실패",
      },
      { status: 500 }
    );
  }
}