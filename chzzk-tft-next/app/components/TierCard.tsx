import "./tier-card.css";

/*
 * TIERON 인증 카드 (HTML + CSS 목업)
 * - 데이터는 전부 props로 받는다. 나중에 Riot 데이터·인증 결과를 연결할 때는 이 컴포넌트를 부르는 쪽에서 값만 넘기면 된다.
 * - 디자인은 tier-card.css의 --tc-* 변수와 클래스(tc-*)만 고치면 된다.
 * - sample=true면 "예시 데이터" 표시가 붙는다. 실제 데이터를 연결할 때는 sample을 빼면 된다.
 */
export type TierCardData = {
  riotId: string; // 게임 이름
  tagline: string; // 태그 (# 제외)
  game: string; // 예: TFT
  tier: string; // 예: GOLD
  rank?: string; // 예: II
  lp: number;
  wins: number; // TFT: 1등 횟수 (Riot wins) / LoL: 승리
  losses: number; // TFT: 2~8등 횟수 (Riot losses) / LoL: 패배
  verifiedAt: string; // 표시용 문자열
  region?: string; // 예: KR
};

export default function TierCard({ data, sample = false }: { data: TierCardData; sample?: boolean }) {
  const total = data.wins + data.losses;
  // 티어 이름 → 색상 클래스 (tier-card.css의 .tc--gold 등). 모르는 값은 기본 민트 glow
  const tierClass = data.tier.trim().toLowerCase().replace(/[^a-z]/g, "");
  const winRate = total > 0 ? `${((data.wins / total) * 100).toFixed(1)}%` : "-";
  // TFT는 Riot TFT-LEAGUE-V1 기준 wins = 1등 횟수, losses = 2~8등 횟수 → /riot 결과 카드와 같은 표기
  // 그 밖의 게임(LoL 등)은 기존 표기 그대로
  const isTft = data.game.trim().toUpperCase() === "TFT";
  const labels = isTft
    ? { wins: "1등", losses: "2~8등", rate: "1등 비율" }
    : { wins: "WIN", losses: "LOSS", rate: "WIN RATE" };

  return (
    <article className={`tc tc--${tierClass}`} aria-label={`${data.riotId}#${data.tagline} ${data.game} 인증 카드`}>
      <header className="tc-head">
        <span className="tc-brand">
          TIER<b>ON</b>
        </span>
        <span className="tc-verified">
          <i aria-hidden="true" />
          VERIFIED
        </span>
      </header>

      <div className="tc-player">
        <p className="tc-game">
          {data.game}
          {data.region && <span> · {data.region}</span>}
        </p>
        <h3 className="tc-id">
          {data.riotId}
          <span>#{data.tagline}</span>
        </h3>
      </div>

      <div className="tc-tier">
        <span className="tc-emblem" aria-hidden="true" />
        <div>
          <p className="tc-tier-name">
            {data.tier}
            {data.rank && <span> {data.rank}</span>}
          </p>
          <p className="tc-lp">{data.lp} LP</p>
        </div>
      </div>

      <dl className="tc-stats">
        <div>
          <dt>{labels.wins}</dt>
          <dd>{data.wins}</dd>
        </div>
        <div>
          <dt>{labels.losses}</dt>
          <dd>{data.losses}</dd>
        </div>
        <div>
          <dt>{labels.rate}</dt>
          <dd>{winRate}</dd>
        </div>
      </dl>

      <footer className="tc-foot">
        <span>Riot 공식 데이터</span>
        <span>{data.verifiedAt}</span>
      </footer>

      {sample && <p className="tc-sample">예시 데이터 · 실제 계정과 무관합니다</p>}
    </article>
  );
}
