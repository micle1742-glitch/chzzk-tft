import Image from "next/image";
import Link from "next/link";
import ChzzkLoginLink from "./components/ChzzkLoginLink";
import Reveal from "./components/Reveal";
import SiteNav from "./components/SiteNav";
import { getSession } from "./lib/session";
import "./landing.css";

export default async function Landing() {
  // 로그인 상태는 서버의 getSession() 결과만 기준으로 한다 (/login, /api/auth/chzzk/me와 같은 함수)
  const session = await getSession();
  const loggedIn = session !== null;
  const nickname = session?.nickname ?? "";

  // 시작 버튼: 로그아웃 상태는 치지직 OAuth 시작 경로로 바로 이동한다
  // (외부로 리다이렉트하는 API라서 Link 프리페치 대신 일반 <a> — ChzzkLoginLink가 누르면 로그인 중 화면을 띄운다).
  // 로그인 상태는 다음 단계인 Riot 계정 인증(/verify, 아직 준비 중)과 마이페이지로 안내한다.
  const heroActions = loggedIn ? (
    <>
      <Link href="/verify" className="ax-btn ax-btn-primary">
        Riot 계정 인증하기 <span aria-hidden="true">→</span>
      </Link>
      <Link href="/mypage" className="ax-btn ax-btn-ghost">
        마이페이지
      </Link>
    </>
  ) : (
    <>
      <ChzzkLoginLink className="ax-btn ax-btn-primary">
        티어 인증 시작하기 <span aria-hidden="true">→</span>
      </ChzzkLoginLink>
      <a href="#verify" className="ax-btn ax-btn-ghost">
        서비스 알아보기
      </a>
    </>
  );

  return (
    <div className="landing">
      {/* 공통 NAV. 랜딩에서 로그아웃하면 /home으로 */}
      <SiteNav logoutRedirect="/home" />

      {/*
        서비스 소개형 랜딩: DARK(HERO·01 VERIFY·02 PROFILE) → WHITE(03 SHARE·04 STREAMERS) → DARK(FINAL).
        "무엇인지 → 어떻게 쓰는지 → 무엇을 받는지"를 짧은 섹션으로. 아직 없는 기능(RSO 인증, 공유, 랭킹, OBS)은 모두 "준비 중",
        예시 UI는 실제 사용자·티어 데이터 없이 "예시 UI"로 표시한다.
      */}
      <main className="ax">
        {/* ===== DARK 챕터 ===== */}
        <div className="ax-dark">
          {/* HERO: 첫 화면 안에 문구·카드·CTA·SCROLL이 모두 보이게 */}
          <section className="ax-hero">
            <div className="ax-wrap ax-hero-grid">
              <div className="ax-hero-copy">
                <p className="ax-label">YOUR TIER, ON TIERON</p>
                <h1>
                  티어 인증으로
                  <br />
                  <span>더 즐거운 게임을.</span>
                </h1>
                <p className="ax-body">
                  TIERON은 게임 계정을 인증하고
                  <br />
                  나만의 게임 프로필을 만들어가는 서비스입니다.
                </p>
                <div className="ax-actions">{heroActions}</div>
                {loggedIn && (
                  <Link href="/mypage" className="ax-hero-note" title="마이페이지로 이동">
                    <i aria-hidden="true" />
                    {nickname}님으로 로그인됨 · Riot 계정 인증은 준비 중
                  </Link>
                )}
              </div>

              <figure className="ax-visual ax-visual-hero">
                <Image
                  src="/landing/hero-card.png"
                  alt="TIERON 인증 카드 예시 화면"
                  width={1536}
                  height={1024}
                  sizes="(max-width: 860px) 92vw, 600px"
                  loading="eager"
                  fetchPriority="high"
                />
                <figcaption>예시 화면 · 인증 카드는 준비 중</figcaption>
              </figure>
            </div>

            <a href="#verify" className="ax-scroll" aria-label="아래로 스크롤">
              <span aria-hidden="true" />
              SCROLL
            </a>
          </section>

          {/* 01 VERIFY: "확인" 하나만. Riot ID 입력 → 공식 데이터 확인 → 계정 인증(RSO, 준비 중) */}
          <section className="ax-verify" id="verify">
            <Reveal className="ax-wrap ax-split">
              <div>
                <p className="ax-label">
                  01 <b>—</b> VERIFY
                </p>
                <h2 className="ax-title">
                  게임 계정을
                  <br />
                  <span>확인하고.</span>
                </h2>
                <p className="ax-body">
                  Riot ID만 입력하면 Riot의 공식 게임 정보를 바로 확인할 수 있습니다.
                  계정 소유 인증은 Riot Sign On(RSO)으로 준비하고 있습니다.
                </p>
                <span className="ax-soon">
                  <i aria-hidden="true" />
                  RSO 인증 준비 중
                </span>
              </div>

              <ol className="ax-steps">
                <li>
                  <span className="ax-step-no">1</span>
                  <div>
                    <strong>Riot ID 입력</strong>
                    <span className="ax-step-input" aria-hidden="true">
                      게임 이름 <b>#태그</b>
                    </span>
                  </div>
                  <em className="is-on">지금 가능</em>
                </li>
                <li>
                  <span className="ax-step-no">2</span>
                  <div>
                    <strong>공식 데이터 확인</strong>
                    <span>Riot API의 TFT·LoL 랭크 정보</span>
                  </div>
                  <em className="is-on">지금 가능</em>
                </li>
                <li className="is-soon">
                  <span className="ax-step-no">3</span>
                  <div>
                    <strong>계정 인증</strong>
                    <span>RSO로 내 계정임을 확인</span>
                  </div>
                  <em>준비 중</em>
                </li>
                <li className="ax-steps-link">
                  <Link href="/riot">Riot ID로 조회하기 →</Link>
                </li>
              </ol>
            </Reveal>
          </section>

          {/* 02 PROFILE: "어디에 모으는가" 하나만. 게임별 티어·인증 상태 + 작은 프로필 카드 이미지 */}
          <section className="ax-profile">
            <Reveal className="ax-wrap ax-split ax-split-profile">
              <div>
                <p className="ax-label">
                  02 <b>—</b> PROFILE
                </p>
                <h2 className="ax-title">
                  나만의 게임 프로필을
                  <br />
                  <span>만들고.</span>
                </h2>
                <p className="ax-body">확인한 게임 정보는 게임별로 정리되어 하나의 TIERON 프로필에 모입니다.</p>

                <div className="ax-games" role="table" aria-label="게임별 프로필 항목">
                  <div className="ax-games-row ax-games-head" role="row">
                    <span role="columnheader">게임</span>
                    <span role="columnheader">티어</span>
                    <span role="columnheader">인증 상태</span>
                  </div>
                  <div className="ax-games-row" role="row">
                    <b role="cell">TFT</b>
                    <span role="cell">Riot 공식 티어·LP</span>
                    <em role="cell">준비 중</em>
                  </div>
                  <div className="ax-games-row" role="row">
                    <b role="cell">LoL</b>
                    <span role="cell">Riot 공식 티어·LP</span>
                    <em role="cell">준비 중</em>
                  </div>
                  <div className="ax-games-row is-later" role="row">
                    <b role="cell">더 많은 게임</b>
                    <span role="cell">Steam 등</span>
                    <em role="cell">확장 예정</em>
                  </div>
                </div>
              </div>
              <figure className="ax-visual ax-visual-profile">
                <Image
                  src="/landing/profile-card.png"
                  alt="TIERON 프로필 카드 예시 화면"
                  width={1122}
                  height={1402}
                  sizes="(max-width: 860px) 70vw, 300px"
                />
                <figcaption>예시 화면</figcaption>
              </figure>
            </Reveal>
          </section>
        </div>

        {/* ===== WHITE 챕터 (DARK와의 경계에만 은은한 구분선) ===== */}
        <div className="ax-light">
          {/* 03 SHARE: "공유와 활용" 하나만. 작은 예시 UI 4개 (모두 준비 중) */}
          <section className="ax-share">
            <Reveal className="ax-wrap">
              <div className="ax-share-head">
                <div>
                  <p className="ax-label">
                    03 <b>—</b> SHARE
                  </p>
                  <h2 className="ax-title">
                    나의 티어를
                    <br />
                    <span>공유하세요.</span>
                  </h2>
                </div>
                <p className="ax-body">카드 한 장, 링크 하나로 내 티어를 원하는 곳에 보여주세요.</p>
              </div>

              <div className="ax-mocks" aria-label="공유 기능 예시 UI">
                <article className="ax-mock">
                  <div className="ax-mock-art ax-mock-card" aria-hidden="true">
                    <Image src="/landing/hero-card.png" alt="" width={1536} height={1024} sizes="240px" />
                  </div>
                  <strong>인증 카드</strong>
                  <span>이미지로 저장해 어디서든.</span>
                  <em>준비 중</em>
                </article>
                <article className="ax-mock">
                  <div className="ax-mock-art ax-mock-profile" aria-hidden="true">
                    <i className="ax-sk-avatar" />
                    <i className="ax-sk-line" />
                    <i className="ax-sk-line is-short" />
                    <div className="ax-sk-chips">
                      <i />
                      <i />
                    </div>
                  </div>
                  <strong>공개 프로필</strong>
                  <span>누구나 볼 수 있는 내 페이지.</span>
                  <em>준비 중</em>
                </article>
                <article className="ax-mock">
                  <div className="ax-mock-art ax-mock-link" aria-hidden="true">
                    <div className="ax-sk-field">
                      <i className="ax-sk-line" />
                      <b>복사</b>
                    </div>
                  </div>
                  <strong>프로필 링크</strong>
                  <span>주소 하나로 바로 공유.</span>
                  <em>준비 중</em>
                </article>
                <article className="ax-mock">
                  <div className="ax-mock-art ax-mock-social" aria-hidden="true">
                    <div className="ax-sk-post">
                      <i className="ax-sk-avatar is-sm" />
                      <div>
                        <i className="ax-sk-line" />
                        <i className="ax-sk-tile" />
                      </div>
                    </div>
                  </div>
                  <strong>SNS · 커뮤니티</strong>
                  <span>게시글에 카드 그대로 첨부.</span>
                  <em>준비 중</em>
                </article>
              </div>
              <p className="ax-mock-note">모두 예시 UI입니다. 실제 사용자·티어 데이터가 아닙니다.</p>
            </Reveal>
          </section>

          {/* 04 VERIFIED STREAMERS: 스트리머용 기능 3개 + 방송 화면·랭킹 예시 UI (이름·티어·순위 없음) */}
          <section className="ax-streamers">
            <Reveal className="ax-wrap ax-split">
              <div>
                <p className="ax-label">
                  04 <b>—</b> VERIFIED STREAMERS
                </p>
                <h2 className="ax-title">
                  스트리머라면,
                  <br />
                  <span>나의 티어도 콘텐츠가 됩니다.</span>
                </h2>
                <ul className="ax-features">
                  <li>
                    <div>
                      <strong>OBS Browser Source</strong>
                      <span>방송 화면에 TIERON 티어 정보 표시</span>
                    </div>
                    <em>준비 중</em>
                  </li>
                  <li>
                    <div>
                      <strong>Verified Streamer Profile</strong>
                      <span>치지직 채널과 게임 프로필 연결</span>
                    </div>
                    <em>준비 중</em>
                  </li>
                  <li>
                    <div>
                      <strong>Verified Streamer Ranking</strong>
                      <span>인증 스트리머를 Riot 공식 티어·LP 순으로 정렬</span>
                    </div>
                    <em>준비 중</em>
                  </li>
                </ul>
                <p className="ax-data-note">Riot이 제공하는 공식 게임 정보만 사용합니다.</p>
              </div>

              <div className="ax-board" aria-label="스트리머 기능 예시 UI">
                <div className="ax-board-head">
                  <span>방송 화면</span>
                  <em>예시 UI · 준비 중</em>
                </div>
                <div className="ax-sk-screen ax-board-screen" aria-hidden="true">
                  <i className="ax-sk-overlay" />
                </div>
                <div className="ax-board-head ax-board-sub">
                  <span>Verified Streamer Ranking</span>
                  <em>티어·LP 순</em>
                </div>
                {[1, 2, 3].map((n) => (
                  <div className="ax-board-row" key={n} aria-hidden="true">
                    <b>{n}</b>
                    <i className="ax-sk-avatar is-sm" />
                    <i className="ax-sk-line" />
                    <i className="ax-sk-line is-tag" />
                  </div>
                ))}
                <p className="ax-board-note">실제 스트리머·랭킹 데이터가 아닙니다.</p>
              </div>
            </Reveal>
          </section>
        </div>

        {/* ===== FINAL (DARK) ===== */}
        <section className="ax-final">
          <Reveal className="ax-wrap">
            <h2>
              <span>YOUR TIER.</span>
              <span>YOUR PROFILE.</span>
              <span>
                YOUR TIER<b>ON</b>.
              </span>
            </h2>
            <div className="ax-actions">
              {loggedIn ? (
                <Link href="/verify" className="ax-btn ax-btn-primary">
                  TIERON 시작하기 <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <ChzzkLoginLink className="ax-btn ax-btn-primary">
                  TIERON 시작하기 <span aria-hidden="true">→</span>
                </ChzzkLoginLink>
              )}
            </div>
          </Reveal>
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
            <Link href="/terms" className="ld-footer-link">이용약관</Link>
            {" · "}
            <Link href="/privacy" className="ld-footer-link">개인정보처리방침</Link>
          </span>
          <span className="ld-footer-text ld-footer-note">
            랭킹·커뮤니티와 인증 카드 발급은 준비 중입니다.
          </span>
          {/* Riot Games 공식 고지 문구 (Riot 정책 문구 그대로 — 임의 수정 금지) */}
          <p className="ld-footer-legal" lang="en">
            {"TIERON isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc."}
          </p>
        </div>
      </div>
    </div>
  );
}
