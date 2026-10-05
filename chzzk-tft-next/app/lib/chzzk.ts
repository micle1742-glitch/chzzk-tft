import "server-only";
import type { NextRequest } from "next/server";

/*
 * 치지직 OAuth 앱 선택 (로그인 시작·콜백이 같은 규칙을 쓴다)
 * - localhost / 127.0.0.1로 들어온 요청 → 로컬 개발용 앱: CHZZK_LOCAL_CLIENT_ID / CHZZK_LOCAL_CLIENT_SECRET
 * - 그 밖(Vercel 배포 도메인) → 운영 앱: CHZZK_CLIENT_ID / CHZZK_CLIENT_SECRET
 * 치지직 앱마다 등록된 Redirect URI가 달라서, 요청 주소에 맞는 앱을 써야 로그인이 된다.
 * 로컬 값이 없을 때 운영 앱으로 대신 쓰지 않는다 (운영 앱에는 localhost 주소가 없어 실패하므로 원인만 가려진다).
 */

// 요청이 실제로 들어온 origin (예: https://chzzk-tft.vercel.app, http://localhost:3000)
// Vercel은 프록시 뒤라 실제 도메인·프로토콜을 x-forwarded-* 헤더로 넘겨주므로 그 값을 먼저 쓴다.
export function requestOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

function isLocalRequest(request: NextRequest): boolean {
  const hostname = new URL(requestOrigin(request)).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

type ChzzkCredentials = {
  clientId: string | undefined;
  clientSecret: string | undefined;
  // 값이 없을 때 서버 로그에 안내할 환경 변수 이름 (값은 절대 출력하지 않음)
  idName: string;
  secretName: string;
};

export function chzzkCredentials(request: NextRequest): ChzzkCredentials {
  if (isLocalRequest(request)) {
    return {
      clientId: process.env.CHZZK_LOCAL_CLIENT_ID,
      clientSecret: process.env.CHZZK_LOCAL_CLIENT_SECRET,
      idName: "CHZZK_LOCAL_CLIENT_ID",
      secretName: "CHZZK_LOCAL_CLIENT_SECRET",
    };
  }
  return {
    clientId: process.env.CHZZK_CLIENT_ID,
    clientSecret: process.env.CHZZK_CLIENT_SECRET,
    idName: "CHZZK_CLIENT_ID",
    secretName: "CHZZK_CLIENT_SECRET",
  };
}
