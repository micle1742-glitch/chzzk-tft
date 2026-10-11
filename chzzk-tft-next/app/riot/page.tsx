import SiteNav from "../components/SiteNav";
import RiotSearch from "./RiotSearch";

const first = (v: string | string[] | undefined) => (typeof v === "string" ? v : Array.isArray(v) ? v[0] ?? "" : "");

// 공통 NAV(서버에서 로그인 상태 확인) + Riot 전적 검색 화면 (소유권 인증 아님).
// 조회 결과는 /riot/result에서 보여 준다. ?name=&tag=가 있으면 입력칸을 채운다 (결과 화면의 "다시 전적 검색")
// tier.css가 body를 가운데 정렬하므로 sn-shell로 NAV는 위, 본문은 가운데에 둔다.
export default async function RiotPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string | string[]; tag?: string | string[] }>;
}) {
  const params = await searchParams;
  return (
    <div className="sn-shell">
      <SiteNav />
      <div className="sn-shell-main">
        <RiotSearch initialName={first(params.name)} initialTag={first(params.tag)} />
      </div>
    </div>
  );
}
