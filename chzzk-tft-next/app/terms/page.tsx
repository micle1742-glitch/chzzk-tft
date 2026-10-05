import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../components/LegalFooter";
import SiteNav from "../components/SiteNav";
import "../legal.css";

export const metadata: Metadata = {
  title: "이용약관 | TIERON",
  description: "TIERON(BETA) 서비스 이용약관",
};

/*
 * 이용약관. 현재 실제로 제공하는 기능(치지직 로그인·세션, Riot API 기반 TFT·LoL 랭크 조회)만 기준으로 쓴다.
 * 준비 중인 기능(Riot 계정 소유권 인증, 인증 카드, 랭킹, 커뮤니티 글쓰기 등)은 제공하는 것처럼 쓰지 않는다.
 */
export default function TermsPage() {
  return (
    <div className="lg-page">
      <SiteNav />

      <main className="lg-doc">
        <p className="lg-eyebrow">TERMS OF SERVICE</p>
        <h1>이용약관</h1>
        <p className="lg-meta">시행일: 2026년 10월 5일</p>

        <p className="lg-notice">
          TIERON은 현재 <strong>BETA(시험 운영)</strong> 단계의 서비스입니다. 기능과 화면, 이 약관의 내용은
          서비스를 다듬는 과정에서 바뀔 수 있습니다.
        </p>

        <h2>제1조 (목적)</h2>
        <p>
          이 약관은 TIERON(이하 &ldquo;서비스&rdquo;)을 이용할 때 서비스와 이용자 사이의 기본적인 이용 조건과
          절차를 안내하기 위한 것입니다.
        </p>

        <h2>제2조 (서비스 내용)</h2>
        <p>현재 서비스가 실제로 제공하는 기능은 다음과 같습니다.</p>
        <ul>
          <li>
            <strong>치지직 계정 로그인:</strong> 치지직(NAVER) 계정으로 로그인하고, 로그인 상태를 유지합니다.
          </li>
          <li>
            <strong>Riot 랭크 조회:</strong> Riot ID(게임 이름#태그)를 입력하면 Riot Games API를 통해 해당 계정의
            TFT·League of Legends 일반 랭크 정보(티어, 랭크, LP, 승/패)를 조회해 화면에 보여 줍니다. 로그인하지
            않아도 이용할 수 있습니다.
          </li>
        </ul>
        <p>
          아래 기능은 <strong>아직 제공하지 않으며 준비 중</strong>입니다. 화면에 해당 메뉴나 안내가 보이더라도
          실제로 동작하지 않습니다.
        </p>
        <ul>
          <li>Riot 계정 연결 및 계정 소유권 인증, 인증 배지·인증 카드</li>
          <li>랭킹, 커뮤니티 글쓰기·댓글 (현재 화면의 목록은 예시 데이터입니다)</li>
          <li>그 밖에 &ldquo;준비 중&rdquo;으로 표시된 기능</li>
        </ul>

        <h2>제3조 (회원 가입과 계정)</h2>
        <ol>
          <li>
            별도의 회원가입 절차는 없으며, 치지직 계정으로 처음 로그인할 때 TIERON 계정이 자동으로 만들어집니다.
          </li>
          <li>
            로그인에 필요한 정보와 그 처리 방법은{" "}
            <Link href="/privacy">개인정보처리방침</Link>에서 확인할 수 있습니다.
          </li>
          <li>
            이용자는 자신의 치지직 계정을 직접 관리해야 하며, 다른 사람의 계정으로 로그인해서는 안 됩니다.
          </li>
        </ol>

        <h2>제4조 (조회 결과에 관한 안내)</h2>
        <ol>
          <li>
            랭크 조회 결과는 Riot Games API가 제공하는 정보를 그대로 보여 주는 것이며, 서비스가 값을 만들거나
            바꾸지 않습니다. Riot Games 측의 반영 시점이나 장애에 따라 실제 게임 내 정보와 다르거나 조회가
            실패할 수 있습니다.
          </li>
          <li>
            Riot ID만 알면 누구의 계정이든 조회할 수 있으므로, <strong>조회 결과는 계정 소유를 증명하지
            않습니다.</strong> 조회 화면의 결과를 &ldquo;인증&rdquo;으로 사용하거나 안내해서는 안 됩니다.
          </li>
          <li>조회 결과는 서비스에 저장되지 않으며, 새로고침하면 사라집니다.</li>
        </ol>

        <h2>제5조 (이용자가 지켜야 할 사항)</h2>
        <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul>
          <li>다른 사람의 계정이나 정보를 도용하거나, 다른 사람을 사칭하는 행위</li>
          <li>
            자동화된 프로그램 등으로 조회를 반복해 서비스나 Riot Games API에 과도한 부담을 주는 행위
          </li>
          <li>서비스의 정상적인 운영을 방해하거나, 허가 없이 시스템에 접근하려는 행위</li>
          <li>관련 법령이나 Riot Games·치지직의 이용 정책을 위반하는 행위</li>
        </ul>
        <p>위와 같은 행위가 확인되면 서비스 이용이 제한될 수 있습니다.</p>

        <h2>제6조 (서비스의 변경·중단)</h2>
        <ol>
          <li>
            BETA 단계에서는 기능 개선, 점검, 외부 서비스(치지직, Riot Games API 등)의 정책 변경이나 장애 등의
            사유로 서비스의 일부 또는 전부가 예고 없이 변경되거나 중단될 수 있습니다.
          </li>
          <li>
            서비스 구조가 바뀌는 과정에서 로그인 상태가 해제되어 다시 로그인해야 할 수 있습니다.
          </li>
        </ol>

        <h2>제7조 (책임의 범위)</h2>
        <p>
          서비스는 BETA 단계에서 무료로 제공되며, 외부 서비스가 제공하는 정보의 정확성이나 외부 서비스의 장애로
          인한 문제에 대해서는 관련 법령이 허용하는 범위에서 책임이 제한될 수 있습니다. 다만 서비스의 고의 또는
          중대한 과실로 인한 손해는 그러하지 않습니다.
        </p>

        <h2>제8조 (권리 관계와 Riot Games 관련 고지)</h2>
        <ol>
          <li>
            TIERON의 화면 디자인과 서비스 자체에 대한 권리는 서비스 운영자에게 있습니다.
          </li>
          <li>
            조회되는 게임 데이터와 게임 관련 명칭·상표에 대한 권리는 각 권리자(Riot Games 등)에게 있습니다.
            TIERON은 Riot Games 및 치지직(NAVER)의 공식 서비스가 아닙니다.
          </li>
          <li>
            Riot Games 관련 공식 고지 문구는 아래와 같습니다.
            <p lang="en">
              {"TIERON isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc."}
            </p>
          </li>
        </ol>

        <h2>제9조 (약관의 변경)</h2>
        <p>
          서비스 내용이 바뀌거나 필요한 경우 이 약관을 변경할 수 있으며, 변경 내용과 시행일은 이 페이지에
          안내합니다.
        </p>

        <h2>문의</h2>
        <p>
          서비스 이용 관련 문의:{" "}
          <a href="mailto:project.contact.kr@gmail.com">project.contact.kr@gmail.com</a>
        </p>
      </main>

      <LegalFooter current="terms" />
    </div>
  );
}
