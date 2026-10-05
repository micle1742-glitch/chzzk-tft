import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { chzzkCredentials } from "../../../../lib/chzzk";
import { getSupabase } from "../../../../lib/db";
import {
  LEGACY_SESSION_COOKIES,
  SESSION_COOKIE,
  createSession,
  deleteSession,
  sessionCookieOptions,
} from "../../../../lib/session";

// 예전 방식(서명 없는) 로그인 쿠키는 성공·실패와 상관없이 지운다
function clearLegacyCookies(response: NextResponse) {
  for (const name of LEGACY_SESSION_COOKIES) response.cookies.delete(name);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("chzzk_oauth_state")?.value;

  // 실패·취소는 모두 로그인 페이지로 돌려보낸다 (사유는 정해진 코드만 전달, 세션은 발급하지 않음)
  // 기존 tieron_session은 건드리지 않는다: 누군가 ?error= 링크를 열게 해서 강제로 로그아웃시키지 못하게
  const loginError = (reason: "cancelled" | "state" | "failed") => {
    const res = NextResponse.redirect(
      new URL(`/login?error=${reason}`, request.url)
    );
    res.cookies.delete("chzzk_oauth_state");
    clearLegacyCookies(res);
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
    // 로그인 시작 때와 같은 앱: localhost면 CHZZK_LOCAL_*, 배포 도메인이면 CHZZK_* (app/lib/chzzk.ts)
    const { clientId, clientSecret, idName, secretName } = chzzkCredentials(request);
    if (!clientId || !clientSecret) {
      console.error(`환경 변수 ${!clientId ? idName : secretName}가 설정되지 않았습니다.`);
      return loginError("failed");
    }

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

    // users 자동 가입: chzzk_id로 찾아 있으면 이름·마지막 로그인만 갱신, 없으면 새로 만든다
    const { data: user, error: userError } = await getSupabase()
      .from("users")
      .upsert(
        {
          chzzk_id: channelId,
          display_name: nickname,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: "chzzk_id" }
      )
      .select("id")
      .single();
    if (userError || !user) {
      throw new Error(`사용자 저장 실패 (${userError?.code ?? "no row"})`);
    }

    // 로그인할 때마다 새 세션 발급 (세션 고정 방지). 새 세션이 저장된 뒤에 이전 세션을 지운다
    const token = await createSession(user.id);
    const oldToken = request.cookies.get(SESSION_COOKIE)?.value;
    if (oldToken) {
      await deleteSession(oldToken).catch(() => {
        // 이전 세션 삭제 실패는 로그인 자체를 막지 않는다 (어차피 expires_at에 만료됨)
      });
    }

    // 인증 성공 → 항상 로그인 사용자 홈(/home)으로 이동 (이전 방문 페이지나 returnUrl과 무관)
    const response = NextResponse.redirect(
      new URL("/home", request.url)
    );

    // 한 번 쓴 state는 폐기
    response.cookies.delete("chzzk_oauth_state");
    clearLegacyCookies(response);

    // 쿠키에는 토큰 원문만 (DB에는 해시)
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);

    return response;
  } catch (error) {
    // 치지직 응답 본문이나 에러 메시지만 남긴다 (요청 설정에 든 clientSecret·토큰은 출력하지 않음)
    console.error(
      "치지직 로그인 처리 오류:",
      axios.isAxiosError(error)
        ? error.response?.data ?? error.message
        : error instanceof Error
          ? error.message
          : "알 수 없는 오류"
    );

    return loginError("failed");
  }
}