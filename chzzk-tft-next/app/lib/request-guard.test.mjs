// request-guard.ts 단위 테스트 — 횟수 제한, IP, 같은 출처 확인
import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp, createWindowCounter, isSameOrigin } from "./request-guard.ts";

const headers = (obj) => ({ get: (name) => obj[name] ?? null });

test("횟수 제한: 구간 안에서 limit번까지 허용, 넘으면 남은 시간과 함께 거부", () => {
  let t = 0;
  const c = createWindowCounter({ limit: 3, windowMs: 1000, now: () => t });
  assert.ok(c.hit("a").ok && c.hit("a").ok && c.hit("a").ok);
  t = 400;
  assert.deepEqual(c.hit("a"), { ok: false, retryAfterMs: 600 });
  assert.ok(c.hit("b").ok); // 다른 키는 따로 센다
  t = 1000; // 구간이 지나면 다시 허용
  assert.ok(c.hit("a").ok);
});

test("횟수 제한: 키가 너무 많으면 지난·오래된 키부터 지워 상한 유지", () => {
  let t = 0;
  const c = createWindowCounter({ limit: 1, windowMs: 1000, maxKeys: 3, now: () => t });
  for (const k of ["a", "b", "c", "d"]) assert.ok(c.hit(k).ok);
  // 가장 오래된 a가 지워져 다시 허용된다 (메모리 보호가 제한보다 우선)
  assert.ok(c.hit("a").ok);
  // 최근 키 d는 남아 있어 거부
  assert.equal(c.hit("d").ok, false);
});

test("IP: x-forwarded-for 첫 값, 없으면 x-real-ip, 없으면 unknown", () => {
  assert.equal(clientIp(headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(clientIp(headers({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(clientIp(headers({})), "unknown");
});

test("같은 출처: Origin 호스트 = 요청 호스트일 때만", () => {
  assert.ok(isSameOrigin(headers({ origin: "http://localhost:3000", host: "localhost:3000" })));
  assert.ok(isSameOrigin(headers({ origin: "https://tieron.app", host: "internal", "x-forwarded-host": "tieron.app" })));
  assert.equal(isSameOrigin(headers({ origin: "https://evil.example", host: "tieron.app" })), false);
  assert.equal(isSameOrigin(headers({ host: "tieron.app" })), false); // Origin 없음
  assert.equal(isSameOrigin(headers({ origin: "null", host: "tieron.app" })), false); // 형식 오류
  assert.equal(isSameOrigin(headers({ origin: "https://tieron.app.evil.example", host: "tieron.app" })), false);
});
