import Link from "next/link";
import SiteNav from "../components/SiteNav";
import { getSession } from "../lib/session";
import "./verify.css";

/*
 * Riot 계정 인증(소유권 확인) 시작 화면 — UI 프로토타입.
 * /riot(티어 조회)은 Riot ID만 알면 누구 계정이든 조회되지만, 여기는 "내 계정"임을 확인하는 곳이다.
 * 실제 확인 방식(RSO 등)은 미확정이라 연결 버튼은 준비 중 상태로 둔다 (HANDOFF 5·8번).
 * 이 화면에서는 인증 완료/VERIFIED 표시를 쓰지 않는다.
 */
export default async function VerifyPage() {
  // 로그인 여부는 서버의 getSession()으로만 판단한다 (강제 리다이렉트는 아직 없음)
  const session = await getSession();

  return (
    <div className="sn-shell vf-page">
      <SiteNav />
      <div className="sn-shell-main">
        <div className="vf-container">
          <div className="vf-card">
            <div className="vf-brand">
              TIER<span>ON</span>
            </div>

            <p className="vf-eyebrow">ACCOUNT VERIFICATION</p>
            <h1 className="vf-title">Riot 계정 인증</h1>
            <p className="vf-desc">
              TIERON에서 내 Riot 계정의 소유권을 확인합니다.
            </p>

            {session ? (
              <>
                {/* 진행 단계: 현재 완료된 것은 치지직 로그인뿐 */}
                <ol className="vf-steps" aria-label="인증 진행 단계">
                  <li className="vf-step done">
                    <span className="vf-step-mark" aria-hidden="true">✓</span>
                    <div>
                      <strong>치지직 로그인</strong>
                      <small>{session.nickname}</small>
                    </div>
                  </li>
                  <li className="vf-step">
                    <span className="vf-step-mark" aria-hidden="true">2</span>
                    <div>
                      <strong>Riot 계정 연결</strong>
                      <small>연결 대기 중</small>
                    </div>
                  </li>
                  <li className="vf-step">
                    <span className="vf-step-mark" aria-hidden="true">3</span>
                    <div>
                      <strong>소유권 확인</strong>
                      <small>준비 중</small>
                    </div>
                  </li>
                </ol>

                {/* 실제 Riot 인증을 호출하지 않는다. 기능이 붙기 전까지 비활성 */}
                <button type="button" className="vf-primary" disabled>
                  Riot 계정 연결하기
                  <span className="vf-badge">준비 중</span>
                </button>
                <p className="vf-notice" role="note">
                  Riot 공식 계정 연동(RSO)을 준비하고 있습니다. 지금은 계정을 연결할 수 없습니다.
                </p>
              </>
            ) : (
              <>
                {/* 로그인 안 한 상태: 인증은 로그인한 사용자만 시작할 수 있다 */}
                <div className="vf-login-required" role="status">
                  <strong>로그인이 필요합니다</strong>
                  <p>Riot 계정 인증은 치지직으로 로그인한 뒤 시작할 수 있습니다.</p>
                </div>
                <Link href="/login" className="vf-primary">
                  로그인하러 가기
                </Link>
              </>
            )}

            <ul className="vf-guide">
              <li>Riot 계정 연결 후 LoL과 TFT의 랭크 정보를 확인할 수 있습니다.</li>
              <li>Riot ID를 입력하는 단순 조회와 실제 계정 소유권 인증은 다릅니다.</li>
              <li>인증이 완료되면 이후에는 매번 다시 인증하지 않습니다.</li>
            </ul>

            {/* 조회와 인증의 차이를 분명히: 조회는 로그인 없이 /riot에서 */}
            <Link href="/riot" className="vf-sub-link">
              Riot ID로 티어만 조회하려면 → Riot 티어 조회
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
