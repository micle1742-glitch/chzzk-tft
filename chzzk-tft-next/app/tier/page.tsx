"use client";

import Link from "next/link";
import "./tier.css";
import { useState } from "react";

export default function TierPage() {
  const [nickname, setNickname] = useState("");
  const [tagline, setTagline] = useState("");

  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function searchTier() {
    setMessage("");
    setResult(null);

    if (nickname === "" || tagline === "") {
      alert("게임 이름과 태그를 모두 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: nickname,
          tagline: tagline,
        }),
      });

      const data = await response.json();

      console.log("서버에서 받은 데이터:", data);

      if (!data.success) {
        setMessage(data.message);
        return;
      }

      const tierInfo = (data.tier && data.tier.length > 0) ? data.tier[0] : null;

      setResult({
        nickname: data.nickname,
        tagline: tagline,
        tier: tierInfo || {
          tier: "UNRANKED",
          rank: "",
          leaguePoints: 0,
          wins: 0,
          losses: 0,
        },
      });
    } catch (error) {
      console.error("조회 오류:", error);
      setMessage("티어 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 승률 계산 (wins / (wins + losses) * 100, 0판이면 0.0%)
  const wins = result?.tier?.wins ?? 0;
  const losses = result?.tier?.losses ?? 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0.0";

  return (
    <div className="tier-page">
      <div className="tier-wrapper">

        <Link href="/" className="home-link">
          ← 홈으로 돌아가기
        </Link>

        <div className="container">
          {/* 브랜드 */}
          <div className="brand">
            TIER<span>ON</span>
          </div>

          {/* 인증 상태 아이콘 */}
          <div
            className={`verification-icon ${result ? "verified" : "unverified"}`}
          >
            {result ? "✓" : "×"}
          </div>

          {/* 제목 및 설명 */}
          <h1>TFT 티어 인증</h1>

          <p className="description">
            Riot 계정의 TFT 티어 정보를 확인합니다.
          </p>

          {/* 게임 이름 입력 */}
          <input
            type="text"
            id="nickname"
            placeholder="게임 이름 (예: Faker)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={loading}
          />

          {/* 태그 입력 */}
          <input
            type="text"
            id="tagline"
            placeholder="태그 (예: KR1)"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            disabled={loading}
          />

          {/* 조회 버튼 */}
          <button
            type="button"
            onClick={searchTier}
            disabled={loading}
          >
            {loading ? "티어 확인 중..." : "티어 조회"}
          </button>

          {/* 결과 영역 */}
          <div id="result">

            {/* 오류 메시지 */}
            {message && <p className="error-message">{message}</p>}

            {/* TIERON 인증 결과 카드 */}
            {result && (
              <div className="tier-card">

                {/* 1. TIERON VERIFIED 배지 */}
                <div className="verified-badge">
                  ✓ TIERON VERIFIED
                </div>

                {/* 2. 인증 완료 문구 */}
                <p className="verified-subtitle">
                  TFT 티어 인증이 완료되었습니다.
                </p>

                {/* 3, 4. 지역 KR & 닉네임 */}
                <div className="card-player-info">
                  <span className="region-tag">지역 KR</span>
                  <h2 className="player-name">
                    {result.nickname}
                    {result.tagline && <span className="player-tag">#{result.tagline}</span>}
                  </h2>
                </div>

                {/* 5, 6, 7. 임시 티어 엠블럼 및 TFT 티어, Rank, LP */}
                <div className="tier-visual-block">
                  <div className="tieron-tier-emblem">
                    <span className="emblem-tier-text">{result.tier.tier}</span>
                    {result.tier.rank && (
                      <span className="emblem-rank-text">{result.tier.rank}</span>
                    )}
                  </div>
                  <div className="tier-info-text">
                    <p className="tier-label">TFT RANK</p>
                    <h1 className="tier-name">
                      {result.tier.tier} {result.tier.rank}
                    </h1>
                    <p className="lp">{result.tier.leaguePoints} LP</p>
                  </div>
                </div>

                {/* 8, 9, 10. 승리, 패배, 승률 */}
                <div className="record-grid">
                  <div className="record-item">
                    <span className="record-label">승리</span>
                    <span className="record-value wins">{wins}</span>
                  </div>

                  <div className="record-item">
                    <span className="record-label">패배</span>
                    <span className="record-value losses">{losses}</span>
                  </div>

                  <div className="record-item">
                    <span className="record-label">승률</span>
                    <span className="record-value winrate">{winRate}%</span>
                  </div>
                </div>

                {/* 11, 12. 확인 체크 항목 */}
                <div className="verification-check-list">
                  <div className="check-item">
                    <span className="check-icon">✓</span> Riot 계정 정보가 확인되었습니다.
                  </div>
                  <div className="check-item">
                    <span className="check-icon">✓</span> TFT 랭크 정보가 정상적으로 조회되었습니다.
                  </div>
                </div>

                {/* 13. VERIFIED BY TIERON */}
                <div className="card-footer-mark">
                  VERIFIED BY TIERON
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}