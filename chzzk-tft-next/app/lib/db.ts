import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * 서버 전용 Supabase 클라이언트. service_role 키는 RLS를 무시하는 관리자 키라서
 * 브라우저로 나가면 안 된다 → "server-only"로 클라이언트 컴포넌트에서 import하면 빌드 에러가 난다.
 * (환경 변수 이름에 NEXT_PUBLIC_을 붙이지 않는 것도 같은 이유)
 * TIERON은 Supabase Auth가 아니라 자체 세션을 쓰므로 Supabase의 세션 저장·토큰 갱신은 끈다.
 */

let client: SupabaseClient | null = null;

// 환경 변수가 없으면 어떤 변수가 빠졌는지 바로 알 수 있게 에러를 낸다 (값은 출력하지 않음)
function requireEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `환경 변수 ${name}이(가) 설정되지 않았습니다. .env.local을 확인하고 개발 서버를 재시작하세요.`
    );
  }
  return value;
}

// 처음 호출할 때 한 번만 만들고 재사용한다 (import만 해서는 환경 변수를 검사하지 않음)
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return client;
}
