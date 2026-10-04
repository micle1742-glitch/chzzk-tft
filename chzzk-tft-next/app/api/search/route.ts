import axios from "axios";
import { NextResponse } from "next/server";

// Riot 리그 API(TFT league-v1, LoL league-v4) 응답 배열의 항목. 두 게임이 같은 필드를 쓴다
type LeagueEntry = {
  queueType: string;
  tier?: string;
  rank?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
};

// 카드에 쓰는 필드만 골라 내보낸다 (puuid 등은 제외)
export type RankedEntry = LeagueEntry;

// ok: 조회 성공 (ranked가 null이면 일반 랭크 기록 없음) / error: 그 게임만 조회 실패
export type GameResult =
  | { status: "ok"; ranked: RankedEntry | null }
  | { status: "error" };

export type SearchResponse = {
  success: true;
  nickname: string;
  gameName: string;
  tagLine: string;
  tier: LeagueEntry[] | null;
  tft: GameResult;
  lol: GameResult;
};

// 일반 랭크 큐. 여러 큐가 순서 없이 섞여 오므로 배열 첫 항목이 아니라 queueType으로 고른다
const TFT_RANKED_QUEUE = "RANKED_TFT";
const LOL_RANKED_QUEUE = "RANKED_SOLO_5x5";

function toGameResult(
  result: PromiseSettledResult<{ data: LeagueEntry[] }>,
  queueType: string,
  label: string
): GameResult {
  if (result.status === "rejected") {
    const reason = result.reason;
    console.error(
      `${label} 리그 조회 에러:`,
      axios.isAxiosError(reason) ? reason.response?.status ?? reason.message : "알 수 없는 오류"
    );
    return { status: "error" };
  }

  const entries = Array.isArray(result.value.data) ? result.value.data : [];
  const entry = entries.find((e) => e.queueType === queueType);
  if (!entry) return { status: "ok", ranked: null };

  const { tier, rank, leaguePoints, wins, losses } = entry;
  return { status: "ok", ranked: { queueType, tier, rank, leaguePoints, wins, losses } };
}

export async function POST(request: Request) {
  try {
    const body: { nickname?: unknown; tagline?: unknown } = await request.json();

    const nickname = body.nickname;
    const tagline = body.tagline;

    if (typeof nickname !== "string" || typeof tagline !== "string" || !nickname || !tagline) {
      return NextResponse.json(
        {
          success: false,
          message: "닉네임과 태그를 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.RIOT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Riot API Key가 없습니다.",
        },
        { status: 500 }
      );
    }

    // 1. Riot ID → PUUID 조회
    const accountResponse = await axios.get<{ puuid: string; gameName: string; tagLine: string }>(
      `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(nickname)}/${encodeURIComponent(tagline)}`,
      {
        headers: {
          "X-Riot-Token": apiKey,
        },
      }
    );

    const puuid = accountResponse.data.puuid;
    const headers = { "X-Riot-Token": apiKey };

    // 2. 같은 PUUID로 TFT·LoL 리그 정보를 동시에 조회
    //    한쪽이 실패해도 다른 쪽 결과는 돌려준다 (Riot ID 자체가 없을 때의 실패는 위 1번에서 기존대로 처리)
    const [tftResult, lolResult] = await Promise.allSettled([
      axios.get<LeagueEntry[]>(
        `https://kr.api.riotgames.com/tft/league/v1/by-puuid/${puuid}`,
        { headers }
      ),
      axios.get<LeagueEntry[]>(
        `https://kr.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`,
        { headers }
      ),
    ]);

    // gameName·tagLine: Account API가 돌려준 공식 표기 (입력값과 대소문자 등이 다를 수 있음)
    // tier: 기존 호환용 TFT 큐별 배열 그대로 (TFT 조회 실패 시 null)
    // tft·lol: 게임별 결과. 일반 랭크만 골라 ranked에 넣고, 기록이 없으면 null
    const response: SearchResponse = {
      success: true,
      nickname,
      gameName: accountResponse.data.gameName,
      tagLine: accountResponse.data.tagLine,
      tier: tftResult.status === "fulfilled" ? tftResult.value.data : null,
      tft: toGameResult(tftResult, TFT_RANKED_QUEUE, "TFT"),
      lol: toGameResult(lolResult, LOL_RANKED_QUEUE, "LoL"),
    };
    return NextResponse.json(response);
  } catch (error) {
    // 응답 본문(오류 사유)만 남긴다. 요청 헤더의 API 키는 출력하지 않음
    console.error(
      "Riot API 조회 에러:",
      axios.isAxiosError(error)
        ? error.response?.data ?? error.message
        : error instanceof Error
          ? error.message
          : "알 수 없는 오류"
    );

    return NextResponse.json(
      {
        success: false,
        message: "조회 실패",
      },
      { status: 500 }
    );
  }
}