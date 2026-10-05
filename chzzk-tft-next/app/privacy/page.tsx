import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../components/LegalFooter";
import SiteNav from "../components/SiteNav";
import "../legal.css";

export const metadata: Metadata = {
  title: "개인정보처리방침 | TIERON",
  description: "TIERON(BETA) 개인정보처리방침",
};

/*
 * 개인정보처리방침. 코드에서 실제로 처리하는 범위만 적는다.
 * - 치지직 로그인: channelId·닉네임만 받음, 접근 토큰은 1회 조회 후 저장 안 함 (api/auth/chzzk/callback)
 * - DB users: chzzk_id, display_name, is_public, created_at, last_login_at / sessions: 토큰 SHA-256 해시, 만료 7일
 * - 쿠키: tieron_session(7일), chzzk_oauth_state(10분) / localStorage·분석 도구 없음
 * - Riot 조회(api/search): Riot ID를 Riot API에 전달, 결과는 저장하지 않음
 * Riot 계정 DB 저장(riot_accounts)은 아직 사용하지 않으므로 쓰지 않는다.
 */
export default function PrivacyPage() {
  return (
    <div className="lg-page">
      <SiteNav />

      <main className="lg-doc">
        <p className="lg-eyebrow">PRIVACY POLICY</p>
        <h1>개인정보처리방침</h1>
        <p className="lg-meta">시행일: 2026년 10월 5일</p>

        <p className="lg-notice">
          TIERON은 현재 <strong>BETA(시험 운영)</strong> 단계입니다. 이 방침은 지금 실제로 제공하는 기능(치지직
          로그인, Riot 랭크 조회)을 기준으로 작성했으며, 기능이 추가되면 처리하는 정보와 함께 이 페이지를
          갱신합니다.
        </p>

        <h2>1. 처리하는 정보</h2>
        <p>
          <strong>치지직 계정으로 로그인할 때</strong> 치지직(NAVER)으로부터 다음 정보를 받아 저장합니다.
        </p>
        <div className="lg-table-wrap">
          <table>
            <thead>
              <tr>
                <th>항목</th>
                <th>내용</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>치지직 채널 ID</td>
                <td>같은 치지직 계정인지 구분하기 위한 식별값</td>
              </tr>
              <tr>
                <td>치지직 닉네임</td>
                <td>화면에 로그인한 사용자 이름으로 표시 (로그인할 때마다 최신 값으로 갱신)</td>
              </tr>
              <tr>
                <td>가입·로그인 일시</td>
                <td>처음 로그인한 일시, 마지막으로 로그인한 일시</td>
              </tr>
              <tr>
                <td>로그인 세션 정보</td>
                <td>로그인 유지용 세션 값(원래 값이 아닌 변환된 값만 저장)과 만료 시각</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul>
          <li>
            이메일, 전화번호, 비밀번호 등은 <strong>받지 않습니다.</strong>
          </li>
          <li>
            로그인 과정에서 치지직이 발급하는 접근 토큰은 위 정보를 한 번 조회하는 데에만 사용하고 저장하지
            않습니다.
          </li>
        </ul>
        <p>
          <strong>Riot 랭크 조회를 이용할 때</strong> 입력한 Riot ID(게임 이름#태그)를 Riot Games API에 전달해
          조회합니다. 조회한 Riot ID와 결과(티어, 랭크, LP, 승/패 등)는 <strong>저장하지 않으며</strong>, 화면에만
          표시됩니다. 이 기능은 로그인하지 않아도 이용할 수 있습니다.
        </p>
        <p>
          Riot 계정 연결·소유권 인증 기능은 아직 제공하지 않으므로, 현재 Riot 계정 정보를 이용자 계정과 연결해
          저장하지 않습니다.
        </p>

        <h2>2. 이용 목적</h2>
        <ul>
          <li>로그인과 로그인 상태 유지, 같은 이용자인지 확인</li>
          <li>화면에 로그인한 사용자의 닉네임 표시</li>
          <li>로그인 요청 위조 방지 등 서비스 보안</li>
          <li>Riot 랭크 조회 결과 제공</li>
        </ul>

        <h2>3. 보관 기간</h2>
        <ul>
          <li>
            <strong>계정 정보</strong>(채널 ID, 닉네임, 가입·로그인 일시): 계정 삭제를 요청할 때까지 보관하고,
            요청 시 지체 없이 삭제합니다.
          </li>
          <li>
            <strong>로그인 세션</strong>: 최대 7일간 유효합니다. 로그아웃하면 해당 세션은 즉시 삭제되며, 만료된
            세션은 로그인에 사용되지 않습니다.
          </li>
          <li>
            <strong>Riot 조회 정보</strong>: 저장하지 않습니다.
          </li>
          <li>
            서비스 오류를 확인하기 위해 서버 운영 기록(로그)에 오류 정보가 일시적으로 남을 수 있습니다.
          </li>
        </ul>

        <h2>4. 쿠키 사용</h2>
        <p>로그인에 꼭 필요한 쿠키만 사용하며, 광고·방문 분석용 쿠키는 사용하지 않습니다.</p>
        <div className="lg-table-wrap">
          <table>
            <thead>
              <tr>
                <th>쿠키</th>
                <th>용도</th>
                <th>유지 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>tieron_session</code>
                </td>
                <td>로그인 상태 유지 (자바스크립트에서 읽을 수 없는 HttpOnly 쿠키)</td>
                <td>최대 7일, 로그아웃 시 삭제</td>
              </tr>
              <tr>
                <td>
                  <code>chzzk_oauth_state</code>
                </td>
                <td>치지직 로그인 요청이 이 서비스에서 시작된 것인지 확인 (요청 위조 방지)</td>
                <td>10분, 로그인 완료 시 삭제</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          브라우저 설정에서 쿠키를 막으면 로그인 기능을 이용할 수 없지만, Riot 랭크 조회는 이용할 수 있습니다.
        </p>

        <h2>5. 외부 서비스 이용</h2>
        <p>
          서비스 제공을 위해 아래 외부 서비스를 이용합니다. 이용자의 정보를 판매하거나 광고 목적으로 제3자에게
          제공하지 않습니다.
        </p>
        <div className="lg-table-wrap">
          <table>
            <thead>
              <tr>
                <th>서비스</th>
                <th>용도</th>
                <th>전달되는 정보</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>치지직 (NAVER)</td>
                <td>계정 로그인</td>
                <td>로그인 요청 (치지직에서 직접 로그인)</td>
              </tr>
              <tr>
                <td>Riot Games API</td>
                <td>랭크 조회</td>
                <td>조회할 때 입력한 Riot ID</td>
              </tr>
              <tr>
                <td>Supabase</td>
                <td>데이터베이스 (계정·세션 저장)</td>
                <td>1번 표의 정보</td>
              </tr>
              <tr>
                <td>Vercel</td>
                <td>웹사이트 호스팅·서버 실행</td>
                <td>서비스 이용 중 주고받는 요청</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>6. 이용자의 권리</h2>
        <ul>
          <li>이용자는 언제든지 자신의 정보를 확인하거나 삭제를 요청할 수 있습니다.</li>
          <li>
            현재 서비스 화면에는 직접 탈퇴하는 기능이 없으므로, 아래 문의처로 요청하면 확인 후 계정 정보와
            세션을 삭제합니다.
          </li>
          <li>치지직 계정과의 연동 해제는 치지직에서 할 수 있습니다.</li>
        </ul>

        <h2>7. 정보 보호를 위한 조치</h2>
        <ul>
          <li>로그인 세션 값은 원래 값을 저장하지 않고 변환된 값(해시)만 저장합니다.</li>
          <li>로그인 쿠키는 브라우저 스크립트에서 읽을 수 없도록(HttpOnly) 설정합니다.</li>
          <li>데이터베이스는 서버에서만 접근하며, 브라우저에서 직접 접근할 수 없도록 제한합니다.</li>
          <li>API 키 등 비밀 값은 서버에만 두고 화면에 노출하지 않습니다.</li>
        </ul>

        <h2>8. 방침의 변경</h2>
        <p>
          새로운 기능(예: Riot 계정 연결)이 추가되어 처리하는 정보가 달라지면, 기능을 제공하기 전에 이 방침을
          갱신하고 변경 내용과 시행일을 이 페이지에 안내합니다. 서비스 이용 조건은{" "}
          <Link href="/terms">이용약관</Link>에서 확인할 수 있습니다.
        </p>

        <h2>9. 문의처</h2>
        <p>
          개인정보 관련 문의 및 삭제 요청:{" "}
          <a href="mailto:project.contact.kr@gmail.com">project.contact.kr@gmail.com</a>
        </p>
      </main>

      <LegalFooter current="privacy" />
    </div>
  );
}
