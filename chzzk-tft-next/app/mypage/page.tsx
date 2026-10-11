import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../components/LegalFooter";
import LogoutButton from "../components/LogoutButton";
import SiteNav from "../components/SiteNav";
import { requireLogin } from "../lib/require-login";
import "../legal.css";
import "./mypage.css";

export const metadata: Metadata = {
  title: "마이페이지 | TIERON",
  description: "내 TIERON 프로필과 인증 정보",
};

/*
 * 마이페이지 (로그인 필수 — 세션이 없으면 /login?next=/mypage)
 * 1. 프로필: 로그인 세션의 치지직 닉네임과 연결 상태 (실제로 아는 값만)
 * 2. 라이엇 계정 인증: 인증·게임 티어·인증 카드를 한 영역으로. RSO 승인 전이라 "준비 중"만, 인증된 것처럼 보이는 UI 없음
 * 3. OBS 오버레이: 기존 /overlay/settings로 연결 (발급·관리는 그 페이지에서 로그인 계정 기준)
 * 4. 계정: 로그아웃(기존 LogoutButton), 계정 삭제 요청
 * 아직 없는 기능(내 활동, 프로필 공유·공개 설정, 프로필 편집, 카드 만들기)은 메뉴로 늘어놓지 않는다
 */
// 인증이 열리면 티어가 표시될 게임. 다른 게임이 생기면 여기에 추가한다
const TIER_GAMES = [
  { game: "TFT", fullName: "Teamfight Tactics" },
  { game: "LoL", fullName: "League of Legends" },
];

export default async function MyPage() {
  // 로그인 필수: 세션이 없으면 /login?next=<이 페이지>로 (app/lib/require-login.ts)
  const session = await requireLogin("/mypage");

  return (
    <div className="mp-page">
      <SiteNav />

      <main className="mp-main">
        <header className="mp-head">
          <p className="mp-eyebrow">MY PAGE</p>
          <h1>마이페이지</h1>
          <p className="mp-desc">내 TIERON 프로필과 연결 계정, OBS 오버레이를 관리하세요.</p>
        </header>

        <div className="mp-top">
          {/* 1. 프로필 카드 */}
          <section className="mp-card mp-profile" aria-labelledby="mp-profile-title">
            <h2 id="mp-profile-title" className="mp-sr-only">프로필</h2>

            <div className="mp-profile-head">
              {/* 프로필 이미지 자리: 아직 이미지가 없어 닉네임 첫 글자로 표시 */}
              <div className="mp-avatar" aria-hidden="true">
                {session.nickname.slice(0, 1)}
              </div>
              <div className="mp-profile-name">
                <strong>{session.nickname}</strong>
                <span className="mp-chip">
                  <span className="mp-chip-dot" aria-hidden="true" />
                  TIERON 사용자
                </span>
              </div>
            </div>

            {/* 연결 상태: 실제로 아는 값(치지직 로그인)만 "연결됨", Riot은 연결 기능이 없어 미연결 */}
            <dl className="mp-fields">
              <div>
                <dt>치지직 계정</dt>
                <dd>
                  <span className="mp-pill is-on">연결됨</span>
                </dd>
              </div>
              <div>
                <dt>Riot ID</dt>
                <dd>
                  <span className="mp-pill">미연결</span>
                </dd>
              </div>
            </dl>
          </section>

          {/* 2. 라이엇 계정 인증 — 인증·게임 티어·인증 카드를 한 영역으로 (RSO 승인 전: 준비 중) */}
          <section className="mp-card mp-cert" aria-labelledby="mp-riot-title">
            <div className="mp-cert-head">
              <h2 id="mp-riot-title" className="mp-section-title">라이엇 계정 인증</h2>
              <span className="mp-soon">준비 중</span>
            </div>
            <p className="mp-tier-desc">
              Riot 공식 연동(RSO) 승인 전이라 지금은 계정을 연결하거나 인증할 수 없습니다. 인증이 열리면 아래 게임의
              티어와 인증 카드가 이곳에 표시됩니다.
            </p>

            <ul className="mp-rows">
              {TIER_GAMES.map((g) => (
                <li key={g.game}>
                  <div>
                    <strong>{g.game}</strong>
                    <span>{g.fullName}</span>
                  </div>
                  <span className="mp-status">미인증</span>
                </li>
              ))}
            </ul>

            <div className="mp-empty-actions">
              <Link href="/verify" className="mp-btn mp-btn-outline">
                인증 안내 보기
                <ArrowIcon />
              </Link>
            </div>
          </section>
        </div>

        {/* 3. OBS 오버레이 — 기존 설정 페이지로 연결 */}
        <section className="mp-card mp-account" aria-labelledby="mp-obs-title">
          <h2 id="mp-obs-title" className="mp-section-title">OBS 오버레이</h2>

          <ul className="mp-rows">
            <li>
              <div>
                <strong>오버레이 설정</strong>
                <span>방송 화면에 띄울 TFT 티어 카드의 테마를 고르고, 비밀 주소를 발급·재발급·삭제합니다.</span>
              </div>
              <Link href="/overlay/settings" className="mp-btn mp-btn-outline mp-btn-sm">
                설정 열기
                <ArrowIcon />
              </Link>
            </li>
          </ul>
        </section>

        {/* 4. 계정 */}
        <section className="mp-card mp-account" aria-labelledby="mp-account-title">
          <h2 id="mp-account-title" className="mp-section-title">계정</h2>

          <ul className="mp-rows">
            <li>
              <div>
                <strong>로그인 계정</strong>
                <span>치지직 · {session.nickname}</span>
              </div>
              <LogoutButton className="mp-btn mp-btn-ghost mp-btn-sm" />
            </li>
            <li>
              <div>
                <strong>계정 삭제 요청</strong>
                <span>
                  화면에서 직접 탈퇴하는 기능은 아직 없어{" "}
                  <a href="mailto:project.contact.kr@gmail.com">문의 이메일</a>로 요청할 수 있습니다.
                </span>
              </div>
              <Link href="/privacy" className="mp-text-link">
                개인정보처리방침
              </Link>
            </li>
          </ul>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
