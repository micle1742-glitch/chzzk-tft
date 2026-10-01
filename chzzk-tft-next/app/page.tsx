"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./home.css";

export default function Home() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/chzzk/me")
      .then((response) => response.json())
      .then((data) => {
        if (data.loggedIn) {
          setNickname(data.nickname);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div>href="#"
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>TIERON</title>
      <header>
        <Link href="/" className="logo-area">
          <h1 className="logo">
            TIER<span>ON</span>
          </h1>
          <span className="beta-badge">BETA</span>
        </Link>
        <nav>
          <Link href="/" className="active">홈</Link>
          <a href="#">게임</a>
          <Link href="/tier">티어 인증</Link>
          <a href="#">랭킹</a>
          <a href="#">커뮤니티</a>
        </nav>
        <button
          onClick={() => {
            window.location.href = nickname ? "/" : "/login";
          }}
        >
          {loading ? "..." : nickname ? nickname : "로그인"}
        </button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="hero-text">
              <p className="hero-small">
                게임으로 더 가까워지는 커뮤니티
              </p>
              <h2>
                당신의 게임 실력,<br />
                이제 <span>인증하세요.</span>
              </h2>
              <p className="hero-description">
                좋아하는 게임의 티어를 인증하고<br />
                다른 유저들과 함께 게임을 즐겨보세요.
              </p>
              <div className="hero-buttons">
                <button
                  className="start-btn"
                  onClick={() => window.location.href = "/auth/chzzk"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                  </svg>
                  치지직 계정으로 시작하기
                </button>
                <button className="info-btn">
                  서비스 소개
                </button>
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
          <div className="hero-visual">
            <div className="glow" />
            <div className="game-circle">
              🎮
            </div>
            <div className="floating-card card-one">
              🏆 TIER
            </div>
            <div className="floating-card card-two">
              ⚡ GAME
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
            <a href="#" className="more-games-link">
              더 많은 게임이 찾아갑니다
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className="games-grid">
            {/* 1. Teamfight Tactics (활성화) */}
            <div className="game-card active">
              <div className="game-card-thumb tft-thumb">
                <span className="game-thumb-emoji">🐧</span>
              </div>
              <div className="game-card-body">
                <h3 className="game-name">Teamfight Tactics</h3>
                <p className="game-desc">전략적 팀 전투</p>
                <button className="game-btn active">이용 가능</button>
              </div>
            </div>
            {/* 2. League of Legends */}
            <div className="game-card locked">
              <div className="game-card-thumb lol-thumb">
                <div className="lock-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span className="game-thumb-emoji">⚔️</span>
              </div>
              <div className="game-card-body">
                <h3 className="game-name">League of Legends</h3>
                <p className="game-desc">리그 오브 레전드</p>
                <button className="game-btn locked" disabled>준비 중</button>
              </div>
            </div>
            {/* 3. VALORANT */}
            <div className="game-card locked">
              <div className="game-card-thumb val-thumb">
                <div className="lock-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span className="game-thumb-emoji">🎯</span>
              </div>
              <div className="game-card-body">
                <h3 className="game-name">VALORANT</h3>
                <p className="game-desc">발로란트</p>
                <button className="game-btn locked" disabled>준비 중</button>
              </div>
            </div>
            {/* 4. Overwatch 2 */}
            <div className="game-card locked">
              <div className="game-card-thumb ow-thumb">
                <div className="lock-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span className="game-thumb-emoji">🛡️</span>
              </div>
              <div className="game-card-body">
                <h3 className="game-name">Overwatch 2</h3>
                <p className="game-desc">오버워치 2</p>
                <button className="game-btn locked" disabled>준비 중</button>
              </div>
            </div>
            {/* 5. MapleStory */}
            <div className="game-card locked">
              <div className="game-card-thumb maple-thumb">
                <div className="lock-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span className="game-thumb-emoji">🍁</span>
              </div>
              <div className="game-card-body">
                <h3 className="game-name">MapleStory</h3>
                <p className="game-desc">메이플스토리</p>
                <button className="game-btn locked" disabled>준비 중</button>
              </div>
            </div>
            {/* 6. 더 많은 게임 */}
            <div className="game-card locked">
              <div className="game-card-thumb more-thumb">
                <div className="lock-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span className="game-thumb-emoji">✨</span>
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
            {/* 1. 내 프로필 */}
            <a href="#" className="service-card">
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
            </a>

            {/* 2. 티어 인증 */}
            <Link href="/tier" className="service-card">
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
                <h3>티어 인증</h3>
                <p>게임 계정을 연동하고 티어를 인증하세요.</p>
              </div>
              <div className="service-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </Link>
            {/* 3. 랭킹 */}
            <a href="#" className="service-card">
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
            </a>
            {/* 4. 커뮤니티 */}
            <a href="#" className="service-card">
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
            </a>
          </div>
        </section>
        {/* 시작 유도 배너 */}
        <section className="cta-section">
          <div className="cta-banner">
            <div className="cta-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.83410.29A2 2 0 0 1 17.22 17.75H6.78a2 2 0 0 1-1.927-1.441L2.019 6.019a.5.5 0 0 1 .798-.519l4.277 3.664a1 1 0 0 0 1.516-.294z" />
                <path d="M5 21h14" />
              </svg>
            </div>
            <div className="cta-text">
              <h2 className="cta-title">지금, 당신의 게임 이야기를 시작하세요.</h2>
              <p className="cta-desc">티어 인증을 통해 더 많은 게임 친구들을 만나보세요.</p>
            </div>
            <button className="cta-btn">
              지금 시작하기
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
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
              <a href="#">이용약관</a>
              <a href="#">개인정보처리방침</a>
              <a href="#">문의하기</a>
            </nav>
            <div className="footer-socials">
              {/* YouTube */}
              <a href="#" aria-label="YouTube" className="social-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                  <polygon points="10 15 15 12 10 9 10 15" />
                </svg>
              </a>
              {/* Discord */}
              <a href="#" aria-label="Discord" className="social-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6h0a14.5 14.5 0 0 0-4-1.5 9.6 9.6 0 0 0-.4 1.2 13.8 13.8 0 0 0-3.2 0 9.6 9.6 0 0 0-.4-1.2A14.514.5 0 0 0 6 6 15.3 15.3 0 0 0 3 17.5a14.6 14.6 0 0 0 4.5 2.3 11 11 0 0 0 1-1.6 9.5 9.5 0 0 1-1.6-.8l.4-.3a10.4 10.4 0 0 0 10.2 0l.4.3a9.5 9.5 0 0 1-1.6.8 11 11 0 0 0 1 1.6 14.6 14.6 0 0 0 4.5-2.3A15.3 15.3 0 0 0 18 6Z" />
                  <circle cx={9} cy={12} r="1.5" />
                  <circle cx={15} cy={12} r="1.5" />
                </svg>
              </a>
              {/* GitHub */}
              <a href="#" aria-label="GitHub" className="social-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-31.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copyright">© 2025 GAMETIER. 본 사이트는 라이엇 게임즈, 치지직 및 각 게임사의 공식 서비스가 아닙니다.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}