import type { ReactNode } from "react";
// 타입만 가져온다 (서버 코드는 번들에 포함되지 않음)
import type { RankedEntry } from "../../api/search/route";
import "../../components/tier-card.css";
import "./overlay.css";

/*
 * OBS 오버레이 카드 표시 부분 (조회는 하지 않는다)
 * - /overlay/tft(TftOverlay)와 /overlay/settings 미리보기가 같은 카드를 쓰도록 분리했다
 * - 표시: Riot ID, 게임(TFT), 현재 티어·LP, 티어별 색 (tier-card.css의 .tc--gold 등 색 체계 재사용)
 * - 표시하지 않음: "VERIFIED"·인증 문구 (Riot ID 조회 정보일 뿐 소유권 인증이 아님), 승패·통계
 */

export type OverlayTheme = "dark" | "light";

export type OverlayView =
  | { kind: "invalid" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; gameName: string; tagLine: string; ranked: RankedEntry | null };

// 마스터 이상은 단계가 없으므로 Riot이 주는 "I"를 표시하지 않는다
const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

export default function OverlayCard({
  view,
  theme,
  as = "main",
}: {
  view: OverlayView;
  theme: OverlayTheme;
  // OBS 화면에서는 페이지의 주 콘텐츠(main), 설정 페이지 미리보기 안에서는 div
  as?: "main" | "div";
}) {
  if (view.kind === "invalid") {
    return (
      <Shell theme={theme} as={as}>
        <div className="tc ov-card ov-message">
          <p className="ov-message-title">Riot ID가 필요합니다</p>
          <p className="ov-message-desc">
            주소 끝에 <code>?name=게임이름&amp;tag=태그</code>를 붙여 주세요.
          </p>
        </div>
      </Shell>
    );
  }

  if (view.kind === "loading") {
    return (
      <Shell theme={theme} as={as}>
        <div className="tc ov-card ov-message" aria-busy="true">
          <p className="ov-message-desc ov-loading">
            <span className="tn-spinner" aria-hidden="true" /> 티어 불러오는 중
          </p>
        </div>
      </Shell>
    );
  }

  if (view.kind === "error") {
    return (
      <Shell theme={theme} as={as}>
        <div className="tc ov-card ov-message" role="alert">
          <p className="ov-message-title">표시할 수 없습니다</p>
          <p className="ov-message-desc">{view.message}</p>
        </div>
      </Shell>
    );
  }

  const ranked = view.ranked;
  const tier = ranked?.tier ?? "";
  const tierClass = tier.toLowerCase().replace(/[^a-z]/g, "");
  const division = ranked?.rank && !APEX_TIERS.has(tier) ? ranked.rank : "";

  return (
    <Shell theme={theme} as={as}>
      <article className={`tc ov-card${tierClass ? ` tc--${tierClass}` : ""}`} aria-label={`${view.gameName}#${view.tagLine} TFT 티어`}>
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
            {view.gameName}
            <span>#{view.tagLine}</span>
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
function Shell({ children, theme, as }: { children: ReactNode; theme: OverlayTheme; as: "main" | "div" }) {
  const className = `ov-root ov-theme-${theme}`;
  return as === "main" ? <main className={className}>{children}</main> : <div className={className}>{children}</div>;
}
