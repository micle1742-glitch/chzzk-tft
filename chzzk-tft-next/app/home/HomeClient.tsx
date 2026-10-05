"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ChzzkLoginLink from "../components/ChzzkLoginLink";
import "./home.css";

// 히어로 배경 슬라이드. 첫 장이 첫 화면. (게임별 문구·UI는 아직 없음 — 배경만 바뀐다)
const HERO_SLIDES = [
  { src: "/hero/home-hero.png" },
  { src: "/hero/pubg-hero.png" },
  { src: "/hero/maple-hero.png" },
  { src: "/hero/steam-hero.png" },
];

// 한 장을 보여 주는 시간. 전환(페이드) 1초는 home.css의 .hero-slide.is-active transition
const HERO_SLIDE_INTERVAL_MS = 7000;

// 지원 게임 카드 상단 아트워크. 썸네일(.game-card-thumb.has-image)을 꽉 채워 자른다.
// 장식이라 alt 비움 — 게임 이름은 카드의 h3. 시안용 이미지 — 배포 전 사용 권한 확인
function GameThumbImage({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes="(max-width: 960px) 50vw, 200px"
      className="game-thumb-img"
    />
  );
}

// 헤더는 공통 NAV(SiteNav)가 맡는다. 이 파일은 /home 본문만 그린다.
export default function HomeClient({ loggedIn }: { loggedIn: boolean }) {
  // 현재 장과 직전 장. 직전 장을 아래에 그대로 깔아 두고 새 장만 위에서 페이드인 → 중간에 어두워지지 않는다
  const [slide, setSlide] = useState({ index: 0, prev: -1 });
  const slideIndex = slide.index;
  const prevSlide = slide.prev;

  useEffect(() => {
    // 움직임 줄이기 설정을 켠 사용자에게는 자동 전환을 하지 않는다 (첫 장 고정)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setSlide((s) => ({ index: (s.index + 1) % HERO_SLIDES.length, prev: s.index }));
    }, HERO_SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="home-page">
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>TIERON</title>
      <main>
        <section className="hero">
          {/* 풀블리드 배경 슬라이드 (장식이라 alt 비움). 시안용 임시 이미지 — 배포 전 사용 권한을 확인한 에셋으로 교체.
              4장을 겹쳐 두고 현재 장만 위로 올려 페이드인한다 → 이미지가 바뀌어도 레이아웃 높이는 그대로 */}
          <div className="hero-bg" aria-hidden="true">
            {HERO_SLIDES.map((slide, i) => (
              <Image
                key={slide.src}
                src={slide.src}
                alt=""
                fill
                sizes="100vw"
                // 첫 장은 우선 로드, 나머지는 바로 받아 두되 우선순위를 낮춰 첫 장을 방해하지 않게
                loading="eager"
                fetchPriority={i === 0 ? "high" : "low"}
                className={`hero-bg-img hero-slide${i === slideIndex ? " is-active" : i === prevSlide ? " is-prev" : ""}`}
              />
            ))}
          </div>
          <div className="hero-content">
            <div className="hero-text">
              <p className="hero-eyebrow">Game Account Verification Platform</p>
              <h1 className="hero-wordmark">
                TIER<span>ON</span>
              </h1>
              <h2>
                당신의 게임 실력,<br />
                이제 <span>인증하세요.</span>
              </h2>
              <p className="hero-description">
                좋아하는 게임의 티어를 인증하고<br />
                다른 유저들과 함께 게임을 즐겨보세요.
              </p>
              <div className="hero-buttons">
                {/* 메인 CTA: 로그인 전에는 치지직 로그인, 로그인 후에는 다음 단계인 Riot 계정 인증(/verify)으로 */}
                {loggedIn ? (
                  <Link href="/verify" className="start-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                    </svg>
                    라이엇 인증하기
                  </Link>
                ) : (
                  <ChzzkLoginLink className="start-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                    </svg>
                    치지직 계정으로 시작하기
                  </ChzzkLoginLink>
                )}
                {/* NAV "서비스 소개"와 같은 곳(랜딩 /)으로 */}
                <Link href="/" className="info-btn">
                  서비스 소개
                </Link>
              </div>
            </div>
            <div className="features">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div className="feature-text">
                  <h3>간편한 인증</h3>
                  <p>게임 계정 정보를 통해 쉽고 빠르게 인증하세요.</p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                    <path d="M18 17V9" />
                    <path d="M13 17V5" />
                    <path d="M8 17v-3" />
                  </svg>
                </div>
                <div className="feature-text">
                  <h3>정확한 게임 정보</h3>
                  <p>게임 API를 기반으로 티어 정보를 확인합니다.</p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx={9} cy={7} r={4} />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="feature-text">
                  <h3>함께하는 커뮤니티</h3>
                  <p>게임을 좋아하는 사람들과 함께 소통해보세요.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-divider" />
        </section>
        {/* 지원 게임 섹션 */}
        <section className="games-section">
          <div className="games-header">
            <div className="games-title-area">
              <div className="games-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1={6} y1={12} x2={10} y2={12} />
                  <line x1={8} y1={10} x2={8} y2={14} />
                  <line x1={15} y1={13} x2="15.01" y2={13} />
                  <line x1={18} y1={11} x2="18.01" y2={11} />
                  <rect x={2} y={6} width={20} height={12} rx={6} />
                </svg>
                <span>다양한 게임의 티어를 인증해보세요</span>
              </div>
              <h2 className="games-title">지원 게임</h2>
            </div>
            {/* 이동할 곳이 아직 없는 안내 문구라 링크(#)가 아닌 텍스트로 둔다 */}
            <span className="more-games-link is-static">더 많은 게임이 찾아갑니다</span>
          </div>
          <div className="games-grid">
            {/* 1. Teamfight Tactics (활성화) */}
            <div className="game-card active">
              <div className="game-card-thumb tft-thumb has-image">
                <GameThumbImage src="/games/tft.png" />
              </div>
              <div className="game-card-body">
                <h3 className="game-name">Teamfight Tactics</h3>
                <p className="game-desc">전략적 팀 전투</p>
                {/* 지금 이용 가능한 TFT 기능 = 티어 조회(/riot) */}
                <Link href="/riot" className="game-btn active">이용 가능</Link>
              </div>
            </div>
            {/* 2. League of Legends */}
            <div className="game-card locked">
              <div className="game-card-thumb lol-thumb has-image">
                <GameThumbImage src="/games/lol.png" />
                <div className="lock-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <div className="game-card-body">
                <h3 className="game-name">League of Legends</h3>
                <p className="game-desc">리그 오브 레전드</p>
                <button className="game-btn locked" disabled>준비 중</button>
              </div>
            </div>
            {/* 3. VALORANT */}
            <div className="game-card locked">
              <div className="game-card-thumb val-thumb has-image">
                <GameThumbImage src="/games/valorant.png" />
                <div className="lock-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <div className="game-card-body">
                <h3 className="game-name">VALORANT</h3>
                <p className="game-desc">발로란트</p>
                <button className="game-btn locked" disabled>준비 중</button>
              </div>
            </div>
            {/* 4. Overwatch 2 */}
            <div className="game-card locked">
              <div className="game-card-thumb ow-thumb has-image">
                <GameThumbImage src="/games/overwatch.png" />
                <div className="lock-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <div className="game-card-body">
                <h3 className="game-name">Overwatch 2</h3>
                <p className="game-desc">오버워치 2</p>
                <button className="game-btn locked" disabled>준비 중</button>
              </div>
            </div>
            {/* 5. MapleStory */}
            <div className="game-card locked">
              <div className="game-card-thumb maple-thumb has-image">
                <GameThumbImage src="/games/maplestory.png" />
                <div className="lock-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <div className="game-card-body">
                <h3 className="game-name">MapleStory</h3>
                <p className="game-desc">메이플스토리</p>
                <button className="game-btn locked" disabled>준비 중</button>
              </div>
            </div>
            {/* 6. 더 많은 게임 */}
            <div className="game-card locked">
              <div className="game-card-thumb more-thumb has-image">
                <GameThumbImage src="/games/more.png" />
                <div className="lock-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <div className="game-card-body">
                <h3 className="game-name">더 많은 게임</h3>
                <p className="game-desc">추가될 게임을 기대해주세요.</p>
                <button className="game-btn locked" disabled>준비 중</button>
              </div>
            </div>
          </div>
        </section>
        {/* 주요 서비스 섹션 */}
        <section className="services-section">
          <div className="services-header">
            <div className="services-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1={6} y1={12} x2={10} y2={12} />
                <line x1={8} y1={10} x2={8} y2={14} />
                <line x1={15} y1={13} x2="15.01" y2={13} />
                <line x1={18} y1={11} x2="18.01" y2={11} />
                <rect x={2} y={6} width={20} height={12} rx={6} />
              </svg>
              <span>게임을 더 즐겁게, TIERON과 함께.</span>
            </div>
            <h2 className="services-title">주요 서비스</h2>
          </div>
          <div className="services-grid">
            {/* 1. 내 프로필 → 마이페이지 */}
            <Link href="/mypage" className="service-card">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx={12} cy={7} r={4} />
                </svg>
              </div>
              <div className="service-text">
                <h3>내 프로필</h3>
                <p>내 게임 티어와 전적을 한눈에 확인하세요.</p>
              </div>
              <div className="service-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </Link>

            {/* 2. Riot 티어 조회 (/riot은 조회 페이지 — 소유권 인증은 /verify) */}
            <Link href="/riot" className="service-card">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7.5a1.5 1.5 0 0 1-1.5-1.5v-1.84" />
                  <path d="M14 14.66V17c0 .55.45 1 1 1h1.5a1.5 1.5 0 0 0 1.5-1.5v-1.84" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </div>
              <div className="service-text">
                <h3>Riot 티어 조회</h3>
                <p>Riot ID로 TFT·LoL 랭크를 조회하세요.</p>
              </div>
              <div className="service-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </Link>
            {/* 3. 랭킹 — 랭킹·커뮤니티 페이지의 랭킹 탭 */}
            <Link href="/community?tab=ranking" className="service-card">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                  <path d="M18 17V9" />
                  <path d="M13 17V5" />
                  <path d="M8 17v-3" />
                </svg>
              </div>
              <div className="service-text">
                <h3>랭킹</h3>
                <p>다른 스트리머와 시청자들의 티어를 확인해보세요.</p>
              </div>
              <div className="service-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </Link>
            {/* 4. 커뮤니티 */}
            <Link href="/community" className="service-card">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  <circle cx={8} cy={12} r={1} />
                  <circle cx={12} cy={12} r={1} />
                  <circle cx={16} cy={12} r={1} />
                </svg>
              </div>
              <div className="service-text">
                <h3>커뮤니티</h3>
                <p>게임 이야기로 함께 소통하세요.</p>
              </div>
              <div className="service-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </Link>
          </div>
        </section>
        {/* 시작 유도 배너 */}
        <section className="cta-section">
          <div className="cta-banner">
            <div className="cta-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
                <path d="M5 21h14" />
              </svg>
            </div>
            <div className="cta-text">
              <h2 className="cta-title">지금, 당신의 게임 이야기를 시작하세요.</h2>
              <p className="cta-desc">티어 인증을 통해 더 많은 게임 친구들을 만나보세요.</p>
            </div>
            {/* 히어로 메인 CTA와 같은 목적지: 로그인 상태면 Riot 인증(/verify), 아니면 치지직 로그인 */}
            {loggedIn ? (
              <Link href="/verify" className="cta-btn">
                라이엇 인증하기
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <ChzzkLoginLink className="cta-btn">
                지금 시작하기
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </ChzzkLoginLink>
            )}
          </div>
        </section>
      </main>
      {/* 푸터 */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-brand">
              <h3 className="footer-logo">
                TIER<span>ON</span>
              </h3>
              <p className="footer-slogan">게임으로 더 즐거워지는 커뮤니티</p>
            </div>
            <nav className="footer-links">
              <Link href="/terms">이용약관</Link>
              <Link href="/privacy">개인정보처리방침</Link>
              <a href="mailto:project.contact.kr@gmail.com">문의하기</a>
            </nav>
            {/* 소셜 아이콘(YouTube·Discord·GitHub)은 연결할 공식 계정이 아직 없어 링크(#)만 남아 있어서 뺐다 */}
          </div>
          <div className="footer-bottom">
            <p className="footer-copyright">© 2026 TIERON. 본 사이트는 라이엇 게임즈, 치지직 및 각 게임사의 공식 서비스가 아닙니다.</p>
            {/* Riot Games 공식 고지 문구 (정책 문구 그대로 — 임의 수정 금지) */}
            <p className="footer-legal" lang="en">
              {"TIERON isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc."}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}