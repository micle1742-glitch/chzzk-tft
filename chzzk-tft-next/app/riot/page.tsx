import SiteNav from "../components/SiteNav";
import RiotClient from "./RiotClient";

// 공통 NAV(서버에서 로그인 상태 확인) + 기존 Riot 계정 인증 화면.
// tier.css가 body를 가운데 정렬하므로 sn-shell로 NAV는 위, 본문은 가운데에 둔다.
export default function RiotPage() {
  return (
    <div className="sn-shell">
      <SiteNav />
      <div className="sn-shell-main">
        <RiotClient />
      </div>
    </div>
  );
}
