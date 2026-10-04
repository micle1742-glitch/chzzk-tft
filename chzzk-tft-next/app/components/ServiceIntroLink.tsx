"use client";

import Link from "next/link";

// NAV "서비스 소개" = 랜딩(/) 맨 위(히어로)부터.
// 다른 페이지에서는 Link 이동이 맨 위에서 시작하지만, 이미 랜딩에서 스크롤을 내린 상태(/#about 포함)에서는
// Next가 같은 페이지로 보고 스크롤을 그대로 두므로 직접 맨 위로 올린다.
export default function ServiceIntroLink() {
  return (
    <Link
      href="/"
      onClick={() => {
        if (window.location.pathname === "/") window.scrollTo({ top: 0 });
      }}
    >
      서비스 소개
    </Link>
  );
}
