import SiteNav from "../components/SiteNav";
import HomeClient from "./HomeClient";

// 공통 NAV(서버에서 로그인 상태 확인) + 기존 /home 본문
export default function HomePage() {
  return (
    <>
      <SiteNav />
      <HomeClient />
    </>
  );
}
