import { cookies } from "next/headers";

export type Session = { channelId: string; nickname: string };

/*
 * 로그인 상태를 판단하는 유일한 곳. 랜딩, /login, /api/auth/chzzk/me가 모두 이 함수를 쓴다.
 * 지금은 OAuth 콜백이 발급한 HttpOnly 쿠키를 서버에서 읽는다.
 * (서명이 없는 쿠키라 위조할 수 있다 → 서버 세션/DB로 교체할 때 이 함수만 바꾸면 된다.)
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  // 쿠키 값은 Next가 이미 한 번 디코딩해서 돌려준다 (여기서 다시 디코딩하면 '%'가 들어간 닉네임이 깨진다)
  const channelId = store.get("chzzk_channel_id")?.value;
  const nickname = store.get("chzzk_nickname")?.value;
  if (!channelId || !nickname) return null;

  return { channelId, nickname };
}
