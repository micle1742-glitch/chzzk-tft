/*
 * TFT 최근 랭크 매치 통계 (순수 계산 함수 — 서버·클라이언트·테스트 어디서든 import 가능, 외부 의존 없음)
 * 규칙 (docs/HANDOFF.md 5번 "전적 분석 영역"):
 * - Riot TFT-MATCH-V1이 판마다 준 실제 등수(placement)만으로 계산한다
 * - 판 수가 limit보다 적으면 있는 만큼만 계산하고 실제 판 수(games)를 돌려준다. 없는 값을 채우지 않는다
 * - 자체 점수·MMR·등급은 만들지 않는다
 * 테스트: app/lib/tft-analysis.test.mjs (npm.cmd run test)
 */

// 랭크 TFT 큐 (Riot queues.json "Ranked Teamfight Tactics games" + 실제 응답으로 확인, 일반은 1090)
export const RANKED_TFT_QUEUE_ID = 1100;
// 분석할 최대 판 수
export const ANALYSIS_GAME_LIMIT = 20;

export type RankedGame = {
  matchId: string;
  placement: number; // 1~8
  gameDatetime: number; // 게임 시각 (밀리초 epoch, Riot info.game_datetime)
};

export type TftAnalysis = {
  games: number; // 실제로 분석한 판 수 (0~limit)
  avgPlacement: number | null; // 평균 등수, 소수 둘째 자리 (판이 없으면 null)
  top4Rate: number | null; // 4등 이내 비율 %, 소수 첫째 자리
  firstRate: number | null; // 1등 비율 %, 소수 첫째 자리
  distribution: number[]; // [1등 횟수, 2등 횟수, ..., 8등 횟수] (항상 8칸)
  recentPlacements: number[]; // 등수, 최신순
  oldestGameAt: number | null; // 분석 범위의 가장 오래된 게임 시각
  latestGameAt: number | null; // 분석 범위의 가장 최근 게임 시각
};

const round = (value: number, digits: number) => {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
};

// 등수가 1~8 정수가 아닌 값은 Riot 응답 이상으로 보고 제외한다 (추정해서 넣지 않음)
const isValidPlacement = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 8;

export function analyzeRankedGames(games: RankedGame[], limit = ANALYSIS_GAME_LIMIT): TftAnalysis {
  // 같은 매치가 두 번 들어와도 한 번만, 최신순으로 limit판
  const seen = new Set<string>();
  const picked = games
    .filter((g) => isValidPlacement(g.placement) && Number.isFinite(g.gameDatetime))
    .filter((g) => (seen.has(g.matchId) ? false : (seen.add(g.matchId), true)))
    .sort((a, b) => b.gameDatetime - a.gameDatetime)
    .slice(0, Math.max(0, limit));

  const distribution = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const g of picked) distribution[g.placement - 1] += 1;

  const n = picked.length;
  if (n === 0) {
    return {
      games: 0,
      avgPlacement: null,
      top4Rate: null,
      firstRate: null,
      distribution,
      recentPlacements: [],
      oldestGameAt: null,
      latestGameAt: null,
    };
  }

  const sum = picked.reduce((acc, g) => acc + g.placement, 0);
  const top4 = picked.filter((g) => g.placement <= 4).length;

  return {
    games: n,
    avgPlacement: round(sum / n, 2),
    top4Rate: round((top4 / n) * 100, 1),
    firstRate: round((distribution[0] / n) * 100, 1),
    distribution,
    recentPlacements: picked.map((g) => g.placement),
    oldestGameAt: picked[n - 1].gameDatetime,
    latestGameAt: picked[0].gameDatetime,
  };
}
