import "server-only";
import { RIOT_ASIA, RiotAbortedError, RiotRateLimitedError, logRiotFailure, riotGet } from "./riot";
import { RANKED_TFT_QUEUE_ID } from "./tft-analysis";

/*
 * TFT 현재 시즌(세트 번호) — 하드코딩하지 않고 Riot 데이터로 판단한다
 * - KR 챌린저(판 수가 많은 순) 최대 3명의 최근 매치 중 랭크(1100) 매치의 info.tft_set_number
 * - 개인 계정의 최신 매치는 쓰지 않는다 (오래 쉰 계정은 지난 세트가 최신이라 틀린다)
 * - 결과는 서버 메모리에 6시간 캐시 (실패하면 10분 뒤 다시 시도). 서버리스 인스턴스가 새로 뜨면 다시 확인한다
 * - 요청 한도를 아끼려고 오류가 한 번 나면 그 자리에서 멈춘다 (429 재시도 없음)
 * - 서버 공용 제한기(riotGet)를 거친다. 한도 대기로 못 불렀으면 실패를 캐시하지 않고 다음 요청에서 다시 확인한다
 */

const CACHE_MS = 6 * 60 * 60 * 1000;
const FAILURE_CACHE_MS = 10 * 60 * 1000;
const PLAYERS = 3;
const MATCHES_PER_PLAYER = 5;

let memo: { set: number | null; at: number } | null = null;

type LeagueList = { entries?: { puuid?: string; wins?: number; losses?: number }[] };
type MatchInfo = { info?: { queue_id?: number; tft_set_number?: number } };

export async function getCurrentTftSet(headers: Record<string, string>): Promise<number | null> {
  const now = Date.now();
  if (memo && now - memo.at < (memo.set === null ? FAILURE_CACHE_MS : CACHE_MS)) return memo.set;

  let set: number | null = null;
  try {
    const data = await riotGet<LeagueList>("https://kr.api.riotgames.com/tft/league/v1/challenger", headers, {
      params: { queue: "RANKED_TFT" },
    });
    const players = (data.entries ?? [])
      .filter((e) => typeof e.puuid === "string")
      .sort((a, b) => (b.wins ?? 0) + (b.losses ?? 0) - ((a.wins ?? 0) + (a.losses ?? 0)))
      .slice(0, PLAYERS);

    search: for (const player of players) {
      const ids = await riotGet<string[]>(`${RIOT_ASIA}/tft/match/v1/matches/by-puuid/${player.puuid}/ids`, headers, {
        params: { start: 0, count: MATCHES_PER_PLAYER },
      });
      for (const id of Array.isArray(ids) ? ids : []) {
        const match = await riotGet<MatchInfo>(`${RIOT_ASIA}/tft/match/v1/matches/${encodeURIComponent(id)}`, headers);
        const info = match.info;
        if (info?.queue_id === RANKED_TFT_QUEUE_ID && Number.isInteger(info.tft_set_number)) {
          set = info.tft_set_number as number;
          break search;
        }
      }
    }
  } catch (error) {
    logRiotFailure("TFT 현재 시즌 확인", error);
    // 로컬 한도 대기·취소로 부르지 못한 경우는 실패로 캐시하지 않는다 (잠깐 뒤 다른 요청이 다시 확인)
    if (error instanceof RiotRateLimitedError || error instanceof RiotAbortedError) return memo?.set ?? null;
  }

  memo = { set, at: now };
  return set;
}
