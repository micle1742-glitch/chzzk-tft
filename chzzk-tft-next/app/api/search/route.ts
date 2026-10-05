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

// Riot API 한 번 호출의 최대 대기 시간. 넘기면 "일시적으로 조회 불가"로 처리
const RIOT_TIMEOUT_MS = 8000;

// 조회 실패 응답. 기존 형태 { success: false, message }를 유지하고 구분값 reason만 덧붙인다.
// 키 값·환경 변수 이름·Riot 원본 오류 내용은 응답에 넣지 않는다
const FAILURES = {
  // Riot Account API 404 (Data not found): 해당 Riot ID의 계정이 없음
  not_found: {
    status: 404,
    message: "입력한 Riot ID를 찾을 수 없습니다. 게임 이름과 태그를 확인해주세요.",
  },
  // 키 만료·거부(401/403), 요청 한도(429), Riot 장애(5xx), 시간 초과·네트워크 오류, 서버 키 미설정
  unavailable: {
    status: 503,
    message: "현재 Riot 게임 정보를 조회할 수 없습니다. 잠시 후 다시 시도해주세요.",
  },
} as const;

export type SearchFailureReason = keyof typeof FAILURES;

function failure(reason: SearchFailureReason) {
  const { status, message } = FAILURES[reason];
  return NextResponse.json({ success: false, reason, message }, { status });
}

// 서버 로그: 어느 API에서 몇 번 상태로 실패했는지만. 요청 헤더(API 키)나 응답 본문 전체는 남기지 않는다
function logRiotFailure(api: string, error: unknown) {
  if (!axios.isAxiosError(error)) {
    console.error(`Riot ${api} API 오류:`, error instanceof Error ? error.message : "알 수 없는 오류");
    return;
  }
  const status = error.response?.status;
  const hint =
    status === 401 || status === 403
      ? " (API 키 만료·오류 가능성 — 키 재발급 후 환경 변수 교체 필요)"
      : status === 429
        ? ` (요청 한도 초과, Retry-After: ${error.response?.headers?.["retry-after"] ?? "-"}초)`
        : "";
  console.error(`Riot ${api} API 실패: ${status ?? error.code ?? "응답 없음"}${hint}`);
}

// 일반 랭크 큐. 여러 큐가 순서 없이 섞여 오므로 배열 첫 항목이 아니라 queueType으로 고른다
const TFT_RANKED_QUEUE = "RANKED_TFT";
const LOL_RANKED_QUEUE = "RANKED_SOLO_5x5";

function toGameResult(
  result: PromiseSettledResult<{ data: LeagueEntry[] }>,
  queueType: string,
  label: string
): GameResult {
  if (result.status === "rejected") {
    // 그 게임 카드만 "조회 실패"로 표시되고 다른 게임 결과는 그대로 보여 준다 (기존 동작)
    logRiotFailure(`${label} League`, result.reason);
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
    // 본문이 JSON이 아니면 Riot 장애가 아니라 잘못된 요청이므로 아래 입력 검증(400)으로 보낸다
    const body: { nickname?: unknown; tagline?: unknown } = await request.json().catch(() => ({}));

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

    // 키가 없으면 사용자에게는 서버 설정을 드러내지 않고 "일시적으로 조회 불가"로만 안내한다
    if (!apiKey) {
      console.error("Riot API 조회 불가: 서버에 Riot API 키가 설정되지 않음");
      return failure("unavailable");
    }

    const headers = { "X-Riot-Token": apiKey };

    // 1. Riot ID → PUUID 조회
    const accountResponse = await axios.get<{ puuid: string; gameName: string; tagLine: string }>(
      `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(nickname)}/${encodeURIComponent(tagline)}`,
      { headers, timeout: RIOT_TIMEOUT_MS }
    );

    const puuid = accountResponse.data.puuid;

    // 2. 같은 PUUID로 TFT·LoL 리그 정보를 동시에 조회
    //    한쪽이 실패해도 다른 쪽 결과는 돌려준다 (Riot ID 자체가 없을 때의 실패는 위 1번에서 기존대로 처리)
    const [tftResult, lolResult] = await Promise.allSettled([
      axios.get<LeagueEntry[]>(
        `https://kr.api.riotgames.com/tft/league/v1/by-puuid/${puuid}`,
        { headers, timeout: RIOT_TIMEOUT_MS }
      ),
      axios.get<LeagueEntry[]>(
        `https://kr.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`,
        { headers, timeout: RIOT_TIMEOUT_MS }
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
    // Account API(Riot ID → PUUID) 단계의 실패. Riot 응답 상태 코드로만 구분한다
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      // 404: Riot이 "Data not found"로 응답 → 입력한 Riot ID에 해당하는 계정이 없음
      if (status === 404) {
        return failure("not_found");
      }

      // 그 밖(401·403 키 만료/거부, 429 요청 한도, 5xx Riot 장애, 시간 초과·네트워크 오류)은
      // 사용자에게 같은 "일시적으로 조회 불가"로 안내하고, 원인은 서버 로그에만 남긴다
      logRiotFailure("Account", error);
      return failure("unavailable");
    }

    console.error(
      "Riot 조회 처리 오류:",
      error instanceof Error ? error.message : "알 수 없는 오류"
    );
    return failure("unavailable");
  }
}