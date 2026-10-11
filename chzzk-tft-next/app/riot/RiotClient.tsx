"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import "./tier.css";
import { useEffect, useRef, useState } from "react";
// 타입만 가져온다 (서버 코드는 번들에 포함되지 않음)
import type { GameResult, SearchResponse } from "../api/search/route";
import type { TftMatchesResponse } from "../api/tft/matches/route";
import SeasonSelect from "../components/SeasonSelect";
import type { GameSeason } from "../lib/season";

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

// TFT 전적 분석 상태 (티어 조회와 별도 요청 — 한쪽이 실패해도 다른 쪽은 그대로 보인다)
type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: TftMatchesResponse }
  | { status: "error"; message: string };

// 탭 이름과 카드에 쓰는 게임별 문구
const GAMES: Record<Game, { tab: string; rankLabel: string; queueLabel: string; name: string }> = {
  tft: { tab: "TFT", rankLabel: "TFT RANK", queueLabel: "일반 랭크(RANKED_TFT)", name: "TFT" },
  lol: { tab: "LoL", rankLabel: "LOL SOLO RANK", queueLabel: "솔로 랭크(RANKED_SOLO_5x5)", name: "LoL" },
};

/*
 * /riot/result 조회 결과 화면 (검색 화면은 RiotSearch.tsx)
 * - 주소의 Riot ID로 마운트될 때 한 번 조회한다 (/api/search → 이어서 /api/tft/matches)
 * - 위쪽 작은 검색줄로 다른 Riot ID를 조회하면 주소를 바꿔 이 화면을 새로 띄운다 (같은 ID면 이 자리에서 다시 조회)
 * - 조회·분석·시즌 선택·취소 로직은 기존 그대로
 */
