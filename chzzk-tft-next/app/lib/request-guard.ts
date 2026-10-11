/*
 * API 요청 보호 도구 (외부 의존 없음 — 서버 route에서 사용, 테스트: request-guard.test.mjs)
 * - createWindowCounter: 키(IP 등)별 고정 구간 횟수 제한. 서버 메모리라 Vercel 인스턴스끼리는 공유되지 않는다
 *   (riotLimiter와 같은 한계 — 공유가 필요하면 DB·Redis 등 별도 저장소)
 * - clientIp: 요청한 쪽 IP. Vercel은 x-forwarded-for를 자체 값으로 채운다. 로컬 개발에서는 조작 가능
 * - isSameOrigin: 상태를 바꾸는 POST가 우리 사이트 화면에서 온 것인지 (Origin 헤더 확인, 없으면 거부)
 */

export type WindowCounterResult = { ok: true } | { ok: false; retryAfterMs: number };
export type WindowCounter = { hit(key: string): WindowCounterResult };

export function createWindowCounter({
  limit,
  windowMs,
  maxKeys = 10_000,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  // 키가 너무 많이 쌓이면(무작위 IP 등) 지난 구간부터 지워 메모리를 지킨다
  maxKeys?: number;
  now?: () => number;
}): WindowCounter {
  const entries = new Map<string, { start: number; count: number }>();

  function prune(t: number) {
    for (const [key, e] of entries) if (t - e.start >= windowMs) entries.delete(key);
    // 아직 구간 안인 키만으로도 넘치면 오래된 것부터 지운다 (Map은 넣은 순서대로 돈다)
    for (const key of entries.keys()) {
      if (entries.size <= maxKeys) break;
      entries.delete(key);
    }
  }

  return {
    hit(key) {
      const t = now();
      const e = entries.get(key);
      if (!e || t - e.start >= windowMs) {
        // 새 구간은 맨 뒤로 (오래된 순서 유지)
        entries.delete(key);
        entries.set(key, { start: t, count: 1 });
        if (entries.size > maxKeys) prune(t);
        return { ok: true };
      }
      if (e.count < limit) {
        e.count++;
        return { ok: true };
      }
      return { ok: false, retryAfterMs: e.start + windowMs - t };
    },
  };
}

// 개발 서버가 모듈을 다시 불러와도 같은 카운터를 쓰도록 globalThis에 둔다 (riotLimiter와 같은 방식)
const globalForGuard = globalThis as typeof globalThis & { __tieronCounters?: Map<string, WindowCounter> };
export function sharedWindowCounter(name: string, options: { limit: number; windowMs: number }): WindowCounter {
  const all = (globalForGuard.__tieronCounters ??= new Map());
  let counter = all.get(name);
  if (!counter) {
    counter = createWindowCounter(options);
    all.set(name, counter);
  }
  return counter;
}

type HeaderSource = { get(name: string): string | null };

export function clientIp(headers: HeaderSource): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

// Origin의 호스트가 요청받은 호스트와 같으면 true. Origin이 없거나 형식이 틀리면 false
export function isSameOrigin(headers: HeaderSource): boolean {
  const origin = headers.get("origin");
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
