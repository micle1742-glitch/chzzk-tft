import SiteNav from "../components/SiteNav";
import { getSession } from "../lib/session";
import HomeClient from "./HomeClient";

// 공통 NAV(서버에서 로그인 상태 확인) + 기존 /home 본문
export default async function HomePage() {
  // 히어로 CTA를 로그인 상태에 맞추려고 같은 getSession()을 쓴다 (요청당 한 번만 조회되도록 캐시됨)
  const session = await getSession();

  return (
    <>
      <SiteNav />
      <HomeClient loggedIn={session !== null} />
    </>
  );
}
