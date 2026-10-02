import Link from "next/link";
import SiteNav from "../components/SiteNav";
import { MOCK_POSTS, MOCK_RANKING } from "./mock-data";
import "./community.css";

/*
 * 랭킹·커뮤니티 (UI만, 시안: docs/design/06-ranking-community.png)
 * 탭: /community = 게시판(기본), /community?tab=ranking = 랭킹
 * 데이터는 전부 mock-data.ts의 목업이다. 작성·댓글·저장·검색 기능은 없다.
 */
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  const isRanking = tab === "ranking";

  return (
    <div className="cm-page">
      <SiteNav />

      <main className="cm-wrap">
        <p className="cm-eyebrow">TFT RANKING &amp; COMMUNITY</p>
        <h1 className="cm-title">랭킹·커뮤니티</h1>

        <div className="cm-tabs" role="tablist">
          <Link href="/community" className={`cm-tab ${!isRanking ? "is-active" : ""}`} role="tab" aria-selected={!isRanking}>
            게시판
          </Link>
          <Link href="/community?tab=ranking" className={`cm-tab ${isRanking ? "is-active" : ""}`} role="tab" aria-selected={isRanking}>
            랭킹
          </Link>
        </div>

        <p className="cm-notice">
          <span className="cm-notice-dot" aria-hidden="true" />
          <span>
            지금 보이는 {isRanking ? "랭킹" : "게시글"}은 화면 확인용 <strong>예시 데이터</strong>입니다.
            {isRanking ? " 실제 랭킹은 Riot 계정 인증이 확정된 뒤 제공됩니다." : " 글쓰기·댓글 기능은 준비 중입니다."}
          </span>
        </p>

        {isRanking ? <Ranking /> : <Board />}
      </main>
    </div>
  );
}

function Ranking() {
  const top3 = MOCK_RANKING.slice(0, 3);

  return (
    <section className="cm-panel" aria-label="TFT 랭킹">
      <div className="cm-panel-head">
        <div>
          <h2 className="cm-h2">TFT 랭킹</h2>
          <p className="cm-sub">TIERON에서 인증한 플레이어들의 순위입니다.</p>
        </div>
        <span className="cm-chip">현재 시즌</span>
      </div>

      <div className="cm-podium">
        {top3.map((p) => (
          <div key={p.rank} className={`cm-podium-card ${p.rank === 1 ? "is-first" : ""}`}>
            <span className="cm-podium-rank">{p.rank}</span>
            <span className="cm-avatar cm-avatar-lg" aria-hidden="true">
              {p.nickname.charAt(0)}
            </span>
            <strong className="cm-podium-name">{p.nickname}</strong>
            <span className="cm-podium-tag">#{p.tag}</span>
            <span className="cm-tier">{p.tier}</span>
            <span className="cm-podium-lp">{p.lp.toLocaleString()} LP</span>
          </div>
        ))}
      </div>

      <div className="cm-table" role="table" aria-label="전체 랭킹">
        <div className="cm-row cm-row-head cm-rank-row" role="row">
          <span role="columnheader">순위</span>
          <span role="columnheader">플레이어</span>
          <span role="columnheader">티어</span>
          <span role="columnheader" className="cm-right">LP</span>
        </div>
        {MOCK_RANKING.map((p) => (
          <div key={p.rank} className="cm-row cm-rank-row" role="row">
            <span role="cell" className="cm-rank-no">{p.rank}</span>
            <span role="cell" className="cm-player">
              <span className="cm-avatar" aria-hidden="true">{p.nickname.charAt(0)}</span>
              {p.nickname}
              <span className="cm-muted">#{p.tag}</span>
            </span>
            <span role="cell"><span className="cm-tier">{p.tier}</span></span>
            <span role="cell" className="cm-right">{p.lp.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <Pagination />
    </section>
  );
}

function Board() {
  const categories = ["전체", "자유", "공략", "질문", "정보"];

  return (
    <section className="cm-panel" aria-label="커뮤니티 게시판">
      <div className="cm-panel-head">
        <div>
          <h2 className="cm-h2">커뮤니티</h2>
          <p className="cm-sub">TFT를 좋아하는 플레이어들과 이야기를 나눠 보세요.</p>
        </div>
        {/* 글쓰기는 아직 없다: 버튼 자리만 두고 비활성 */}
        <button type="button" className="cm-write" disabled title="글쓰기는 준비 중입니다">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          글쓰기
          <small>준비 중</small>
        </button>
      </div>

      <div className="cm-filters">
        <div className="cm-cats">
          {categories.map((c, i) => (
            <span key={c} className={`cm-cat ${i === 0 ? "is-active" : ""}`}>
              {c}
            </span>
          ))}
        </div>
        <input className="cm-search" type="search" placeholder="검색은 준비 중입니다" disabled />
      </div>

      <div className="cm-table" role="table" aria-label="게시글 목록">
        <div className="cm-row cm-row-head cm-post-row" role="row">
          <span role="columnheader">분류</span>
          <span role="columnheader">제목</span>
          <span role="columnheader">작성자</span>
          <span role="columnheader">작성일</span>
          <span role="columnheader" className="cm-right">댓글</span>
        </div>
        {MOCK_POSTS.map((post) => (
          <Link key={post.id} href={`/community/${post.id}`} className="cm-row cm-post-row cm-row-link" role="row">
            <span role="cell">
              <span className={`cm-badge ${post.category === "공지" ? "is-notice" : ""}`}>{post.category}</span>
            </span>
            <span role="cell" className="cm-post-title">
              {post.title}
              <span className="cm-comment-count">[{post.comments}]</span>
            </span>
            <span role="cell" className="cm-muted">{post.author}</span>
            <span role="cell" className="cm-muted">{post.date}</span>
            <span role="cell" className="cm-right cm-muted">{post.comments}</span>
          </Link>
        ))}
      </div>

      <Pagination />
    </section>
  );
}

// 페이지 이동은 아직 없다 (모양만)
function Pagination() {
  return (
    <div className="cm-pages" aria-hidden="true">
      <span className="cm-pg is-active">1</span>
      <span className="cm-pg">2</span>
      <span className="cm-pg">3</span>
    </div>
  );
}
