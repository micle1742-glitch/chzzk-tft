/*
 * Riot API 호출 속도 제한기 — 순수 로직 (외부 라이브러리 없음, 테스트: app/lib/riot-limiter.test.mjs)
 * 서버에서 쓰는 공용 인스턴스는 app/lib/riot.ts의 riotLimiter (서버 인스턴스 하나 안에서 모든 요청이 함께 쓴다)
 *
 * - 여러 시간 창(예: 1초 15회, 2분 80회)을 동시에 지킨다. 요청마다가 아니라 이 제한기를 쓰는 모든 호출의 합계로 센다
 * - 429를 받으면 Retry-After만큼 쿨다운: 그동안은 Riot을 부르지 않는다 (재시도 폭주 방지)
 * - 자리가 날 때까지 maxWaitMs 안이면 기다리고, 더 오래 걸리면 기다리지 않고 RiotRateLimitedError를 던진다
 *   → 분석은 그 자리에서 멈추고 캐시로 가능한 결과만 보여 준다
 * - AbortSignal로 기다리는 중에도 취소할 수 있다 (RiotAbortedError)
 */

export type RateWindow = { count: number; windowMs: number };

export type LimiterOptions = {
  windows: RateWindow[];
  maxWaitMs: number; // 이보다 오래 기다려야 하면 포기
  defaultCooldownMs: number; // 429에 Retry-After가 없을 때
  maxCooldownMs: number; // Retry-After가 비정상적으로 길 때 상한
  now?: () => number;
};

// 로컬 제한(쿨다운·한도)으로 Riot을 부르지 않았다 — 실제 Riot 오류가 아님
export class RiotRateLimitedError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super("Riot API 요청 한도 대기");
    this.name = "RiotRateLimitedError";
    this.retryAfterMs = retryAfterMs;
  }
}

// 호출한 쪽(브라우저 연결 종료 등)이 취소했다 — 실제 Riot 오류가 아님
export class RiotAbortedError extends Error {
  constructor() {
    super("요청 취소");
    this.name = "RiotAbortedError";
  }
}

export type RiotLimiter = {
  acquire: (signal?: AbortSignal) => Promise<void>;
  record: () => void;
  reportRateLimited: (retryAfterSeconds?: number | null) => void;
  cooldownRemainingMs: () => number;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new RiotAbortedError());
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new RiotAbortedError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function createRiotLimiter(options: LimiterOptions): RiotLimiter {
  const now = options.now ?? Date.now;
  const longest = Math.max(...options.windows.map((w) => w.windowMs));
  const sent: number[] = []; // 보낸 시각 (오래된 순)
  let cooldownUntil = 0;

  // 지금 보내려면 얼마나 기다려야 하는지
  function waitNeeded(t: number): number {
    while (sent.length > 0 && sent[0] <= t - longest) sent.shift();
    let wait = Math.max(0, cooldownUntil - t);
    for (const w of options.windows) {
      const inWindow = sent.filter((s) => s > t - w.windowMs);
      // 창 안에 이미 count개가 있으면, 그중 (끝에서 count번째) 기록이 창 밖으로 나갈 때까지
      if (inWindow.length >= w.count) {
        wait = Math.max(wait, inWindow[inWindow.length - w.count] + w.windowMs - t);
      }
    }
    return wait;
  }

  return {
    // 보낼 자리를 얻을 때까지 기다린다 (자리를 얻으면 바로 보낸 것으로 센다)
    async acquire(signal) {
      const deadline = now() + options.maxWaitMs;
      while (true) {
        if (signal?.aborted) throw new RiotAbortedError();
        const t = now();
        const wait = waitNeeded(t);
        if (wait <= 0) {
          sent.push(t);
          return;
        }
        if (t + wait > deadline) throw new RiotRateLimitedError(wait);
        await sleep(Math.max(1, wait), signal);
      }
    },
    // 기다리지 않고 보낸 호출도 합계에 넣는다 (기존 티어 조회처럼 막지 않을 호출용)
    record() {
      const t = now();
      waitNeeded(t);
      sent.push(t);
    },
    // Riot이 429를 줬을 때: Retry-After(초)만큼 모든 호출을 쉰다 (더 긴 쿨다운이 이미 있으면 유지)
    reportRateLimited(retryAfterSeconds) {
      const ms =
        typeof retryAfterSeconds === "number" && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? Math.min(retryAfterSeconds * 1000, options.maxCooldownMs)
          : options.defaultCooldownMs;
      cooldownUntil = Math.max(cooldownUntil, now() + ms);
    },
    cooldownRemainingMs() {
      return Math.max(0, cooldownUntil - now());
    },
  };
}

// 제한기를 거쳐 요청 한 번: 자리 얻기 → 실행 → 429면 쿨다운 기록 후 그대로 던진다 (재시도 없음)
// retryAfterOf(error): 429면 Retry-After 초(없으면 null), 429가 아니면 undefined
export async function limitedRequest<T>(
  limiter: RiotLimiter,
  run: () => Promise<T>,
  retryAfterOf: (error: unknown) => number | null | undefined,
  signal?: AbortSignal
): Promise<T> {
  await limiter.acquire(signal);
  try {
    return await run();
  } catch (error) {
    const retryAfter = retryAfterOf(error);
    if (retryAfter !== undefined) limiter.reportRateLimited(retryAfter);
    throw error;
  }
}
