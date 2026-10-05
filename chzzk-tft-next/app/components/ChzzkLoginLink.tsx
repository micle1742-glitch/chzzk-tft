"use client";

import { useEffect, useState, type ReactNode } from "react";
import "./chzzk-login.css";

/*
 * 치지직 로그인 시작 링크. 기존과 같은 /api/auth/chzzk로 이동한다 (OAuth 흐름은 그대로).
 * 누르는 순간 화면 전체에 "로그인 중입니다" 로딩을 덮어, 치지직으로 넘어가기 전 대기 시간에 상태를 알려 준다.
 */
export default function ChzzkLoginLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 치지직 화면에서 뒤로 가기로 돌아오면 브라우저가 이전 화면(로딩이 켜진 상태)을 그대로 복원할 수 있다 → 끈다
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return (
    <>
      <a
        href="/api/auth/chzzk"
        className={className}
        aria-disabled={loading || undefined}
        onClick={(e) => {
          // 이미 이동 중이면 중복 요청(새 state 발급)을 막는다
          if (loading) {
            e.preventDefault();
            return;
          }
          setLoading(true);
        }}
      >
        {children}
      </a>

      {loading && (
        <div className="chzzk-login-loading" role="status" aria-live="polite">
          <div className="chzzk-login-box">
            <span className="chzzk-login-spinner" aria-hidden="true" />
            <p className="chzzk-login-title">로그인 중입니다</p>
            <p className="chzzk-login-sub">치지직 계정을 확인하고 있습니다</p>
          </div>
        </div>
      )}
    </>
  );
}
