import Link from "next/link";

// /terms·/privacy·/mypage 하단: 두 문서와 홈으로 이동 + Riot Games 공식 고지 문구(정책 문구 그대로 — 임의 수정 금지)
// current: 지금 보고 있는 문서 표시 (문서 페이지가 아니면 생략)
export default function LegalFooter({ current }: { current?: "terms" | "privacy" }) {
  return (
    <div className="lg-footer" role="contentinfo">
      <div className="lg-footer-inner">
        <ul className="lg-footer-links">
          <li>
            <Link href="/terms" aria-current={current === "terms" ? "page" : undefined}>
              이용약관
            </Link>
          </li>
          <li>
            <Link href="/privacy" aria-current={current === "privacy" ? "page" : undefined}>
              개인정보처리방침
            </Link>
          </li>
          <li>
            <Link href="/home">홈으로</Link>
          </li>
        </ul>
        <p className="lg-footer-legal" lang="en">
          {"TIERON isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc."}
        </p>
      </div>
    </div>
  );
}