export default function RiotClient({ initialName, initialTag }: { initialName: string; initialTag: string }) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialName);
  const [tagline, setTagline] = useState(initialTag);

  const [result, setResult] = useState<LookupResult | null>(null);
  const [game, setGame] = useState<Game>("tft");
  const [message, setMessage] = useState("");
  // 마운트되자마자 조회하므로 처음부터 로딩 상태
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  // 새로 조회하면 이전 분석 요청의 늦게 온 응답은 버린다
  const analysisRequest = useRef(0);
  // 진행 중인 분석 요청 취소용 — 취소하면 서버도 연결이 끊긴 것을 보고 Riot 호출을 멈춘다
  const analysisAbort = useRef<AbortController | null>(null);

  // 진행 중인 분석 요청을 취소한다 (새 조회·시즌 변경 시)
  function cancelAnalysis() {
    analysisAbort.current?.abort();
    analysisAbort.current = null;
  }
  // 시즌 목록은 서버가 실제 기록으로 만든 것만. 시즌을 바꿔 다시 불러오는 동안에도 드롭다운을 유지한다
  const [seasons, setSeasons] = useState<GameSeason[]>([]);
  const [seasonId, setSeasonId] = useState("");

  // season을 비우면 서버가 현재 시즌으로 분석한다
  async function loadAnalysis(gameName: string, tagLine: string, season?: string) {
    cancelAnalysis();
    const controller = new AbortController();
    analysisAbort.current = controller;
    const requestId = ++analysisRequest.current;
    setAnalysis({ status: "loading" });
    try {
      const response = await fetch("/api/tft/matches", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: gameName, tagline: tagLine, ...(season ? { season: Number(season) } : {}) }),
      });
      const data: TftMatchesResponse | (SearchError & { retryAfterSeconds?: number }) = await response.json();
      if (requestId !== analysisRequest.current) return;
      if (data.success) {
        setSeasons(data.seasons);
        setSeasonId(data.season?.id ?? "");
      }
      setAnalysis(
        data.success
          ? { status: "ok", data }
          : {
              status: "error",
              // 요청 한도로 잠시 쉬는 중이면 몇 초 뒤에 다시 하면 되는지 함께 알려 준다
              message: data.retryAfterSeconds
                ? `${data.message} (약 ${data.retryAfterSeconds}초 후)`
                : data.message,
            }
      );
    } catch (error) {
      // 취소한 요청은 오류가 아니다 — 화면은 새 요청이 채운다
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (requestId !== analysisRequest.current) return;
      setAnalysis({ status: "error", message: "전적 분석을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." });
    }
  }

  async function searchTier(name: string = nickname, tag: string = tagline) {
    setMessage("");
    setResult(null);
    cancelAnalysis();
    analysisRequest.current += 1;
    setAnalysis({ status: "idle" });
    setSeasons([]);
    setSeasonId("");

    if (name === "" || tag === "") {
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
          nickname: name,
          tagline: tag,
        }),
      });

      const data: SearchResponse | SearchError = await response.json();

      if (!data.success) {
        setMessage(data.message);
        return;
      }

      setResult({
        // Riot 공식 표기 우선, 없으면 입력값
        gameName: data.gameName ?? name,
        tagLine: data.tagLine ?? tag,
        // 조회 성공 시각 (카드에 "조회 시각"으로 표시)
        fetchedAt: new Date(),
        tft: data.tft,
        lol: data.lol,
      });
      // 새로 조회하면 기본 탭(TFT)으로
      setGame("tft");
      // 전적 분석은 티어 조회가 끝난 뒤 따로 요청한다 (기다리지 않음 — 카드는 먼저 보인다)
      void loadAnalysis(data.gameName ?? name, data.tagLine ?? tag);
    } catch (error) {
      console.error("조회 오류:", error);
      setMessage("티어 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 주소의 Riot ID로 한 번만 조회한다 (개발 모드 Strict Mode의 이중 실행에도 Riot을 두 번 부르지 않도록 ref로 막는다)
  const startedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = `${initialName}#${initialTag}`;
    if (startedFor.current === key) return;
    startedFor.current = key;
    void searchTier(initialName, initialTag);
    // 마운트 시 한 번만 — 다른 Riot ID는 result/page.tsx의 key가 바뀌어 화면이 새로 마운트된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 화면을 떠나면 진행 중인 분석 요청을 취소한다 (서버도 Riot 호출을 멈춘다)
  useEffect(() => () => cancelAnalysis(), []);

  // 작은 검색줄: 같은 Riot ID면 이 자리에서 다시 조회, 다른 ID면 주소를 바꿔 결과 화면을 새로 띄운다
  function submitSearch() {
    if (nickname === "" || tagline === "") {
      alert("게임 이름과 태그를 모두 입력해주세요.");
      return;
    }
    if (nickname === initialName && tagline === initialTag) {
      void searchTier();
      return;
    }
    router.push(riotResultHref(nickname, tagline));
  }

  // 선택한 탭의 게임 결과
  const current = result ? result[game] : null;
  const ranked = current?.status === "ok" ? current.ranked : null;
  const gameError = current?.status === "error";
  const gameText = GAMES[game];

  // 승/패는 Riot이 숫자로 준 경우에만 표시하고, 비율은 그때만 계산한다 (wins / (wins + losses) * 100)
  // TFT는 의미가 다르다 (Riot TFT-LEAGUE-V1): wins = 1등 횟수, losses = 2~8등 횟수
  //   → "1등 / 2~8등 / 1등 비율"로 표시하고, wins + losses = 현재 시즌 전체 랭크 게임 수
  // LoL은 기존대로 승리 / 패배 / 승률
  const isTft = game === "tft";
  const recordLabels = isTft
    ? { wins: "1등", losses: "2~8등", rate: "1등 비율" }
    : { wins: "승리", losses: "패배", rate: "승률" };
  const wins = ranked?.wins;
  const losses = ranked?.losses;
  const hasRecord = typeof wins === "number" && typeof losses === "number";
  const totalGames = hasRecord ? wins + losses : 0;
  const winRate =
    hasRecord && totalGames > 0 ? `${((wins / totalGames) * 100).toFixed(1)}%` : "-";

  return (
    <div className="tier-page is-result">
      <div className="riot-result is-compact">
        {/* 위쪽 이동은 하나만: 이전 Riot ID를 채운 검색 화면으로 */}
        <Link href={riotSearchHref(initialName, initialTag)} className="home-link">
          ← 다시 전적 검색
        </Link>

        {/* 데스크톱: 왼쪽 = 검색·티어 카드, 오른쪽 = 전적 분석 / 모바일: 위아래 */}
        <div className="riot-result-grid">
          <div className="riot-result-main">
            <div className="container is-compact">
              {/* 작은 검색줄 (Enter로도 조회) */}
              <form
                className="search-compact"
                aria-label="Riot ID 다시 조회"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSearch();
                }}
              >
                <div className="search-compact-fields">
                  <input
                    type="text"
                    id="nickname"
                    aria-label="게임 이름"
                    placeholder="게임 이름"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    disabled={loading}
                  />
                  <span className="search-compact-hash" aria-hidden="true">#</span>
                  <input
                    type="text"
                    id="tagline"
                    aria-label="태그"
                    placeholder="태그"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="tn-spinner" aria-hidden="true" />
                      조회 중
                    </>
                  ) : (
                    "다시 조회"
                  )}
                </button>
              </form>

              {/* 결과 영역 */}
              <div id="result">
                {loading && !result && (
                  <p className="result-loading">
                    <span className="tn-spinner" aria-hidden="true" />
                    티어 확인 중...
                  </p>
                )}

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
                                <p className="tier-state-desc">{gameText.name} 랭크 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
                              </>
                            ) : (
                              <>
                                <h1 className="tier-name">랭크 정보 없음</h1>
                                <p className="tier-state-desc">{gameText.queueLabel} 기록이 조회되지 않았습니다.</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 8, 9, 10. 승패 기록 — Riot이 숫자를 준 경우에만. TFT는 1등 / 2~8등 / 1등 비율, LoL은 승리 / 패배 / 승률 */}
                      {hasRecord && (
                        <div className="record-grid">
                          <div className="record-item">
                            <span className="record-label">{recordLabels.wins}</span>
                            <span className="record-value wins">{wins}</span>
                          </div>

                          <div className="record-item">
                            <span className="record-label">{recordLabels.losses}</span>
                            <span className="record-value losses">{losses}</span>
                          </div>

                          <div className="record-item">
                            <span className="record-label">{recordLabels.rate}</span>
                            <span className="record-value winrate">{winRate}</span>
                          </div>
                        </div>
                      )}

                      {/* TFT 현재 시즌 전체 랭크 게임 수 = wins(1등) + losses(2~8등). 추가 API 호출 없음 */}
                      {hasRecord && isTft && (
                        <p className="record-total">현재 시즌 전체 랭크 게임 {totalGames}판</p>
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

          <div className="riot-result-side">
            {/* TFT 전적 분석 — 카드와 분리된 영역 (HANDOFF 5번 "전적 분석 영역"). TFT 탭에서만 */}
            {result && game === "tft" && analysis.status !== "idle" && (
              <MatchAnalysis
                state={analysis}
                seasons={seasons}
                seasonId={seasonId}
                onSeasonChange={(id) => {
                  setSeasonId(id);
                  void loadAnalysis(result.gameName, result.tagLine, id);
                }}
              />
            )}
            {result && game === "lol" && (
              <section className="match-analysis" aria-label="LoL 전적 분석">
                <p className="ma-eyebrow">MATCH ANALYSIS</p>
                <p className="ma-state">LoL 전적 분석은 준비 중입니다. TFT 탭에서 최근 랭크 분석을 볼 수 있습니다.</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 검색 화면·결과 화면 주소 (Riot ID를 주소에 담아 새로고침·뒤로가기·공유가 되게)
export function riotResultHref(name: string, tag: string) {
  return `/riot/result?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`;
}
export function riotSearchHref(name: string, tag: string) {
  return `/riot?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`;
}

// 시즌별 최근 랭크 매치 통계. Riot 매치의 실제 등수로 계산한 값만, 기준(시즌·판 수·기간·목록 시각)과 함께 보여 준다
function MatchAnalysis({
  state,
  seasons,
  seasonId,
  onSeasonChange,
}: {
  state: AnalysisState;
  seasons: GameSeason[];
  seasonId: string;
  onSeasonChange: (seasonId: string) => void;
}) {
  const loading = state.status === "loading";
  const data = state.status === "ok" ? state.data : null;
  const a = data?.analysis;
  const seasonName = data?.season ? `${data.season.label}${data.season.isCurrent ? "(현재 시즌)" : ""}` : "";
  // 지난 시즌: Riot 데이터로 현재 시즌을 확인했고, 선택한 시즌이 그것이 아닐 때 → 핵심 통계 3개만
  // (Riot League API는 지난 시즌 전체 판 수를 주지 않는다 — 확인한 매치로만 계산하고 "시즌 전체"라고 표시하지 않는다)
  const isPastSeason = !!data?.season && data.currentSeasonKnown && !data.season.isCurrent;

  // 게임 기간은 해를 넘길 수 있어 연도까지, 목록 기준 시각은 시:분까지
  const day = (ms: number) =>
    new Date(ms).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = (ms: number) =>
    new Date(ms).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const maxCount = a ? Math.max(1, ...a.distribution) : 1;

  return (
    <section className="match-analysis" aria-labelledby="ma-title" aria-busy={loading || undefined}>
      <div className="ma-head">
        <div>
          <p className="ma-eyebrow">MATCH ANALYSIS</p>
          <h2 id="ma-title" className="ma-title">
            {isPastSeason && data?.season
              ? `${data.season.label} 요약`
              : a && a.games > 0
                ? `최근 랭크 ${a.games}판`
                : "최근 랭크 분석"}
          </h2>
        </div>
        <SeasonSelect seasons={seasons} value={seasonId} onChange={onSeasonChange} disabled={loading} />
      </div>

      {loading && (
        <p className="ma-state">
          <span className="tn-spinner" aria-hidden="true" />
          랭크 전적을 분석하는 중...
        </p>
      )}

      {state.status === "error" && <p className="ma-state">{state.message}</p>}

      {data && a && (
        <>
          {seasonName && (
            <p className="ma-season">
              분석 시즌 <strong>{seasonName}</strong> ·{" "}
              {isPastSeason ? `최근 확인한 랭크 ${a.games}판 기준` : `랭크 ${a.games}판`}
            </p>
          )}

          {/* 데이터 없음 / 탐색 범위 밖 — 없는 값을 채우지 않고 이유만 안내한다 */}
          {a.games === 0 && (
            <p className="ma-state">
              {data.seasonStatus === "beyond_range"
                ? `최근 매치 300개 안에서 ${data.season?.label ?? "이 시즌"} 랭크 기록을 찾지 못했습니다. 더 오래된 시즌은 확인하지 못했습니다.`
                : data.season
                  ? `${data.season.label}${data.season.isCurrent ? "(현재 시즌)" : ""} 랭크 기록이 없습니다.`
                  : "최근 매치에서 랭크 기록을 찾지 못했습니다."}
            </p>
          )}

          {/* 지난 시즌: 랭크 게임 수 · TOP 4 비율 · 1등 비율만 (확인한 판 기준) */}
          {a.games > 0 && isPastSeason && (
            <dl className="ma-summary">
              <div>
                <dt>랭크 게임 수</dt>
                <dd>
                  {a.games}
                  <small>판</small>
                </dd>
              </div>
              <div>
                <dt>TOP 4 비율</dt>
                <dd>{a.top4Rate}%</dd>
              </div>
              <div>
                <dt>1등 비율</dt>
                <dd>{a.firstRate}%</dd>
              </div>
            </dl>
          )}

          {/* 현재 시즌: 기존 상세 분석 그대로 */}
          {a.games > 0 && !isPastSeason && (
            <>
              <dl className="ma-stats">
                <div>
                  <dt>평균 등수</dt>
                  <dd>{a.avgPlacement?.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>4등 이내</dt>
                  <dd>{a.top4Rate}%</dd>
                </div>
                <div>
                  <dt>1등</dt>
                  <dd>{a.firstRate}%</dd>
                </div>
                <div>
                  <dt>분석 판 수</dt>
                  <dd>{a.games}</dd>
                </div>
              </dl>

              <div className="ma-block">
                <p className="ma-block-title">등수 분포</p>
                <ol className="ma-dist">
                  {a.distribution.map((count, i) => (
                    <li key={i} className={i < 4 ? "is-top4" : undefined}>
                      <span className="ma-dist-bar" aria-hidden="true">
                        <span style={{ height: `${(count / maxCount) * 100}%` }} />
                      </span>
                      <span className="ma-dist-count">{count}</span>
                      <span className="ma-dist-label">{i + 1}등</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="ma-block">
                <p className="ma-block-title">최근 등수 (왼쪽이 최신)</p>
                <ol className="ma-recent" aria-label="최근 등수, 최신순">
                  {a.recentPlacements.map((placement, i) => (
                    <li key={i} className={placement <= 4 ? "is-top4" : undefined}>
                      {placement}
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}

          {/* 기준 — 계산한 통계는 항상 기준과 함께 표시한다 */}
          <ul className="ma-basis">
            {a.games > 0 && a.oldestGameAt !== null && a.latestGameAt !== null && (
              <li>
                기준: {data.season?.label} 랭크 게임 {a.games}판 ({day(a.oldestGameAt)} ~ {day(a.latestGameAt)})
              </li>
            )}
            {isPastSeason && a.games > 0 && (
              <li>
                Riot은 지난 시즌 전체 전적 수를 제공하지 않아, 최근 매치 기록에서 확인한 랭크 판으로만 계산했습니다.
                시즌 전체 통계가 아닙니다.
              </li>
            )}
            {data.seasonStatus === "partial_range" && (
              <li>최근 매치 300개 안에서 확인된 판만 분석했습니다. 더 오래된 기록은 확인하지 못했습니다.</li>
            )}
            {data.olderUnchecked && data.seasonStatus !== "partial_range" && data.seasonStatus !== "beyond_range" && (
              <li>최근 매치 300개까지 확인했습니다. 더 오래된 시즌은 확인하지 못했습니다.</li>
            )}
            {!data.currentSeasonKnown && (
              <li>현재 시즌을 확인하지 못했습니다. 시즌 목록에는 이 계정 기록에서 찾은 시즌만 표시합니다.</li>
            )}
            <li>매치 목록 기준 시각 {time(Date.parse(data.checkedAt))} · Riot TFT Match API</li>
            {!data.complete && (
              <li className="ma-warn">
                {data.stoppedBy === "rate_limit"
                  ? `요청이 많아 일부 매치만 분석했습니다. ${data.retryAfterSeconds ? `약 ${data.retryAfterSeconds}초 후 ` : "잠시 후 "}다시 조회하면 나머지를 불러옵니다.`
                  : data.stoppedBy === "budget"
                    ? "한 번에 확인할 수 있는 매치 수를 넘어 일부만 분석했습니다. 다시 조회하면 이어서 불러옵니다."
                    : "일부 매치를 불러오지 못해 확인된 판까지만 분석했습니다."}
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
