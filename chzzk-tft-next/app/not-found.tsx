import Link from "next/link";
import BackButton from "./components/BackButton";
import SiteNav from "./components/SiteNav";
import "./not-found.css";

// 존재하지 않는 주소 전체를 처리하는 404 화면 (시안: docs/design/07-404.png)
export default function NotFound() {
  return (
    <div className="nf-page">
      <SiteNav />

      <main className="nf-main">
        <div className="nf-code" aria-hidden="true">
          {/* 장식: 짧은 사선과 점 몇 개만 */}
          <span className="nf-line nf-line-1" />
          <span className="nf-line nf-line-2" />
          <span className="nf-dot nf-dot-1" />
          <span className="nf-dot nf-dot-2" />
          <span className="nf-dot nf-dot-3" />
          <span className="nf-digit">4</span>
          <span className="nf-digit nf-digit-zero">0</span>
          <span className="nf-digit nf-digit-last">4</span>
        </div>

        <h1 className="nf-title">페이지를 찾을 수 없습니다.</h1>
        <p className="nf-desc">
          요청하신 페이지가 존재하지 않거나, 이동되었을 수 있습니다.
        </p>

        <div className="nf-actions">
          <Link href="/" className="nf-btn nf-btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3L12 3z" />
            </svg>
            홈으로 이동하기
          </Link>
          <BackButton className="nf-btn nf-btn-ghost" />
        </div>
      </main>

      <div className="nf-footer" role="contentinfo">
        <div className="nf-footer-inner">
          <div className="nf-footer-brand">
            <span className="nf-footer-logo">
              TIER<span>ON</span>
            </span>
            <span className="nf-footer-text">
              TFT 티어 인증과 커뮤니티를 위한 TIERON
            </span>
          </div>
          <span className="nf-footer-text">
            이용약관 · 개인정보처리방침 · 문의하기 (준비 중)
          </span>
        </div>
      </div>
    </div>
  );
}
