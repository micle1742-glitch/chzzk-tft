import "server-only";
import axios, { type AxiosRequestConfig } from "axios";
import {
  RiotAbortedError,
  RiotRateLimitedError,
  createRiotLimiter,
  limitedRequest,
  type RiotLimiter,
} from "./riot-limiter";

export { RiotAbortedError, RiotRateLimitedError };

/*
 * 서버 전용 Riot API 공통 함수 (전적 분석 api/tft/matches에서 사용)
 * - RIOT_API_KEY는 서버에서만 읽어 X-Riot-Token 헤더로 보낸다. 응답·로그에 키를 넣지 않는다
 * - 로그에는 API 이름과 상태 코드만 남긴다 (PUUID·Riot ID·응답 본문 미출력)
 * - api/search/route.ts에도 같은 처리가 있지만 기존 동작을 바꾸지 않으려고 그대로 두었다 (나중에 이 파일로 합칠 수 있음)
 */

// Riot API 한 번 호출의 최대 대기 시간 (api/search와 같은 값)
export const RIOT_TIMEOUT_MS = 8000;

// KR 계정의 Account·TFT Match API 라우팅 (League API는 kr 플랫폼)
export const RIOT_ASIA = "https://asia.api.riotgames.com";

/*
 * 서버 공용 Riot 호출 제한기 (서버 인스턴스 하나 안의 모든 요청이 함께 쓴다)
 * - 개발용 키 한도(초당 20회, 2분 100회)보다 여유 있게: 초당 15회, 2분 80회
 *   Production 키를 받으면 한도가 커지므로 이 숫자만 올리면 된다
 * - 429면 Retry-After만큼 쿨다운. 4초 넘게 기다려야 하면 기다리지 않고 포기 → 분석은 캐시로 가능한 결과만
 * - Vercel처럼 인스턴스가 여러 개면 인스턴스마다 따로 센다 (인스턴스 간 공유는 별도 저장소가 필요)
 * - 개발 중 모듈이 다시 로드돼도 같은 제한기를 쓰도록 globalThis에 둔다
 */
const globalForRiot = globalThis as typeof globalThis & { __tieronRiotLimiter?: RiotLimiter };
export const riotLimiter: RiotLimiter =
  globalForRiot.__tieronRiotLimiter ??
  (globalForRiot.__tieronRiotLimiter = createRiotLimiter({
    windows: [
      { count: 15, windowMs: 1_000 },
      { count: 80, windowMs: 120_000 },
    ],
    maxWaitMs: 4_000,
    defaultCooldownMs: 5_000,
    maxCooldownMs: 120_000,
  }));

// axios 오류가 429면 Retry-After(초, 없으면 null), 아니면 undefined
export function retryAfterOf(error: unknown): number | null | undefined {
  if (!axios.isAxiosError(error) || error.response?.status !== 429) return undefined;
  const value = Number(error.response.headers?.["retry-after"]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

// 제한기를 거친 Riot GET. 취소는 RiotAbortedError, 로컬 한도는 RiotRateLimitedError, 그 밖은 axios 오류 그대로
export async function riotGet<T>(
  url: string,
  headers: Record<string, string>,
  options: { params?: AxiosRequestConfig["params"]; signal?: AbortSignal } = {}
): Promise<T> {
  try {
    const { data } = await limitedRequest(
      riotLimiter,
      () => axios.get<T>(url, { headers, timeout: RIOT_TIMEOUT_MS, params: options.params, signal: options.signal }),
      retryAfterOf,
      options.signal
    );
    return data;
  } catch (error) {
    if (axios.isCancel(error)) throw new RiotAbortedError();
    throw error;
  }
}

// 키가 없으면 null → 호출하는 쪽에서 "일시적으로 조회 불가"로 처리
export function riotHeaders(): Record<string, string> | null {
  const apiKey = process.env.RIOT_API_KEY;
  return apiKey ? { "X-Riot-Token": apiKey } : null;
}

// Riot 응답 상태 코드 (응답이 없으면 undefined)
export function riotStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function logRiotFailure(api: string, error: unknown) {
  // 취소·로컬 한도 대기는 Riot이 실패한 것이 아니므로 Riot 오류로 기록하지 않는다
  if (error instanceof RiotAbortedError) return;
  if (error instanceof RiotRateLimitedError) {
    console.warn(`Riot ${api} API 호출 보류: 요청 한도 대기 (${Math.ceil(error.retryAfterMs / 1000)}초)`);
    return;
  }
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

export type RiotAccount = { puuid: string; gameName: string; tagLine: string };

// Riot ID → PUUID (account-v1). 실패하면 riotGet의 오류를 그대로 던진다 (404 = 계정 없음)
export async function fetchAccount(
  gameName: string,
  tagLine: string,
  headers: Record<string, string>,
  signal?: AbortSignal
): Promise<RiotAccount> {
  return riotGet<RiotAccount>(
    `${RIOT_ASIA}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    headers,
    { signal }
  );
}
