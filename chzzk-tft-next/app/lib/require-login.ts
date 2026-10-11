import "server-only";
import { redirect } from "next/navigation";
import { loginPathFor } from "./login-redirect";
import { getSession, type Session } from "./session";

/*
 * 로그인이 필요한 페이지(서버 컴포넌트)에서 부른다. 세션이 없거나 만료됐으면 /login?next=<지금 경로>로 보낸다
 * - 판단은 기존 getSession() 하나 (DB 세션 확인, 요청당 한 번만 조회 — SiteNav와 공유)
 * - nextPath: 로그인 후 돌아올 경로 (쿼리 포함). 우리 사이트 안의 경로만 쓰인다 (login-redirect.ts)
 */
export async function requireLogin(nextPath: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(loginPathFor(nextPath));
  return session;
}

// searchParams 객체 → "?a=1&b=2" (배열 값은 모두, undefined는 제외)
export function queryString(params: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") q.append(key, value);
    else if (Array.isArray(value)) for (const v of value) q.append(key, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
