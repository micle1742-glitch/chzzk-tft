import "server-only";
import { NextResponse } from "next/server";
import { clientIp, isSameOrigin, sharedWindowCounter } from "./request-guard";

/*
 * /api/overlay/* 공용 응답·요청 검사
 * - 실패 응답 형식은 다른 API와 같다: { success: false, reason, message }
 * - 모든 응답은 캐시하지 않는다 (토큰·개인 조회 결과가 브라우저·CDN 캐시에 남지 않게)
 * - 없는 토큰과 폐기된 토큰은 같은 not_found(404) — 어느 쪽인지 구분할 수 없게
 */

const FAILURES = {
  invalid: { status: 400, message: "요청 형식이 올바르지 않습니다." },
  unauthorized: { status: 401, message: "로그인이 필요합니다. 다시 로그인해 주세요." },
  forbidden: { status: 403, message: "허용되지 않은 요청입니다." },
  not_found: { status: 404, message: "오버레이를 찾을 수 없습니다. 주소를 다시 발급해 주세요." },
  account_not_found: {
    status: 404,
    message: "입력한 Riot ID를 찾을 수 없습니다. 게임 이름과 태그를 확인해주세요.",
  },
  already_issued: {
    status: 409,
    message: "이미 발급한 오버레이 주소가 있습니다. 재발급하거나 삭제한 뒤 다시 발급해 주세요.",
  },
  too_many: { status: 429, message: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
  unavailable: { status: 503, message: "지금은 처리할 수 없습니다. 잠시 후 다시 시도해주세요." },
} as const;

export type OverlayFailure = keyof typeof FAILURES;

const NO_STORE = { "Cache-Control": "no-store" };

export function overlayJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export function overlayFailure(reason: OverlayFailure, retryAfterMs?: number) {
  const { status, message } = FAILURES[reason];
  const retryAfterSeconds = retryAfterMs !== undefined ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : undefined;
  return NextResponse.json(
    { success: false, reason, message, retryAfterSeconds },
    {
      status,
      headers: retryAfterSeconds ? { ...NO_STORE, "Retry-After": String(retryAfterSeconds) } : NO_STORE,
    }
  );
}

// IP별 횟수 제한 (서버 메모리 — 인스턴스끼리 공유 안 됨). 이름별로 카운터가 따로 있다
const LIMITS = {
  issue: { limit: 5, windowMs: 10 * 60 * 1000 }, // 발급: 10분에 5번
  manage: { limit: 10, windowMs: 10 * 60 * 1000 }, // 재발급·삭제: 10분에 10번
  status: { limit: 30, windowMs: 60 * 1000 }, // 관리 상태 확인(설정 화면을 열 때): 1분에 30번
  data: { limit: 30, windowMs: 60 * 1000 }, // 오버레이 조회: 1분에 30번 (화면은 3분마다 1번)
} as const;

// 통과하면 null, 막히면 보낼 응답
export function guardRequest(
  request: Request,
  kind: keyof typeof LIMITS,
  { sameOrigin }: { sameOrigin: boolean }
): NextResponse | null {
  // 상태를 바꾸는 요청은 우리 사이트 화면에서 온 것만 (다른 사이트가 브라우저 쿠키로 보내는 요청 차단)
  if (sameOrigin && !isSameOrigin(request.headers)) return overlayFailure("forbidden");
  const hit = sharedWindowCounter(`overlay-${kind}`, LIMITS[kind]).hit(clientIp(request.headers));
  if (!hit.ok) return overlayFailure("too_many", hit.retryAfterMs);
  return null;
}
