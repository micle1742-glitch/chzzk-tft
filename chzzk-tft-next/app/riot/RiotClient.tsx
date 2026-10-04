"use client";

import Link from "next/link";
import "./tier.css";
import { useState } from "react";
// 타입만 가져온다 (서버 코드는 번들에 포함되지 않음)
import type { GameResult, SearchResponse } from "../api/search/route";

type SearchError = { success: false; message: string };

// 게임별 결과. 서버가 queueType으로 일반 랭크를 골라 준다
// (ok + ranked null = 랭크 정보 없음 / error = 그 게임만 조회 실패)
type LookupResult = {
  gameName: string;
  tagLine: string;
  fetchedAt: Date;
  tft: GameResult;
  lol: GameResult;
};

type Game = "tft" | "lol";

// 탭 이름과 카드에 쓰는 게임별 문구
const GAMES: Record<Game, { tab: string; rankLabel: string; queueLabel: string; name: string }> = {
  tft: { tab: "TFT", rankLabel: "TFT RANK", queueLabel: "일반 랭크(RANKED_TFT)", name: "TFT" },
  lol: { tab: "LoL", rankLabel: "LOL SOLO RANK", queueLabel: "솔로 랭크(RANKED_SOLO_5x5)", name: "LoL" },
};

export default function RiotClient() {
  const [nickname, setNickname] = useState("");
  const [tagline, setTagline] = useState("");

  const [result, setResult] = useState<LookupResult | null>(null);
  const [game, setGame] = useState<Game>("tft");
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

      const data: SearchResponse | SearchError = await response.json();

      if (!data.success) {
        setMessage(data.message);
        return;
      }

      setResult({
        // Riot 공식 표기 우선, 없으면 입력값
        gameName: data.gameName ?? nickname,
        tagLine: data.tagLine ?? tagline,
        // 조회 성공 시각 (카드에 "조회 시각"으로 표시)
        fetchedAt: new Date(),
        tft: data.tft,
        lol: data.lol,
      });
      // 새로 조회하면 기본 탭(TFT)으로
      setGame("tft");
    } catch (error) {
      console.error("조회 오류:", error);
      setMessage("티어 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 선택한 탭의 게임 결과
  const current = result ? result[game] : null;
  const ranked = current?.status === "ok" ? current.ranked : null;
  const gameError = current?.status === "error";
  const gameText = GAMES[game];

  // 승/패는 Riot이 숫자로 준 경우에만 표시하고, 승률은 그때만 계산한다 (wins / (wins + losses) * 100)
  const wins = ranked?.wins;
  const losses = ranked?.losses;
  const hasRecord = typeof wins === "number" && typeof losses === "number";
  const totalGames = hasRecord ? wins + losses : 0;
  const winRate =
    hasRecord && totalGames > 0 ? `${((wins / totalGames) * 100).toFixed(1)}%` : "-";

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

          {/* 제목 및 설명 — 조회 페이지다. 소유권 인증은 별도 단계(HANDOFF 5번: 조회 ≠ 인증) */}
          <h1>Riot 티어 조회</h1>

          <p className="description">
            Riot ID(게임 이름#태그)로 TFT·LoL 랭크 정보를 조회합니다.
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

            {/* 조회 결과 카드 (조회 상태 — VERIFIED 표시를 쓰지 않는다) */}
            {result && (
              <div className="tier-card">

                {/* 1. 조회 상태 배지 */}
                <div className="verified-badge lookup-badge">
                  RIOT API 조회 결과
                </div>

                {/* 2. 조회 시각 */}
                <p className="verified-subtitle">
                  조회 시각{" "}
                  <time dateTime={result.fetchedAt.toISOString()}>
                    {result.fetchedAt.toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </p>

                {/* 3, 4. 지역 KR & 닉네임 */}
                <div className="card-player-info">
                  <span className="region-tag">지역 KR</span>
                  <h2 className="player-name">
                    {result.gameName}
                    {result.tagLine && <span className="player-tag">#{result.tagLine}</span>}
                  </h2>
                </div>

                {/* 게임 전환 탭 (기본 TFT). 같은 Riot ID의 결과를 게임별로 본다 */}
                <div className="game-tabs" role="tablist" aria-label="게임 선택">
                  {(Object.keys(GAMES) as Game[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      id={`game-tab-${key}`}
                      aria-selected={game === key}
                      aria-controls="game-panel"
                      className={`game-tab${game === key ? " active" : ""}`}
                      onClick={() => setGame(key)}
                    >
                      {GAMES[key].tab}
                    </button>
                  ))}
                </div>

                <div id="game-panel" role="tabpanel" aria-labelledby={`game-tab-${game}`}>
                  {/* 5, 6, 7. 임시 티어 엠블럼 및 티어, Rank, LP (선택한 게임의 일반 랭크 기준) */}
                  {ranked ? (
                    <div className="tier-visual-block">
                      <div className="tieron-tier-emblem">
                        <span className="emblem-tier-text">{ranked.tier}</span>
                        {ranked.rank && (
                          <span className="emblem-rank-text">{ranked.rank}</span>
                        )}
                      </div>
                      <div className="tier-info-text">
                        <p className="tier-label">{gameText.rankLabel}</p>
                        <h1 className="tier-name">
                          {ranked.tier} {ranked.rank}
                        </h1>
                        {typeof ranked.leaguePoints === "number" && (
                          <p className="lp">{ranked.leaguePoints} LP</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // 랭크 기록이 없거나 조회에 실패하면 티어·LP·승패를 만들어내지 않고 상태만 알린다
                    <div className="tier-visual-block">
                      <div className="tier-info-text">
                        <p className="tier-label">{gameText.rankLabel}</p>
                        {gameError ? (
                          <>
                            <h1 className="tier-name">조회 실패</h1>
                            <p className="lp">{gameText.name} 랭크 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
                          </>
                        ) : (
                          <>
                            <h1 className="tier-name">랭크 정보 없음</h1>
                            <p className="lp">{gameText.queueLabel} 기록이 조회되지 않았습니다.</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 8, 9, 10. 승리, 패배, 승률 — Riot이 승/패 숫자를 준 경우에만 */}
                  {hasRecord && (
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
                        <span className="record-value winrate">{winRate}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 11, 12. 조회 안내 — 조회는 누구 계정이든 가능하므로 소유권을 뜻하는 표현을 쓰지 않는다 */}
                <div className="verification-check-list">
                  <div className="check-item">
                    <span className="check-icon">·</span> Riot API에서 조회한 공개 랭크 정보입니다.
                  </div>
                  <div className="check-item">
                    <span className="check-icon">·</span> 계정 소유자 확인(인증)과는 별개입니다.
                  </div>
                </div>

                {/* 13. 출처 표시 */}
                <div className="card-footer-mark">
                  DATA FROM RIOT API
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}