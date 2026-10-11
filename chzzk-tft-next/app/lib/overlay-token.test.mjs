// overlay-token-core.ts 단위 테스트 — 난수 형식, 해시, 형식 검사. 토큰 원문은 출력하지 않는다
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  createOverlaySecrets,
  generateManageKey,
  generateOverlayToken,
  hashOverlaySecret,
  isOverlaySecretFormat,
  isOverlaySecretHash,
  OVERLAY_SECRET_LENGTH,
} from "./overlay-token-core.ts";

test("토큰·관리 키: 32바이트 난수의 base64url 43자", () => {
  for (const make of [generateOverlayToken, generateManageKey]) {
    const value = make();
    assert.equal(value.length, OVERLAY_SECRET_LENGTH);
    assert.match(value, /^[A-Za-z0-9_-]{43}$/); // '+', '/', '=' 없음 → URL에 그대로 사용
    assert.equal(Buffer.from(value, "base64url").length, 32);
    assert.ok(isOverlaySecretFormat(value));
  }
});

test("매번 다른 값 (1000개 중복 없음)", () => {
  const seen = new Set();
  for (let i = 0; i < 1000; i++) seen.add(generateOverlayToken());
  assert.equal(seen.size, 1000);
});

test("해시: SHA-256 hex 64자, 같은 입력은 같은 해시", () => {
  const token = generateOverlayToken();
  const hash = hashOverlaySecret(token);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, createHash("sha256").update(token).digest("hex"));
  assert.equal(hashOverlaySecret(token), hash);
  assert.notEqual(hashOverlaySecret(generateOverlayToken()), hash);
  assert.ok(isOverlaySecretHash(hash));
  assert.ok(!hash.includes(token)); // 해시에 원문이 들어가지 않음
});

test("발급 묶음: 토큰과 관리 키는 서로 다른 난수, 해시가 각각 맞음", () => {
  const s = createOverlaySecrets();
  assert.notEqual(s.token, s.manageKey);
  assert.notEqual(s.tokenHash, s.manageKeyHash); // DB 제약 token_hash <> manage_key_hash
  assert.equal(s.tokenHash, hashOverlaySecret(s.token));
  assert.equal(s.manageKeyHash, hashOverlaySecret(s.manageKey));
  assert.ok(isOverlaySecretFormat(s.token) && isOverlaySecretFormat(s.manageKey));
});

test("형식 검사: 잘못된 값 거부", () => {
  const ok = generateOverlayToken();
  const bad = [
    undefined, null, 123, {}, "",
    ok.slice(0, 42), // 짧음
    ok + "A", // 김
    ok.slice(0, 42) + "+", // base64url이 아닌 문자
    ok.slice(0, 42) + "/",
    ok.slice(0, 41) + "==", // 패딩
    " " + ok.slice(1), // 공백
    ok.slice(0, 42) + ".", // 경로 문자
    "../" + ok.slice(3),
    hashOverlaySecret(ok), // 해시(64자)를 토큰 자리에 넣은 경우
  ];
  for (const value of bad) assert.equal(isOverlaySecretFormat(value), false);
});

test("형식 검사: 같은 바이트의 다른 표기(마지막 글자 남는 비트) 거부", () => {
  // 32바이트 → 마지막 글자는 4비트만 쓰므로 정상 값의 마지막 글자는 A,E,I,M,... 중 하나
  const zeros = Buffer.alloc(32).toString("base64url"); // "AAAA...A"
  assert.ok(isOverlaySecretFormat(zeros));
  assert.equal(isOverlaySecretFormat(zeros.slice(0, 42) + "B"), false); // 같은 바이트로 디코딩되지만 표기가 다름
});

test("해시 형식 검사", () => {
  assert.ok(isOverlaySecretHash("a".repeat(64)));
  for (const value of ["A".repeat(64), "a".repeat(63), "g".repeat(64), generateOverlayToken(), null]) {
    assert.equal(isOverlaySecretHash(value), false);
  }
});
