import type { Metadata } from "next";
import TierCard, { type TierCardData } from "../../components/TierCard";

// 인증 카드 목업 미리보기 전용 페이지 (검색에 잡히지 않게 noindex). 값은 전부 가짜 예시다.
export const metadata: Metadata = {
  title: "인증 카드 미리보기 | TIERON",
  robots: { index: false, follow: false },
};

const base = { riotId: "ExamplePlayer", tagline: "0000", game: "TFT", region: "KR", verifiedAt: "인증일 2026.01.01" };

// 티어별 glow 비교용 예시 (마스터 이상은 단계 없음)
const samples: TierCardData[] = [
  { ...base, tier: "IRON", rank: "II", lp: 42, wins: 18, losses: 12 },
  { ...base, tier: "BRONZE", rank: "III", lp: 42, wins: 18, losses: 12 },
  { ...base, tier: "SILVER", rank: "I", lp: 42, wins: 18, losses: 12 },
  { ...base, tier: "GOLD", rank: "II", lp: 42, wins: 18, losses: 12 },
  { ...base, tier: "PLATINUM", rank: "III", lp: 42, wins: 18, losses: 12 },
  { ...base, tier: "DIAMOND", rank: "IV", lp: 42, wins: 18, losses: 12 },
  { ...base, tier: "MASTER", lp: 120, wins: 18, losses: 12 },
  { ...base, tier: "GRANDMASTER", lp: 450, wins: 18, losses: 12 },
  { ...base, tier: "CHALLENGER", lp: 900, wins: 18, losses: 12 },
];

export default function CardPreviewPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "56px 20px",
        background: "radial-gradient(ellipse 60% 50% at 50% 30%, #0d2420, #050807 70%)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 360px))",
          justifyContent: "center",
          gap: 72,
          maxWidth: 1240,
          margin: "0 auto",
        }}
      >
        {samples.map((data) => (
          <TierCard key={data.tier} sample data={data} />
        ))}
      </div>
      <p style={{ margin: "48px 0 0", color: "#6d8582", fontSize: 12, textAlign: "center" }}>
        미리보기 전용 페이지 · 실제 데이터 연결 없음
      </p>
    </main>
  );
}
