// riot-limiter.ts 단위 테스트 — 실제 Riot API를 부르지 않고 가짜 요청 함수로 동시 요청·429·취소를 검증한다
// 시간 창을 짧게(100ms 등) 잡아 실제 시간으로 빠르게 확인한다
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRiotLimiter, limitedRequest, RiotAbortedError, RiotRateLimitedError } from "./riot-limiter.ts";

const make = (o = {}) =>
  createRiotLimiter({
    windows: [{ count: 5, windowMs: 200 }],
    maxWaitMs: 1000,
    defaultCooldownMs: 300,
    maxCooldownMs: 2000,
    ...o,
  });

// 가짜 Riot: 호출 시각을 기록하고, status 429 오류를 낼 수 있다
function fakeRiot({ fail429After = Infinity, retryAfter = 1 } = {}) {
  const calls = [];
  const run = async () => {
    calls.push(Date.now());
    if (calls.length > fail429After) {
      const e = new Error("429");
      e.status = 429;
      e.retryAfter = retryAfter;
      throw e;
    }
    return "ok";
  };
  const retryAfterOf = (e) => (e && e.status === 429 ? e.retryAfter : undefined);
  return { calls, run, retryAfterOf };
}

// 어떤 길이 windowMs 창에서든 count개를 넘지 않았는지
function maxInWindow(times, windowMs) {
  let max = 0;
  for (const t of times) max = Math.max(max, times.filter((s) => s >= t && s < t + windowMs).length);
  return max;
}

test("한 창 안에서는 count개까지 바로, 그다음은 창이 지날 때까지 기다린다", async () => {
  const limiter = make();
  const riot = fakeRiot();
  const start = Date.now();
  for (let i = 0; i < 6; i++) await limitedRequest(limiter, riot.run, riot.retryAfterOf);
  assert.equal(riot.calls.length, 6);
  assert.ok(riot.calls[4] - start < 50, "처음 5개는 바로");
  assert.ok(riot.calls[5] - start >= 190, `6번째는 창(200ms) 뒤: ${riot.calls[5] - start}ms`);
});

test("동시 요청 여러 개도 합계로 제한된다 (요청별이 아니라 공용)", async () => {
  const limiter = make({ windows: [{ count: 5, windowMs: 200 }], maxWaitMs: 5000 });
  const riot = fakeRiot();
  // 분석 요청 3개가 동시에 각자 6번씩 호출
  const job = async () => {
    for (let i = 0; i < 6; i++) await limitedRequest(limiter, riot.run, riot.retryAfterOf);
  };
  await Promise.all([job(), job(), job()]);
  assert.equal(riot.calls.length, 18);
  // 실제 타이머 오차(수 ms)를 감안해 창을 약간 좁혀 검사
  assert.ok(maxInWindow(riot.calls, 190) <= 5, `어느 190ms 창에서도 5개 이하: ${maxInWindow(riot.calls, 190)}`);
});

test("두 창(짧은·긴)을 함께 지킨다", async () => {
  const limiter = make({ windows: [{ count: 3, windowMs: 100 }, { count: 4, windowMs: 400 }], maxWaitMs: 2000 });
  const riot = fakeRiot();
  for (let i = 0; i < 5; i++) await limitedRequest(limiter, riot.run, riot.retryAfterOf);
  assert.ok(riot.calls[4] - riot.calls[0] >= 390, `긴 창 때문에 5번째는 400ms 뒤: ${riot.calls[4] - riot.calls[0]}ms`);
});

test("429를 받으면 쿨다운: 그동안 다른 요청은 Riot을 부르지 않고 바로 RiotRateLimitedError", async () => {
  const limiter = make({ maxWaitMs: 100 });
  const riot = fakeRiot({ fail429After: 1, retryAfter: 1 }); // 두 번째 호출부터 429, Retry-After 1초
  await limitedRequest(limiter, riot.run, riot.retryAfterOf);
  await assert.rejects(limitedRequest(limiter, riot.run, riot.retryAfterOf), (e) => e.status === 429);
  assert.ok(limiter.cooldownRemainingMs() > 900, "Retry-After 1초만큼 쿨다운");
  // 쿨다운(1초) > maxWait(100ms) → 다른 요청 5개는 Riot을 부르지 않는다
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => limitedRequest(limiter, riot.run, riot.retryAfterOf))
  );
  assert.ok(results.every((r) => r.status === "rejected" && r.reason instanceof RiotRateLimitedError));
  assert.equal(riot.calls.length, 2, "429 뒤 추가 Riot 호출 없음 (재시도 폭주 없음)");
});

test("짧은 쿨다운(maxWait 이내)은 기다렸다가 보낸다", async () => {
  const limiter = make({ maxWaitMs: 1000 });
  limiter.reportRateLimited(0.2); // 200ms
  const riot = fakeRiot();
  const start = Date.now();
  await limitedRequest(limiter, riot.run, riot.retryAfterOf);
  assert.ok(riot.calls[0] - start >= 190, `쿨다운이 끝난 뒤 호출: ${riot.calls[0] - start}ms`);
});

test("Retry-After가 없으면 기본 쿨다운, 너무 길면 상한으로 자른다", () => {
  const a = make({ defaultCooldownMs: 300 });
  a.reportRateLimited(null);
  assert.ok(a.cooldownRemainingMs() > 250 && a.cooldownRemainingMs() <= 300);
  const b = make({ maxCooldownMs: 2000 });
  b.reportRateLimited(3600);
  assert.ok(b.cooldownRemainingMs() <= 2000);
});

test("취소: 이미 취소된 신호면 Riot을 부르지 않는다", async () => {
  const limiter = make();
  const riot = fakeRiot();
  const ac = new AbortController();
  ac.abort();
  await assert.rejects(limitedRequest(limiter, riot.run, riot.retryAfterOf, ac.signal), RiotAbortedError);
  assert.equal(riot.calls.length, 0);
});

test("취소: 자리를 기다리는 중에 취소되면 바로 멈추고 Riot을 부르지 않는다", async () => {
  const limiter = make({ windows: [{ count: 1, windowMs: 500 }] });
  const riot = fakeRiot();
  await limitedRequest(limiter, riot.run, riot.retryAfterOf); // 자리 소진
  const ac = new AbortController();
  const waiting = limitedRequest(limiter, riot.run, riot.retryAfterOf, ac.signal);
  setTimeout(() => ac.abort(), 50);
  const t = Date.now();
  await assert.rejects(waiting, RiotAbortedError);
  assert.ok(Date.now() - t < 300, "500ms를 다 기다리지 않음");
  assert.equal(riot.calls.length, 1);
});

test("취소·로컬 한도는 Riot 오류(429 등)와 다른 오류 종류다", async () => {
  const limiter = make({ maxWaitMs: 10 });
  limiter.reportRateLimited(1);
  const riot = fakeRiot();
  const err = await limitedRequest(limiter, riot.run, riot.retryAfterOf).catch((e) => e);
  assert.ok(err instanceof RiotRateLimitedError && !(err instanceof RiotAbortedError));
  assert.equal(err.status, undefined, "Riot 상태 코드가 없는 로컬 오류");
});

test("record(): 막지 않는 호출도 합계에 들어간다", async () => {
  const limiter = make({ windows: [{ count: 2, windowMs: 200 }] });
  limiter.record();
  limiter.record();
  const riot = fakeRiot();
  const t = Date.now();
  await limitedRequest(limiter, riot.run, riot.retryAfterOf);
  assert.ok(riot.calls[0] - t >= 190, "앞의 record 2개 때문에 기다림");
});
