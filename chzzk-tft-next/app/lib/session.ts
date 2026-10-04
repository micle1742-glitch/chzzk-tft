import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabase } from "./db";

// userId는 서버 내부용(DB 조회·권한 검사). API 응답에는 넣지 않는다.
export type Session = { userId: string; channelId: string; nickname: string };

/*
 * DB 세션 방식 (docs/sql/001_create_users_sessions.sql)
 * - 쿠키(tieron_session)에는 무작위 토큰 원문만, DB(sessions.id)에는 그 SHA-256 해시만 저장한다.
 * - 유효 여부는 DB의 expires_at으로 판단한다. 쿠키 maxAge는 브라우저 정리용 보조 장치일 뿐이다.
 */
export const SESSION_COOKIE = "tieron_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7일 (초)

// 예전 방식(서명 없는 쿠키)에서 쓰던 이름. 콜백·로그아웃에서 지우기만 한다
export const LEGACY_SESSION_COOKIES = [
  "chzzk_channel_id",
  "chzzk_nickname",
  "chzzk_access_token",
];

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// 새 세션을 DB에 저장하고 쿠키에 넣을 토큰 원문을 돌려준다
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  const { error } = await getSupabase()
    .from("sessions")
    .insert({ id: hashToken(token), user_id: userId, expires_at: expiresAt.toISOString() });
  // 토큰·해시는 로그·에러 메시지에 넣지 않는다
  if (error) throw new Error(`세션 저장 실패 (${error.code})`);

  return token;
}

export async function deleteSession(token: string): Promise<void> {
  const { error } = await getSupabase()
    .from("sessions")
    .delete()
    .eq("id", hashToken(token));
  if (error) throw new Error(`세션 삭제 실패 (${error.code})`);
}

/*
 * 로그인 상태를 판단하는 유일한 곳. 랜딩, /login, SiteNav, /api/auth/chzzk/me가 모두 이 함수를 쓴다.
 * - 한 요청 안에서 여러 번 불려도 DB는 한 번만 조회한다 (React cache)
 * - DB 오류는 로그만 남기고 "로그인 안 됨"으로 처리한다 → 오류가 나도 페이지가 깨지지 않고, 권한도 열리지 않는다
 * - 서버 컴포넌트에서는 쿠키를 지울 수 없어서, 만료·무효 쿠키는 null만 돌려주고 그대로 둔다
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { data, error } = await getSupabase()
      .from("sessions")
      .select("users(id, chzzk_id, display_name)")
      .eq("id", hashToken(token))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("세션 조회 오류:", error.code, error.message);
      return null;
    }

    // sessions → users는 다대일이라 객체 하나로 온다
    const user = data?.users as unknown as
      | { id: string; chzzk_id: string; display_name: string }
      | null
      | undefined;
    if (!user) return null;

    return { userId: user.id, channelId: user.chzzk_id, nickname: user.display_name };
  } catch (error) {
    console.error("세션 조회 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
    return null;
  }
});
