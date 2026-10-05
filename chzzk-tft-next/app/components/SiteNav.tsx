import Link from "next/link";
import { getSession } from "../lib/session";
import LogoutButton from "./LogoutButton";
import ServiceIntroLink from "./ServiceIntroLink";
import "./site-nav.css";

/*
 * 모든 페이지 공통 NAV (기준: 랜딩 / 의 헤더).
 * 로그인 상태는 서버의 getSession()으로 판단한다.
 * home.css가 header/nav 태그에 전역 스타일을 걸어서 div + role로 둔다.
 */
export default async function SiteNav({
  logoutRedirect = "/home", // 로그아웃 후에는 로그인 화면이 아니라 홈으로
}: {
  logoutRedirect?: string;
}) {
  const session = await getSession();

  return (
    <div className="site-nav" role="banner">
      <div className="sn-inner">
        <div className="sn-brand">
          <Link href="/home" className="sn-logo">
            TIER<span>ON</span>
          </Link>
          {/* 서비스 상태 표시 (ON AIR처럼 점이 은은하게 빛남). 링크가 아니라 표시만 */}
          <span className="sn-status">
            <span className="sn-status-dot" aria-hidden="true" />
            BETA
          </span>
        </div>
        <div className="sn-menu" role="navigation" aria-label="주요 메뉴">
          {/* 로고와 같은 /home으로. 로고를 몰라도 홈으로 갈 수 있게 명시적인 메뉴로 둔다 */}
          <Link href="/home">홈</Link>
          {/* 서비스 소개 = 랜딩(/) 맨 위(히어로)부터 */}
          <ServiceIntroLink />
          <Link href="/riot">Riot 인증</Link>
          <Link href="/community">커뮤니티</Link>
          {/* "가이드"(랜딩 /)는 "서비스 소개"와 역할이 겹쳐 NAV에서 뺐다. 랜딩 자체는 그대로 있음 */}
          {/* 마이페이지 진입: 로그인 상태에서만 메뉴 끝에 표시 */}
          {session && <Link href="/mypage">마이페이지</Link>}
        </div>
        {session ? (
          <div className="sn-user">
            {/* 닉네임을 누르면 마이페이지로 */}
            <Link href="/mypage" className="sn-user-name" title="마이페이지로 이동">
              {session.nickname}
            </Link>
            <LogoutButton className="sn-btn" redirectTo={logoutRedirect} />
          </div>
        ) : (
          <Link href="/login" className="sn-btn">
            로그인
          </Link>
        )}
      </div>
    </div>
  );
}
