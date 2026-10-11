"use client";

import { useEffect, useState } from "react";
// 타입만 가져온다 (서버 코드는 번들에 포함되지 않음)
import type { RankedEntry, SearchResponse } from "../../api/search/route";
import type { TftTodayResponse } from "../../api/tft/matches/route";
import OverlayCard, { type OverlayTheme, type OverlayToday } from "./OverlayCard";

/*
 * OBS 브라우저 소스용 TFT 티어 카드 (최소 버전) — 조회만 여기서, 카드 표시는 OverlayCard (설정 페이지 미리보기와 공용)
 * - 표시: Riot ID, 게임(TFT), 현재 티어·LP, 티어별 색
 * - 표시하지 않음: "VERIFIED"·인증 문구 (Riot ID 조회 정보일 뿐 소유권 인증이 아님), 승패·통계
 * - 배경은 투명 (방송 화면 위에 카드만 보이게)
 * - 오늘 랭크 순위: /api/tft/matches (mode "today") — 캐시·요청 제한기를 거친다
 * - 갱신: 열 때 한 번 + 3분마다 (이전 요청이 끝난 뒤 다음 예약 → 겹치지 않음). 갱신 실패 시 마지막 정상 값 유지
 */

// 3분: 한 판(약 30~40분) 사이에 여러 번 확인되면서, 새 판이 없으면 Riot 요청은 계정·ID 목록 몇 번뿐
export const OVERLAY_REFRESH_MS = 3 * 60 * 1000;

export type { OverlayTheme };

type State =
  | { status: "loading" }
  | { status: "ok"; gameName: string; tagLine: string; ranked: RankedEntry | null }
  | { status: "error"; message: string };

export default function TftOverlay({ name, tag, theme }: { name: string; tag: string; theme: OverlayTheme }) {
  const invalid = !name || !tag;
  const [state, setState] = useState<State>({ status: "loading" });
  const [today, setToday] = useState<OverlayToday>({ status: "loading" });

  useEffect(() => {
    if (invalid) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const post = (url: string, body: object) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

    // 실패하면 이미 보여 주던 정상 카드는 그대로 둔다 (처음 조회 실패일 때만 오류 표시)
    const tierError = (message: string) =>
      setState((prev) => (prev.status === "ok" ? prev : { status: "error", message }));

    async function loadTier() {
      try {
        const response = await post("/api/search", { nickname: name, tagline: tag });
        const data: SearchResponse | { success: false; message: string } = await response.json();
        if (!data.success) return tierError(data.message);
        if (data.tft.status === "error") return tierError("TFT 랭크 정보를 불러오지 못했습니다.");
        setState({ status: "ok", gameName: data.gameName ?? name, tagLine: data.tagLine ?? tag, ranked: data.tft.ranked });
      } catch {
        if (!controller.signal.aborted) tierError("티어 정보를 불러오지 못했습니다.");
      }
    }

    async function loadToday() {
      try {
        const response = await post("/api/tft/matches", { nickname: name, tagline: tag, mode: "today" });
        const data: TftTodayResponse | { success: false } = await response.json();
        if (!data.success) throw new Error("today");
        setToday({ status: "ok", placements: data.placements, complete: data.complete });
      } catch {
        if (!controller.signal.aborted) setToday((prev) => (prev.status === "ok" ? prev : { status: "error" }));
      }
    }

    async function cycle() {
      await Promise.all([loadTier(), loadToday()]);
      if (!stopped) timer = setTimeout(cycle, OVERLAY_REFRESH_MS);
    }

    // 첫 조회도 타이머로 시작: 개발 모드 Strict Mode의 이중 실행 때 첫 번째 예약은 정리 함수가 취소한다 → 요청 한 번
    timer = setTimeout(cycle, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [invalid, name, tag]);

  // 투명 배경은 page.tsx의 서버 <style>이 처리한다 (스크립트에 의존하지 않음)

  if (invalid) return <OverlayCard view={{ kind: "invalid" }} theme={theme} />;
  if (state.status === "loading") return <OverlayCard view={{ kind: "loading" }} theme={theme} />;
  if (state.status === "error") return <OverlayCard view={{ kind: "error", message: state.message }} theme={theme} />;
  return (
    <OverlayCard
      view={{ kind: "ok", gameName: state.gameName, tagLine: state.tagLine, ranked: state.ranked }}
      theme={theme}
      today={today}
    />
  );
}
