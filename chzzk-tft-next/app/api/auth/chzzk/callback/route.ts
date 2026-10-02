import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("chzzk_oauth_state")?.value;

  // 실패·취소는 모두 로그인 페이지로 돌려보낸다 (사유는 정해진 코드만 전달, 세션은 발급하지 않음)
  const loginError = (reason: "cancelled" | "state" | "failed") => {
    const res = NextResponse.redirect(
      new URL(`/login?error=${reason}`, request.url)
    );
    res.cookies.delete("chzzk_oauth_state");
    return res;
  };

  // 치지직 동의 화면에서 취소했거나 인증 코드 없이 돌아온 경우
  if (searchParams.get("error") || !code) {
    return loginError("cancelled");
  }

  // state가 없거나 로그인 시작 때 저장한 값과 다르면 거부
  if (!state || !savedState || state !== savedState) {
    return loginError("state");
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

    const channelId = userResponse.data.content.channelId;
    const nickname = userResponse.data.content.nickname;

    // 사용자 정보가 없으면 세션을 발급하지 않는다
    if (!channelId || !nickname) {
      return loginError("failed");
    }

    // 인증 성공 → 항상 홈페이지(/)로 이동 (이전 방문 페이지나 returnUrl과 무관)
    const response = NextResponse.redirect(
      new URL("/", request.url)
    );

    // 한 번 쓴 state는 폐기
    response.cookies.delete("chzzk_oauth_state");

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

    return response;
  } catch (error: any) {
    console.log(
      "치지직 토큰 발급 오류:",
      error.response?.data || error.message
    );

    return loginError("failed");
  }
}