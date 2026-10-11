// tft-today.ts 단위 테스트 — KST 날짜 경계, 시작 시각 계산, 최신순 정렬
import { test } from "node:test";
import assert from "node:assert/strict";
import { kstDayWindow, matchStartMs, todayPlacements } from "./tft-today.ts";

const KST = (iso) => Date.parse(iso + "+09:00"); // "2026-10-11T00:00:00" 같은 한국 시각 → epoch
const RANKED = 1100;
const m = (id, kstIso, placement, queueId = RANKED) => ({ matchId: id, queueId, startMs: KST(kstIso), placement });

test("KST 하루 범위: 한국 시각 00:00 ~ 다음 날 00:00", () => {
  const w = kstDayWindow(KST("2026-10-11T15:30:00"));
  assert.equal(w.start, KST("2026-10-11T00:00:00"));
  assert.equal(w.end, KST("2026-10-12T00:00:00"));
  // UTC로는 전날 15:00 ~ 당일 15:00
  assert.equal(new Date(w.start).toISOString(), "2026-10-10T15:00:00.000Z");
});

test("KST 자정 직전·직후: 날짜가 바뀌는 순간", () => {
  assert.equal(kstDayWindow(KST("2026-10-11T23:59:59")).start, KST("2026-10-11T00:00:00"));
  assert.equal(kstDayWindow(KST("2026-10-12T00:00:00")).start, KST("2026-10-12T00:00:00"));
  // UTC 날짜는 같아도(10-11 15:00Z 전후) KST 날짜는 다르다
  assert.equal(kstDayWindow(Date.parse("2026-10-11T14:59:59Z")).start, KST("2026-10-11T00:00:00"));
  assert.equal(kstDayWindow(Date.parse("2026-10-11T15:00:00Z")).start, KST("2026-10-12T00:00:00"));
});

test("오늘 판만, 최신이 왼쪽", () => {
  const w = kstDayWindow(KST("2026-10-11T20:00:00"));
  const list = [
    m("a", "2026-10-11T09:00:00", 8),
    m("b", "2026-10-11T19:10:00", 1),
    m("c", "2026-10-11T13:00:00", 3),
    m("d", "2026-10-11T18:00:00", 2),
  ];
  assert.deepEqual(todayPlacements(list, w, RANKED), [1, 2, 3, 8]);
});

test("날짜 경계: 어제 23:59 시작은 제외, 오늘 00:00 시작은 포함, 내일 00:00은 제외", () => {
  const w = kstDayWindow(KST("2026-10-11T12:00:00"));
  const list = [
    m("yesterday", "2026-10-10T23:59:59", 5),
    m("midnight", "2026-10-11T00:00:00", 4),
    m("lastSecond", "2026-10-11T23:59:59", 6),
    m("tomorrow", "2026-10-12T00:00:00", 7),
  ];
  assert.deepEqual(todayPlacements(list, w, RANKED), [6, 4]);
});

test("어제 시작해 오늘 끝난 판은 시작 시각 기준으로 제외", () => {
  const w = kstDayWindow(KST("2026-10-11T12:00:00"));
  const start = matchStartMs({ gameDatetime: KST("2026-10-11T00:20:00"), gameLengthSec: 1800 }); // 23:50 시작
  assert.deepEqual(todayPlacements([{ matchId: "x", queueId: RANKED, startMs: start, placement: 2 }], w, RANKED), []);
});

test("다른 큐·등수 없음·중복 매치는 제외", () => {
  const w = kstDayWindow(KST("2026-10-11T12:00:00"));
  const list = [
    m("normal", "2026-10-11T10:00:00", 1, 1090),
    m("noPlace", "2026-10-11T10:30:00", null),
    m("bad", "2026-10-11T10:40:00", 9),
    m("ok", "2026-10-11T11:00:00", 3),
    m("ok", "2026-10-11T11:00:00", 3),
  ];
  assert.deepEqual(todayPlacements(list, w, RANKED), [3]);
});

test("오늘 판이 없으면 빈 목록", () => {
  assert.deepEqual(todayPlacements([], kstDayWindow(Date.now()), RANKED), []);
});

test("20판을 넘어도 모두 최신순으로 (개수 제한 없음)", () => {
  const w = kstDayWindow(KST("2026-10-11T23:00:00"));
  const list = Array.from({ length: 30 }, (_, i) => m(`g${i}`, `2026-10-11T${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}:00`, (i % 8) + 1));
  const out = todayPlacements(list, w, RANKED);
  assert.equal(out.length, 30);
  assert.equal(out[0], (29 % 8) + 1); // 가장 늦게 시작한 판이 첫 번째
});

test("시작 시각: gameCreation 우선, 없으면 끝난 시각 − 게임 길이", () => {
  assert.equal(matchStartMs({ gameCreation: 1000, gameDatetime: 5000, gameLengthSec: 2 }), 1000);
  assert.equal(matchStartMs({ gameDatetime: 5000, gameLengthSec: 2 }), 3000);
  assert.equal(matchStartMs({ gameDatetime: 5000, gameLengthSec: null }), 5000);
  assert.equal(matchStartMs({ gameCreation: null, gameDatetime: 5000, gameLengthSec: 2.5 }), 2500);
});
