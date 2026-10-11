/*
 * 로그인 후 돌아갈 경로 검사 (외부 의존 없음 — 서버 route·page에서 사용, 테스트: login-redirect.test.mjs)
 * - 우리 사이트 안의 경로("/riot/result?name=..")만 허용한다. 다른 도메인으로 보내는 열린 리다이렉트를 막는다
 *   거부: "//evil.com", "/\evil.com", "https://..", 제어 문자, 너무 긴 값, API·로그인 경로
 * - 틀린 값은 null → 호출하는 쪽에서 기본 경로(/home)로
 */

export const LOGIN_NEXT_COOKIE = "tieron_login_next";
const MAX_LENGTH = 512;

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_LENGTH) return null;
  // 경로는 "/" 하나로 시작해야 한다 ("//host", "/\host"는 브라우저가 다른 도메인으로 해석)
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  // 제어 문자·공백 (헤더 분리·주소 혼동 방지)
  if (/[\u0000- \u007f]/.test(value)) return null;
  // URL로 해석했을 때도 같은 사이트 안이어야 한다
  let url: URL;
  try {
    url = new URL(value, "http://tieron.local");
  } catch {
    return null;
  }
  if (url.origin !== "http://tieron.local") return null;
  // 로그인 화면·API로 되돌아가면 의미가 없거나 반복된다
  if (url.pathname === "/login" || url.pathname.startsWith("/api/")) return null;
  return url.pathname + url.search;
}

// 보호된 페이지 → 로그인 화면 주소 (/login?next=..)
export function loginPathFor(nextPath: string): string {
  const next = safeNextPath(nextPath);
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}
