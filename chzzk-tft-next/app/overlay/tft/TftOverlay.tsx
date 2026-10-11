"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
// 타입만 가져온다 (서버 코드는 번들에 포함되지 않음)
import type { RankedEntry, SearchResponse } from "../../api/search/route";
import "../../components/tier-card.css";
import "./overlay.css";

/*
 * OBS 브라우저 소스용 TFT 티어 카드 (최소 버전)
 * - 표시: Riot ID, 게임(TFT), 현재 티어·LP, 티어별 색 (tier-card.css의 .tc--gold 등 색 체계 재사용)
 * - 표시하지 않음: "VERIFIED"·인증 문구 (Riot ID 조회 정보일 뿐 소유권 인증이 아님), 승패·통계
 * - 배경은 투명 (방송 화면 위에 카드만 보이게)
 */

type State =
  | { status: "loading" }
  | { status: "ok"; gameName: string; tagLine: string; ranked: RankedEntry | null }
  | { status: "error"; message: string };

// 마스터 이상은 단계가 없으므로 Riot이 주는 "I"를 표시하지 않는다
const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

export type OverlayTheme = "dark" | "light";

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

  if (invalid) {
    return (
      <Shell theme={theme}>
        <div className="tc ov-card ov-message">
          <p className="ov-message-title">Riot ID가 필요합니다</p>
          <p className="ov-message-desc">
            주소 끝에 <code>?name=게임이름&amp;tag=태그</code>를 붙여 주세요.
          </p>
        </div>
      </Shell>
    );
  }

  if (state.status === "loading") {
    return (
      <Shell theme={theme}>
        <div className="tc ov-card ov-message" aria-busy="true">
          <p className="ov-message-desc ov-loading">
            <span className="tn-spinner" aria-hidden="true" /> 티어 불러오는 중
          </p>
        </div>
      </Shell>
    );
  }

  if (state.status === "error") {
    return (
      <Shell theme={theme}>
        <div className="tc ov-card ov-message" role="alert">
          <p className="ov-message-title">표시할 수 없습니다</p>
          <p className="ov-message-desc">{state.message}</p>
        </div>
      </Shell>
    );
  }

  const ranked = state.ranked;
  const tier = ranked?.tier ?? "";
  const tierClass = tier.toLowerCase().replace(/[^a-z]/g, "");
  const division = ranked?.rank && !APEX_TIERS.has(tier) ? ranked.rank : "";

  return (
    <Shell theme={theme}>
      <article className={`tc ov-card${tierClass ? ` tc--${tierClass}` : ""}`} aria-label={`${state.gameName}#${state.tagLine} TFT 티어`}>
        <header className="tc-head">
          <span className="tc-brand">
            TIER<b>ON</b>
          </span>
          {/* 인증 배지가 아니라 출처 표시 (Riot ID 조회 정보) */}
          <span className="ov-source">RIOT API 조회</span>
        </header>

        <div className="ov-player">
          <span className="ov-game">TFT</span>
          <p className="tc-id ov-id">
            {state.gameName}
            <span>#{state.tagLine}</span>
          </p>
        </div>

        {ranked ? (
          <div className="tc-tier ov-tier">
            <span className="tc-emblem" aria-hidden="true" />
            <div>
              <p className="tc-tier-name">
                {tier}
                {division && <span> {division}</span>}
              </p>
              {typeof ranked.leaguePoints === "number" && <p className="tc-lp">{ranked.leaguePoints} LP</p>}
            </div>
          </div>
        ) : (
          <div className="tc-tier ov-tier ov-unranked">
            <div>
              <p className="tc-tier-name">랭크 정보 없음</p>
              <p className="ov-message-desc">현재 시즌 TFT 랭크 기록이 없습니다.</p>
            </div>
          </div>
        )}
      </article>
    </Shell>
  );
}

// 카드 테두리가 잘리지 않도록 여백을 둔 투명 영역. 테마 클래스로 테두리·글자 색만 바꾼다 (overlay.css)
function Shell({ children, theme }: { children: ReactNode; theme: OverlayTheme }) {
  return <main className={`ov-root ov-theme-${theme}`}>{children}</main>;
}
