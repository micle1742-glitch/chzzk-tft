import { NextResponse } from "next/server";
import { fetchAccount, logRiotFailure, riotHeaders, riotLimiter, riotStatus } from "../../../lib/riot";
import { runTftMatches, stopReasonOf } from "../../../lib/tft-matches";

// 응답 타입은 화면 코드가 이 경로에서 가져다 쓴다 (정의는 lib/tft-matches.ts)
export type { TftMatchesResponse, TftTodayResponse } from "../../../lib/tft-matches";

/*
 * POST /api/tft/matches — TFT 시즌별 최근 랭크 20판 분석 / mode: "today" 오늘 랭크 순위
 * 입력: { nickname, tagline, season?, mode? }. /api/search와 독립적으로 동작한다
 * 이 파일은 입력 검증·Riot ID → PUUID·HTTP 응답만 맡고, 조회·캐시·제한기 처리는 lib/tft-matches.ts (runTftMatches)
 */

// 실패 응답 형식은 /api/search와 같다 ({ success: false, reason, message })
const FAILURES = {
  invalid: { status: 400, message: "게임 이름과 태그를 입력해주세요." },
  not_found: {
    status: 404,
    message: "입력한 Riot ID를 찾을 수 없습니다. 게임 이름과 태그를 확인해주세요.",
  },
  // 우리 서버의 Riot 요청 한도 대기 (Riot 429 쿨다운 포함) — 서버 오류(503)와 구분해 429 + Retry-After
  rate_limited: {
    status: 429,
    message: "요청이 많아 잠시 전적을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.",
  },
  unavailable: {
    status: 503,
    message: "현재 전적 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.",
  },
} as const;

function failure(reason: keyof typeof FAILURES) {
  const { status, message } = FAILURES[reason];
  const retryAfterSeconds = reason === "rate_limited" ? Math.max(1, Math.ceil(riotLimiter.cooldownRemainingMs() / 1000)) : undefined;
  return NextResponse.json(
    { success: false, reason, message, retryAfterSeconds },
    { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined }
  );
}

// 브라우저가 취소한 요청: 아무도 결과를 기다리지 않으므로 짧게 끝낸다 (499 = 클라이언트가 닫음)
function aborted() {
  return NextResponse.json({ success: false, reason: "aborted", message: "요청이 취소되었습니다." }, { status: 499 });
}

export async function POST(request: Request) {
  const body: { nickname?: unknown; tagline?: unknown; season?: unknown; mode?: unknown } = await request
    .json()
    .catch(() => ({}));
  const { nickname, tagline, season } = body;
  const todayMode = body.mode === "today";
  const requestedSet =
    season === undefined || season === null || season === "" ? null : Number(season);
  if (
    typeof nickname !== "string" ||
    typeof tagline !== "string" ||
    !nickname ||
    !tagline ||
    nickname.length > 100 ||
    tagline.length > 20 ||
    (requestedSet !== null && (!Number.isInteger(requestedSet) || requestedSet < 1 || requestedSet > 99))
  ) {
    return failure("invalid");
  }

  const maybeHeaders = riotHeaders();
  if (!maybeHeaders) {
    console.error("TFT 전적 분석 불가: 서버에 Riot API 키가 설정되지 않음");
    return failure("unavailable");
  }
  // runTftMatches 안의 중첩 함수에서도 null이 아닌 값으로 쓰도록 고정
  const headers: Record<string, string> = maybeHeaders;

  // 브라우저 연결이 끊기면(새 조회·시즌 변경으로 취소) 취소되는 신호
  const signal = request.signal;

  // 1. Riot ID → PUUID
  let puuid: string;
  try {
    puuid = (await fetchAccount(nickname, tagline, headers, signal)).puuid;
  } catch (error) {
    if (riotStatus(error) === 404) return failure("not_found");
    logRiotFailure("Account", error);
    const reason = stopReasonOf(error);
    if (reason === "aborted") return aborted();
    return failure(reason === "rate_limit" ? "rate_limited" : "unavailable");
  }

  const outcome = await runTftMatches({ puuid, todayMode, requestedSet, headers, signal });
  if (outcome.kind === "aborted") return aborted();
  if (outcome.kind === "failure") return failure(outcome.reason);
  return NextResponse.json(outcome.body);
}
