/*
 * TFT "오늘 전적" — 순수 계산 함수 (서버·테스트에서 사용, 외부 의존 없음). 테스트: app/lib/tft-today.test.mjs
 * - 오늘 = 한국 시간(KST, UTC+9) 00:00 ~ 다음 날 00:00 직전
 * - 오늘 여부는 매치의 실제 시작 시각으로 판단한다 (조회 시각·배열 순서가 아님)
 *   Riot info.gameCreation = 시작 시각, info.game_datetime = 끝난 시각 (실제 응답으로 확인: 차이 ≈ game_length)
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DayWindow = { start: number; end: number }; // [start, end) 밀리초 epoch (UTC)

// now가 속한 KST 날짜의 00:00 ~ 다음 날 00:00 (UTC 밀리초로)
export function kstDayWindow(now: number): DayWindow {
  const kstDayStart = Math.floor((now + KST_OFFSET_MS) / DAY_MS) * DAY_MS;
  const start = kstDayStart - KST_OFFSET_MS;
  return { start, end: start + DAY_MS };
}

// 매치 시작 시각: gameCreation이 있으면 그대로, 없으면(DB 캐시) 끝난 시각 − 게임 길이, 그것도 없으면 끝난 시각
export function matchStartMs(m: { gameCreation?: number | null; gameDatetime: number; gameLengthSec?: number | null }): number {
  if (typeof m.gameCreation === "number" && Number.isFinite(m.gameCreation) && m.gameCreation > 0) return m.gameCreation;
  if (typeof m.gameLengthSec === "number" && Number.isFinite(m.gameLengthSec) && m.gameLengthSec > 0) {
    return m.gameDatetime - Math.round(m.gameLengthSec * 1000);
  }
  return m.gameDatetime;
}

export type TodayCandidate = {
  matchId: string;
  queueId: number;
  startMs: number;
  placement: number | null; // 이 계정의 최종 등수 (없으면 제외)
};

const isPlacement = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 8;

// 오늘(window) 시작한 매치 중 큐가 맞는 판의 등수, 최신(시작 시각이 늦은) 판이 앞
export function todayPlacements(matches: TodayCandidate[], window: DayWindow, queueId: number): number[] {
  const seen = new Set<string>();
  return matches
    .filter((m) => m.queueId === queueId && isPlacement(m.placement))
    .filter((m) => m.startMs >= window.start && m.startMs < window.end)
    .filter((m) => (seen.has(m.matchId) ? false : (seen.add(m.matchId), true)))
    .sort((a, b) => b.startMs - a.startMs)
    .map((m) => m.placement as number);
}
