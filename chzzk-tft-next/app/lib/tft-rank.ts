import { riotGet } from "./riot";

/*
 * PUUID로 TFT 일반 랭크(RANKED_TFT) 조회 — 오버레이 토큰 조회(/api/overlay/data)용
 * - /api/search와 같은 Riot API(tft-league-v1 by-puuid)와 같은 필드. Riot ID → PUUID 조회가 필요 없다
 * - 공용 제한기를 거친다 (riotGet). 실패하면 오류를 그대로 던진다
 */

const RIOT_KR = "https://kr.api.riotgames.com";
const TFT_RANKED_QUEUE = "RANKED_TFT";

// /api/search의 RankedEntry와 같은 모양 (OverlayCard가 그대로 받는다)
export type TftRankedEntry = {
  queueType: string;
  tier?: string;
  rank?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
};

// 랭크 기록이 없으면 null
export async function fetchTftRanked(
  puuid: string,
  headers: Record<string, string>,
  signal?: AbortSignal
): Promise<TftRankedEntry | null> {
  const data = await riotGet<TftRankedEntry[]>(
    `${RIOT_KR}/tft/league/v1/by-puuid/${encodeURIComponent(puuid)}`,
    headers,
    { signal }
  );
  const entry = Array.isArray(data) ? data.find((e) => e?.queueType === TFT_RANKED_QUEUE) : undefined;
  if (!entry) return null;
  const { tier, rank, leaguePoints, wins, losses } = entry;
  return { queueType: TFT_RANKED_QUEUE, tier, rank, leaguePoints, wins, losses };
}
