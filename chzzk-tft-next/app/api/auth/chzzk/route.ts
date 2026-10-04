import { NextRequest, NextResponse } from "next/server";

// 요청이 실제로 들어온 origin (예: https://tieron.vercel.app, http://localhost:3000)
function requestOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.CHZZK_CLIENT_ID;

  // 환경 변수가 없으면 clientId=undefined로 치지직에 보내지 않고 로그인 화면에 기존 실패 안내를 띄운다
  // (배포 환경에서는 Vercel 프로젝트 설정 → Environment Variables에 CHZZK_CLIENT_ID를 넣어야 한다)
  if (!clientId) {
    console.error("환경 변수 CHZZK_CLIENT_ID가 설정되지 않았습니다.");
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
  response.cookies.set("chzzk_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}