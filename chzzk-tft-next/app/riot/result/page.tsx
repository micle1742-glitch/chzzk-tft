import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteNav from "../../components/SiteNav";
import RiotClient from "../RiotClient";

export const metadata: Metadata = {
  title: "전적 조회 결과 | TIERON",
  description: "Riot ID로 조회한 TFT·LoL 랭크와 TFT 최근 랭크 전적 분석",
};

const first = (v: string | string[] | undefined) => (typeof v === "string" ? v : Array.isArray(v) ? v[0] ?? "" : "");

// /riot/result?name=게임이름&tag=태그 — 조회 결과 화면 (소유권 인증 아님)
// Riot ID가 없으면 검색 화면으로 보낸다. 형식 검증은 기존 API(/api/search)가 그대로 한다
export default async function RiotResultPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string | string[]; tag?: string | string[] }>;
}) {
  const params = await searchParams;
  const name = first(params.name);
  const tag = first(params.tag);
  if (!name || !tag) redirect("/riot");

  return (
    <div className="sn-shell">
      <SiteNav />
      <div className="sn-shell-main">
        {/* Riot ID가 바뀌면 key가 달라져 화면을 새로 마운트한다 → 이전 조회 상태가 섞이지 않는다 */}
        <RiotClient key={`${name}#${tag}`} initialName={name} initialTag={tag} />
      </div>
    </div>
  );
}
