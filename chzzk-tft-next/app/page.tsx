import Link from "next/link";
import Reveal from "./components/Reveal";
import SiteNav from "./components/SiteNav";
import { getSession } from "./lib/session";
import "./landing.css";

export default async function Landing() {
  // 로그인 상태는 서버의 getSession() 결과만 기준으로 한다 (/login, /api/auth/chzzk/me와 같은 함수)
  const session = await getSession();
  const loggedIn = session !== null;
  const nickname = session?.nickname ?? "";

  // 시작 영역: 로그아웃 상태는 치지직 OAuth 시작 경로로 바로 이동한다
  // (외부로 리다이렉트하는 API라서 Link 프리페치 대신 일반 <a>).
  // 로그인 상태는 여기가 이미 메인 홈이므로 버튼 대신 로그인한 사용자 정보를 보여준다.
  const startButton = loggedIn ? (
    <span className="ld-status">
      <span className="ld-status-dot" aria-hidden="true" />
      {nickname}님으로 로그인됨
    </span>
  ) : (
    <a href="/api/auth/chzzk" className="ld-btn ld-btn-primary">
      치지직으로 시작하기
    </a>
  );

  return (
    <div className="landing">
      {/* 공통 NAV. 랜딩에서 로그아웃하면 /home으로 */}
      <SiteNav logoutRedirect="/home" />

      <main className="ld-main">
        {/* 첫 화면: 텍스트 없이 가운데 은은한 빛만 */}
        <section className="ld-hero">
          <h1 className="ld-sr-only">TIERON</h1>
          <div className="ld-glow" aria-hidden="true" />
        </section>

        {/* 두 번째 섹션: 왼쪽 ABOUT TIERON, 오른쪽 티어 인증 카드 (스크롤하면 한 번만 부드럽게 나타남) */}
        <section className="ld-section ld-dark ld-about" id="about">
          <Reveal className="ld-wrap ld-split ld-split-center">
            <div>
              <p className="ld-eyebrow">
                ABOUT TIERON
              </p>
              <h2 className="ld-h2">
                TIERON은 TFT 플레이어를 위한
                <br />
                티어 인증 서비스입니다.
              </h2>
            </div>
            {/* 코드로 만든 카드 미리보기: 카드가 실제로 쓰는 필드만 사용, 값은 예시 */}
            <div className="ld-card-wrap">
              <div className="ld-tcard" aria-hidden="true">
                <div className="ld-tcard-top">
                  <span className="ld-tcard-brand">
                    TIER<span>ON</span>
                  </span>
                  <span className="ld-tcard-badge">TIERON 인증</span>
                </div>
                <div className="ld-tcard-player">
                  <strong>닉네임</strong>
                  <span>#KR1 · KR</span>
                </div>
                <div className="ld-tcard-tier">
                  <div className="ld-emblem">
                    <span>MASTER</span>
                  </div>
                  <div className="ld-tcard-tiertext">
                    <span className="ld-tcard-label">TFT RANK</span>
                    <strong>Master</strong>
                    <span>806 LP</span>
                  </div>
                </div>
                <div className="ld-tcard-stats">
                  <div>
                    <span>승</span>
                    <strong>14</strong>
                  </div>
                  <div>
                    <span>패</span>
                    <strong>6</strong>
                  </div>
                  <div>
                    <span>승률</span>
                    <strong>70.0%</strong>
                  </div>
                </div>
                <div className="ld-tcard-foot">12분 전 기준</div>
              </div>
              <p className="ld-card-caption">
                예시 · 내 TFT 티어를 카드로 남기세요.
                <small>인증 카드 발급 준비 중</small>
              </p>
            </div>
          </Reveal>
        </section>

        {/* 이용 방법 (흰 섹션) */}
        <section className="ld-section ld-light">
          <div className="ld-wrap">
            <p className="ld-eyebrow">
              HOW IT WORKS
            </p>
            <h2 className="ld-h2">간단한 3단계로 시작하세요.</h2>
            <ol className="ld-steps">
              <li>
                <span className="ld-step-no">01</span>
                <strong>치지직 로그인</strong>
                <span>치지직 계정으로 간편하게 로그인합니다.</span>
              </li>
              <li>
                <span className="ld-step-no">02</span>
                <strong>Riot 계정 연결</strong>
                <span>
                  Riot ID 조회와 별개로, 내 계정이 맞는지 소유권을 확인합니다.
                  <small>준비 중</small>
                </span>
              </li>
              <li>
                <span className="ld-step-no">03</span>
                <strong>인증 카드 확인</strong>
                <span>
                  내 티어 카드를 확인하고 공유합니다.
                  <small>준비 중</small>
                </span>
              </li>
            </ol>
          </div>
        </section>

        {/* 핵심 기능 (흰 섹션) */}
        <section className="ld-section ld-light ld-light-alt">
          <div className="ld-wrap">
            <p className="ld-eyebrow">
              KEY FEATURES
            </p>
            <h2 className="ld-h2">TIERON의 주요 기능</h2>
            <div className="ld-features">
              <div className="ld-feature">
                <h3>티어 조회</h3>
                <p>Riot ID로 TFT 티어, LP, 승·패, 승률을 확인합니다.</p>
                <div className="ld-feature-visual" aria-hidden="true">
                  <div className="ld-prev-fields">
                    <span>게임 이름</span>
                    <span>태그</span>
                    <span className="ld-prev-btn">티어 조회</span>
                  </div>
                  <div className="ld-prev-result">
                    <span>KR · 닉네임#KR1</span>
                    <strong>Master 806 LP</strong>
                    <span>14승 6패 · 승률 70.0%</span>
                  </div>
                  <span className="ld-prev-note">예시</span>
                </div>
                <Link href="/riot" className="ld-link">
                  티어 조회하기 →
                </Link>
              </div>
              <div className="ld-feature">
                <h3>
                  랭킹·커뮤니티 <small>준비 중</small>
                </h3>
                <p>인증된 플레이어들과 순위를 비교하고 이야기를 나눕니다.</p>
                <div className="ld-feature-visual" aria-hidden="true">
                  <div className="ld-rank-row ld-rank-head">
                    <span>순위</span>
                    <span>플레이어</span>
                    <span>티어</span>
                    <span>LP</span>
                  </div>
                  <div className="ld-rank-row">
                    <span>1</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                  </div>
                  <div className="ld-rank-row">
                    <span>2</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                  </div>
                  <div className="ld-rank-row">
                    <span>3</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 마지막 CTA */}
        <section className="ld-section ld-dark ld-cta">
          <div className="ld-wrap">
            <h2 className="ld-h2">지금, TIERON에서 내 티어를 확인하세요.</h2>
            <p className="ld-lead">
              치지직 계정으로 로그인하고 티어 인증을 시작해 보세요.
            </p>
            <div className="ld-actions">
              {startButton}
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <div className="ld-footer" role="contentinfo">
        <div className="ld-wrap ld-footer-row">
          <span className="ld-logo">
            TIER<span>ON</span>
          </span>
          <span className="ld-footer-text">
            TIERON은 TFT 플레이어를 위한 티어 인증 서비스입니다.
          </span>
          <span className="ld-footer-text">
            이용약관 · 개인정보처리방침 (준비 중)
          </span>
          <span className="ld-footer-text ld-footer-note">
            랭킹·커뮤니티와 인증 카드 발급은 준비 중입니다.
          </span>
        </div>
      </div>
    </div>
  );
}
