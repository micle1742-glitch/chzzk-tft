import Link from "next/link";
import { getSession } from "../lib/session";
import LogoutButton from "./LogoutButton";
import "./site-nav.css";

/*
 * 모든 페이지 공통 NAV (기준: 랜딩 / 의 헤더).
 * 로그인 상태는 서버의 getSession()으로 판단한다.
 * home.css가 header/nav 태그에 전역 스타일을 걸어서 div + role로 둔다.
 */
export default async function SiteNav({
  logoutRedirect = "/login",
}: {
  logoutRedirect?: string;
}) {
  const session = await getSession();

  return (
    <div className="site-nav" role="banner">
      <div className="sn-inner">
        <Link href="/home" className="sn-logo">
          TIER<span>ON</span>
        </Link>
        <div className="sn-menu" role="navigation" aria-label="주요 메뉴">
          <a href="/#about">서비스 소개</a>
          <Link href="/riot">Riot 인증</Link>
          <Link href="/community">커뮤니티</Link>
          {/* 가이드 = 서비스를 소개하는 랜딩(/) */}
          <Link href="/">가이드</Link>
        </div>
        {session ? (
          <div className="sn-user">
            <span className="sn-user-name">{session.nickname}</span>
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
