"use client";

import { useEffect, useState } from "react";
// 타입만 가져온다 (서버 코드는 번들에 포함되지 않음)
import type { OverlayDataResponse } from "../../api/overlay/data/route";
import OverlayCard, { type OverlayTheme, type OverlayToday } from "./OverlayCard";
import { OVERLAY_REFRESH_MS } from "./TftOverlay";

/*
 * 비밀 주소 오버레이 (/overlay/tft/[token]) — 조회만 여기서, 카드 표시는 기존 OverlayCard
 * - /api/overlay/data 한 번으로 티어와 오늘 순위를 함께 받는다 (Riot ID가 주소·요청에 없음)
 * - 열 때 한 번 + 3분마다. 이전 요청이 끝난 뒤 다음을 예약 → 겹치지 않음
 * - 일시적인 실패: 마지막 정상 값 유지 (처음부터 실패면 짧은 오류 안내만)
 * - 404(재발급·삭제된 주소): 이전 값을 지우고 안내만 남긴 뒤 갱신을 멈춘다 — 무효화된 주소가 계속 보이면 안 되므로
 * - 토큰은 요청 본문으로만 보내고 화면·콘솔에 출력하지 않는다
 */

type State =
  | { status: "loading" }
  | { status: "ok"; gameName: string; tagLine: string; tft: OverlayDataResponse["tft"] }
  | { status: "error" }
  | { status: "gone" };

export default function TokenOverlay({ token, theme }: { token: string; theme: OverlayTheme }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [today, setToday] = useState<OverlayToday>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    // 계속 갱신할지 돌려준다 (주소가 무효면 false)
    async function load(): Promise<boolean> {
      try {
        const response = await fetch("/api/overlay/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 404) {
          setState({ status: "gone" });
          return false;
        }
        const data: OverlayDataResponse | { success: false } = await response.json();
        if (!response.ok || !data.success) throw new Error("overlay");

        // 티어만 실패했으면 이전에 받은 티어를 그대로 둔다
        setState((prev) =>
          data.tft.status === "error" && prev.status === "ok"
            ? { ...prev, gameName: data.gameName, tagLine: data.tagLine }
            : { status: "ok", gameName: data.gameName, tagLine: data.tagLine, tft: data.tft }
        );
        const todayData = data.today;
        setToday((prev) =>
          todayData
            ? { status: "ok", placements: todayData.placements, complete: todayData.complete }
            : prev.status === "ok"
              ? prev
              : { status: "error" }
        );
      } catch {
        if (controller.signal.aborted) return false;
        setState((prev) => (prev.status === "ok" ? prev : { status: "error" }));
        setToday((prev) => (prev.status === "ok" ? prev : { status: "error" }));
      }
      return true;
    }

    async function cycle() {
      const keepGoing = await load();
      if (keepGoing && !stopped) timer = setTimeout(cycle, OVERLAY_REFRESH_MS);
    }

    // 첫 조회도 타이머로 시작: 개발 모드 Strict Mode의 이중 실행 때 첫 번째 예약은 정리 함수가 취소한다 → 요청 한 번
    timer = setTimeout(cycle, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [token]);

  if (state.status === "loading") return <OverlayCard view={{ kind: "loading" }} theme={theme} />;
  if (state.status === "gone") {
    return (
      <OverlayCard
        view={{ kind: "error", message: "사용할 수 없는 오버레이 주소입니다. 설정 페이지에서 새 주소를 확인해 주세요." }}
        theme={theme}
      />
    );
  }
  if (state.status === "error") {
    return <OverlayCard view={{ kind: "error", message: "티어 정보를 불러오지 못했습니다." }} theme={theme} />;
  }
  if (state.tft.status === "error") {
    return <OverlayCard view={{ kind: "error", message: "TFT 랭크 정보를 불러오지 못했습니다." }} theme={theme} />;
  }
  return (
    <OverlayCard
      view={{ kind: "ok", gameName: state.gameName, tagLine: state.tagLine, ranked: state.tft.ranked }}
      theme={theme}
      today={today}
    />
  );
}
