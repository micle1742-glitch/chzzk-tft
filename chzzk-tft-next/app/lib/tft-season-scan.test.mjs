// tft-season-scan.ts 단위 테스트 — 가짜 매치 목록으로 세트 구간 탐색을 검증한다
import { test } from "node:test";
import assert from "node:assert/strict";
import { findSeasonSegments, segmentForSet } from "./tft-season-scan.ts";

// 매치 목록(최신순) → probe. { ranked, set } 배열, 몇 번 상세를 봤는지 센다
function fakeProbe(matches, window = 8, failAt = new Set()) {
  let calls = 0;
  const probe = async (i) => {
    for (let j = i; j < Math.min(i + window, matches.length); j++) {
      calls++;
      if (failAt.has(j)) return "unknown";
      if (matches[j].ranked) return { index: j, set: matches[j].set };
    }
    return "none";
  };
  return { probe, calls: () => calls };
}
const R = (set) => ({ ranked: true, set });
const N = (set) => ({ ranked: false, set });

test("한 세트만 있으면 구간 하나, 끝까지", async () => {
  const m = Array(50).fill(R(18));
  const { segments, complete } = await findSeasonSegments(m.length, fakeProbe(m).probe);
  assert.equal(complete, true);
  assert.deepEqual(segments, [{ set: 18, start: 0, end: 50 }]);
});

test("세 세트 경계를 정확히 찾는다", async () => {
  const m = [...Array(120).fill(R(18)), ...Array(100).fill(R(17)), ...Array(80).fill(R(16))];
  const f = fakeProbe(m);
  const { segments, complete } = await findSeasonSegments(m.length, f.probe);
  assert.equal(complete, true);
  assert.deepEqual(segments, [
    { set: 18, start: 0, end: 120 },
    { set: 17, start: 120, end: 220 },
    { set: 16, start: 220, end: 300 },
  ]);
  // 300판을 전부 보지 않는다 (이진 탐색)
  assert.ok(f.calls() < 40, `상세 확인 ${f.calls()}회`);
});

test("일반 게임이 섞여 있어도 랭크 매치 기준으로 경계를 찾는다", async () => {
  const m = [];
  for (let i = 0; i < 60; i++) m.push(i % 3 === 0 ? N(18) : R(18));
  for (let i = 0; i < 60; i++) m.push(i % 4 === 0 ? N(17) : R(17));
  const { segments } = await findSeasonSegments(m.length, fakeProbe(m).probe);
  assert.deepEqual(segments.map((s) => s.set), [18, 17]);
  // 경계는 마지막 18 랭크(59) 이후, 첫 17 랭크(61) 이전
  assert.ok(segments[0].end >= 60 && segments[0].end <= 61, `경계 ${segments[0].end}`);
});

test("랭크가 없으면 구간 없음", async () => {
  const m = Array(30).fill(N(18));
  const { segments, complete } = await findSeasonSegments(m.length, fakeProbe(m).probe);
  assert.equal(complete, true);
  assert.deepEqual(segments, []);
});

test("앞쪽이 일반 게임뿐이어도 뒤의 랭크 세트를 찾는다", async () => {
  const m = [...Array(20).fill(N(18)), ...Array(30).fill(R(13))];
  const { segments } = await findSeasonSegments(m.length, fakeProbe(m).probe);
  assert.deepEqual(segments.map((s) => s.set), [13]);
});

test("빈 목록", async () => {
  const { segments, complete } = await findSeasonSegments(0, fakeProbe([]).probe);
  assert.equal(complete, true);
  assert.deepEqual(segments, []);
});

test("상세를 못 받으면(unknown) 확인한 구간까지만, complete=false", async () => {
  const m = [...Array(100).fill(R(18)), ...Array(100).fill(R(17))];
  const { segments, complete } = await findSeasonSegments(m.length, fakeProbe(m, 8, new Set([100])).probe);
  assert.equal(complete, false);
  assert.equal(segments[0].set, 18);
});

test("segmentForSet: 같은 세트 구간을 합치고, 없으면 null", () => {
  const segs = [
    { set: 18, start: 0, end: 10 },
    { set: 17, start: 10, end: 20 },
    { set: 18, start: 20, end: 25 },
  ];
  assert.deepEqual(segmentForSet(segs, 18), { set: 18, start: 0, end: 25 });
  assert.equal(segmentForSet(segs, 12), null);
});

test("stopAfterSet: 선택한 세트 구간을 찾으면 멈추고, resume으로 이어서 끝까지 찾는다", async () => {
  const m = [...Array(100).fill(R(18)), ...Array(100).fill(R(17)), ...Array(100).fill(R(16))];
  const f = fakeProbe(m);
  const first = await findSeasonSegments(m.length, f.probe, 8, { stopAfterSet: 18 });
  assert.deepEqual(first.segments.map((s) => s.set), [18]);
  assert.equal(first.cursor, 100);
  const callsAfterFirst = f.calls();
  const rest = await findSeasonSegments(m.length, f.probe, 8, { resume: first });
  assert.deepEqual(rest.segments.map((s) => s.set), [18, 17, 16]);
  assert.equal(rest.cursor, null);
  assert.equal(rest.complete, true);
  assert.ok(callsAfterFirst < f.calls());
});

test("stopAfterSet: 선택한 세트가 기록보다 최신이면(그 시즌 기록 없음) 첫 구간 뒤 멈춘다", async () => {
  const m = [...Array(40).fill(R(13)), ...Array(40).fill(R(12))];
  const first = await findSeasonSegments(m.length, fakeProbe(m).probe, 8, { stopAfterSet: 18 });
  assert.deepEqual(first.segments.map((s) => s.set), [13]);
  assert.equal(first.cursor, 40);
});

test("resume: 끝까지 탐색한 결과는 그대로 돌려준다", async () => {
  const m = Array(20).fill(R(18));
  const f = fakeProbe(m);
  const full = await findSeasonSegments(m.length, f.probe);
  const again = await findSeasonSegments(m.length, f.probe, 8, { resume: full });
  assert.deepEqual(again, full);
});
