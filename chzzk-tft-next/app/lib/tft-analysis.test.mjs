// tft-analysis.ts 단위 테스트 — Node 내장 테스트 러너 사용 (추가 설치 없음)
// 실행: npm.cmd run test   (Node 22.18+ / 24는 .ts를 그대로 import한다)
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeRankedGames, ANALYSIS_GAME_LIMIT, RANKED_TFT_QUEUE_ID } from "./tft-analysis.ts";

// 등수 배열(최신순) → 게임 목록. 앞쪽일수록 최근 게임
const fromPlacements = (placements, start = 1_700_000_000_000) =>
  placements.map((placement, i) => ({ matchId: `KR_${i}`, placement, gameDatetime: start - i * 60_000 }));

test("상수: 랭크 큐 1100, 최대 20판", () => {
  assert.equal(RANKED_TFT_QUEUE_ID, 1100);
  assert.equal(ANALYSIS_GAME_LIMIT, 20);
});

test("평균 등수·Top4·1등 비율·분포·최신순 등수", () => {
  // 1,2,3,4,5,6,7,8 → 평균 4.5, Top4 4/8 = 50%, 1등 1/8 = 12.5%
  const r = analyzeRankedGames(fromPlacements([1, 2, 3, 4, 5, 6, 7, 8]));
  assert.equal(r.games, 8);
  assert.equal(r.avgPlacement, 4.5);
  assert.equal(r.top4Rate, 50);
  assert.equal(r.firstRate, 12.5);
  assert.deepEqual(r.distribution, [1, 1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(r.recentPlacements, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("반올림: 평균은 소수 둘째 자리, 비율은 소수 첫째 자리", () => {
  // 1,1,2 → 평균 1.333.. → 1.33, Top4 100%, 1등 2/3 = 66.666..% → 66.7
  const r = analyzeRankedGames(fromPlacements([1, 1, 2]));
  assert.equal(r.avgPlacement, 1.33);
  assert.equal(r.top4Rate, 100);
  assert.equal(r.firstRate, 66.7);
  assert.deepEqual(r.distribution, [2, 1, 0, 0, 0, 0, 0, 0]);
});

test("입력 순서와 상관없이 최신순으로 정렬한다", () => {
  const games = [
    { matchId: "a", placement: 8, gameDatetime: 1000 },
    { matchId: "b", placement: 1, gameDatetime: 3000 },
    { matchId: "c", placement: 4, gameDatetime: 2000 },
  ];
  const r = analyzeRankedGames(games);
  assert.deepEqual(r.recentPlacements, [1, 4, 8]);
  assert.equal(r.latestGameAt, 3000);
  assert.equal(r.oldestGameAt, 1000);
});

test("20판 초과면 최신 20판만 분석한다", () => {
  // 최신 20판은 모두 1등, 그보다 오래된 5판은 8등 → 결과에 8등이 섞이면 안 된다
  const r = analyzeRankedGames(fromPlacements([...Array(20).fill(1), ...Array(5).fill(8)]));
  assert.equal(r.games, 20);
  assert.equal(r.avgPlacement, 1);
  assert.equal(r.distribution[7], 0);
  assert.equal(r.recentPlacements.length, 20);
});

test("20판 미만이면 실제 판 수만큼만 계산한다 (채우지 않음)", () => {
  const r = analyzeRankedGames(fromPlacements([2, 6, 3]));
  assert.equal(r.games, 3);
  assert.equal(r.avgPlacement, 3.67);
  assert.equal(r.top4Rate, 66.7);
  assert.equal(r.recentPlacements.length, 3);
});

test("판이 없으면 통계는 null, 분포는 0으로 8칸", () => {
  const r = analyzeRankedGames([]);
  assert.equal(r.games, 0);
  assert.equal(r.avgPlacement, null);
  assert.equal(r.top4Rate, null);
  assert.equal(r.firstRate, null);
  assert.deepEqual(r.distribution, [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(r.recentPlacements, []);
  assert.equal(r.latestGameAt, null);
});

test("잘못된 등수(0, 9, 소수, 숫자 아님)와 중복 매치는 제외한다", () => {
  const games = [
    { matchId: "ok1", placement: 3, gameDatetime: 5000 },
    { matchId: "bad0", placement: 0, gameDatetime: 4000 },
    { matchId: "bad9", placement: 9, gameDatetime: 3900 },
    { matchId: "badf", placement: 2.5, gameDatetime: 3800 },
    { matchId: "bads", placement: "1", gameDatetime: 3700 },
    { matchId: "ok1", placement: 3, gameDatetime: 5000 },
    { matchId: "ok2", placement: 5, gameDatetime: 1000 },
  ];
  const r = analyzeRankedGames(games);
  assert.equal(r.games, 2);
  assert.deepEqual(r.recentPlacements, [3, 5]);
  assert.equal(r.avgPlacement, 4);
});
