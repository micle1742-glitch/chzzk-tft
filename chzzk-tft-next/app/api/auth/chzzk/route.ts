import { NextRequest, NextResponse } from "next/server";
import { chzzkCredentials, requestOrigin } from "../../../lib/chzzk";
import { LOGIN_NEXT_COOKIE, safeNextPath } from "../../../lib/login-redirect";

export async function GET(request: NextRequest) {
  // localhost면 로컬 개발용 앱(CHZZK_LOCAL_*), 배포 도메인이면 운영 앱(CHZZK_*) — app/lib/chzzk.ts
  const { clientId, idName } = chzzkCredentials(request);

  // 환경 변수가 없으면 clientId=undefined로 치지직에 보내지 않고 로그인 화면에 기존 실패 안내를 띄운다
  // (로컬은 .env.local, 배포는 Vercel 프로젝트 설정 → Environment Variables)
  if (!clientId) {
    console.error(`환경 변수 ${idName}가 설정되지 않았습니다.`);
    return NextResponse.redirect(new URL("/login?error=failed", request.url));
  }

  // 콜백 주소는 지금 요청이 들어온 주소(origin) 기준: 로컬은 http://localhost:3000, Vercel은 배포 도메인.
  // Vercel은 프록시 뒤라 실제 도메인·프로토콜을 x-forwarded-* 헤더로 넘겨주므로 그 값을 먼저 쓴다.
  // 헤더를 조작해도 치지직이 개발자 콘솔에 등록된 Redirect URI와 다르면 거부하므로, 각 환경 주소를 모두 등록해 둔다.
  const redirectUri = new URL("/api/auth/chzzk/callback", requestOrigin(request)).toString();

  const state = crypto.randomUUID();

  const authUrl =
    `https://chzzk.naver.com/account-interlock` +
    `?clientId=${encodeURIComponent(clientId)}` +
    `&redirectUri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  const response = NextResponse.redirect(authUrl);

  // 콜백에서 비교할 수 있도록 같은 값을 브라우저 쿠키에 10분간 보관
  const tempCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
  response.cookies.set("chzzk_oauth_state", state, tempCookie);

  // 로그인 후 돌아갈 경로(?next=): 우리 사이트 안의 경로만 같은 기간 보관, 없거나 틀리면 이전 값도 지운다 (콜백이 다시 검사)
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (next) response.cookies.set(LOGIN_NEXT_COOKIE, next, tempCookie);
  else response.cookies.delete(LOGIN_NEXT_COOKIE);

  return response;
}