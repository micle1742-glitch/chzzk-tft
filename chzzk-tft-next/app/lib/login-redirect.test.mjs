// login-redirect.ts 단위 테스트 — 로그인 후 돌아갈 경로는 우리 사이트 안만
import { test } from "node:test";
import assert from "node:assert/strict";
import { loginPathFor, safeNextPath } from "./login-redirect.ts";

test("내부 경로는 그대로 (쿼리 포함)", () => {
  assert.equal(safeNextPath("/riot"), "/riot");
  assert.equal(safeNextPath("/riot/result?name=Hide%20on%20bush&tag=KR1"), "/riot/result?name=Hide%20on%20bush&tag=KR1");
  assert.equal(safeNextPath("/overlay/settings"), "/overlay/settings");
});

test("다른 사이트로 가는 값은 거부", () => {
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "\\\\evil.example", "javascript:alert(1)", "evil.example"]) {
    assert.equal(safeNextPath(bad), null, bad);
  }
  // 제어 문자·공백 원문은 거부 (헤더 분리 시도)
  assert.equal(safeNextPath("/a\r\nSet-Cookie:x"), null);
  assert.equal(safeNextPath("/a b"), null);
  assert.equal(safeNextPath("/\tevil"), null);
});

test("로그인·API 경로, 빈 값, 너무 긴 값, 문자열 아님은 거부", () => {
  for (const bad of ["/login", "/login?next=/riot", "/api/search", "/api/auth/chzzk", "", "/" + "a".repeat(600), null, undefined, 42, ["/riot"]]) {
    assert.equal(safeNextPath(bad), null, String(bad));
  }
});

test("경로 정규화: 점 경로는 사이트 안에서만 풀린다", () => {
  assert.equal(safeNextPath("/riot/../overlay/settings"), "/overlay/settings");
  assert.equal(safeNextPath("/../../etc"), "/etc"); // 사이트 밖으로 나가지 못함 (없는 페이지는 404)
});

test("로그인 화면 주소", () => {
  assert.equal(loginPathFor("/riot/result?name=a&tag=b"), "/login?next=%2Friot%2Fresult%3Fname%3Da%26tag%3Db");
  assert.equal(loginPathFor("//evil.example"), "/login");
});
