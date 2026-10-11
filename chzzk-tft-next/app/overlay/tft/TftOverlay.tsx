"use client";

import { useEffect, useRef, useState } from "react";
// 타입만 가져온다 (서버 코드는 번들에 포함되지 않음)
import type { RankedEntry, SearchResponse } from "../../api/search/route";
import OverlayCard, { type OverlayTheme } from "./OverlayCard";

/*
 * OBS 브라우저 소스용 TFT 티어 카드 (최소 버전) — 조회만 여기서, 카드 표시는 OverlayCard (설정 페이지 미리보기와 공용)
 * - 표시: Riot ID, 게임(TFT), 현재 티어·LP, 티어별 색
 * - 표시하지 않음: "VERIFIED"·인증 문구 (Riot ID 조회 정보일 뿐 소유권 인증이 아님), 승패·통계
 * - 배경은 투명 (방송 화면 위에 카드만 보이게)
 */

export type { OverlayTheme };

type State =
  | { status: "loading" }
  | { status: "ok"; gameName: string; tagLine: string; ranked: RankedEntry | null }
  | { status: "error"; message: string };

export default function TftOverlay({ name, tag, theme }: { name: string; tag: string; theme: OverlayTheme }) {
  const invalid = !name || !tag;
  const [state, setState] = useState<State>({ status: "loading" });

  // 화면을 열 때 한 번만 조회 (개발 모드 Strict Mode의 이중 실행에도 한 번만)
  const started = useRef(false);
  useEffect(() => {
    if (invalid || started.current) return;
    started.current = true;
    (async () => {
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: name, tagline: tag }),
        });
        const data: SearchResponse | { success: false; message: string } = await response.json();
        if (!data.success) {
          setState({ status: "error", message: data.message });
          return;
        }
        if (data.tft.status === "error") {
          setState({ status: "error", message: "TFT 랭크 정보를 불러오지 못했습니다." });
          return;
        }
        setState({ status: "ok", gameName: data.gameName ?? name, tagLine: data.tagLine ?? tag, ranked: data.tft.ranked });
      } catch {
        setState({ status: "error", message: "티어 정보를 불러오지 못했습니다." });
      }
    })();
  }, [invalid, name, tag]);

  // 투명 배경은 page.tsx의 서버 <style>이 처리한다 (스크립트에 의존하지 않음)

  if (invalid) return <OverlayCard view={{ kind: "invalid" }} theme={theme} />;
  if (state.status === "loading") return <OverlayCard view={{ kind: "loading" }} theme={theme} />;
  if (state.status === "error") return <OverlayCard view={{ kind: "error", message: state.message }} theme={theme} />;
  return (
    <OverlayCard
      view={{ kind: "ok", gameName: state.gameName, tagLine: state.tagLine, ranked: state.ranked }}
      theme={theme}
    />
  );
}
