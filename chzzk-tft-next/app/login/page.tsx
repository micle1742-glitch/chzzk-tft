"use client";
import Link from "next/link";
import "./login.css";

export default function LoginPage() {
  return (
    <div>
      <div className="login-bg-glow glow-1"></div>
      <div className="login-bg-glow glow-2"></div>

      <div className="login-container">

        <Link href="/" className="back-home-link">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          홈으로 돌아가기
        </Link>

        <div className="login-card">

          {/* 로고 및 안내 */}
          <div className="login-header">
            <Link href="/" className="login-logo-area">
              <h1 className="login-logo">
                TIER<span>ON</span>
              </h1>
              <span className="beta-badge">BETA</span>
            </Link>

            <h2>환영합니다!</h2>
            <p>
              소셜 계정으로 간편하게 시작하고 티어를 인증하세요.
            </p>
          </div>

          {/* 소셜 로그인 목록 */}
          <div className="login-buttons">

            {/* 치지직 */}
            <a
              href="/api/auth/chzzk"
              className="social-login-btn chzzk-btn"
            >
              <div className="btn-icon chzzk-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                </svg>
              </div>

              <span className="btn-text">
                치지직으로 시작하기
              </span>

              <span className="btn-badge primary">
                연동 가능
              </span>
            </a>

            {/* Google */}
            <button
              type="button"
              className="social-login-btn disabled"
              disabled
            >
              <div className="btn-icon google-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3s.7 5.6 1.9 8l3.7-2.9c0-.6 0-1.2 0-1.6z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                  />
                </svg>
              </div>

              <span className="btn-text">
                Google로 시작하기
              </span>

              <span className="btn-badge lock-badge">
                준비 중
              </span>
            </button>

            {/* 카카오 */}
            <button
              type="button"
              className="social-login-btn disabled"
              disabled
            >
              <div className="btn-icon kakao-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7-.2.7-.8 2.8-.9 3.2 0 .2.1.3.2.3.1 0 .3 0 .4-.1 1.7-1.2 3.9-2.7 4.5-3.1.4.1.7.1 1.1.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
                </svg>
              </div>

              <span className="btn-text">
                카카오로 시작하기
              </span>

              <span className="btn-badge lock-badge">
                준비 중
              </span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              className="social-login-btn disabled"
              disabled
            >
              <div className="btn-icon facebook-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>

              <span className="btn-text">
                Facebook으로 시작하기
              </span>

              <span className="btn-badge lock-badge">
                준비 중
              </span>
            </button>

          </div>

          {/* 약관 안내 */}
          <div className="login-footer-notice">
            <p>
              로그인 시 TIERON의{" "}
              <a href="#">이용약관</a> 및{" "}
              <a href="#">개인정보처리방침</a>에 동의하게 됩니다.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}