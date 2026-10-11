import type { Metadata } from "next";
import TftOverlay from "./TftOverlay";
import { TRANSPARENT_PAGE_CSS } from "./transparent";

// OBS Browser Source 전용 화면 — NAV·배경 없이 카드만. 검색 엔진에는 노출하지 않는다
export const metadata: Metadata = {
  title: "TFT 티어 오버레이 | TIERON",
  robots: { index: false, follow: false },
};

const first = (v: string | string[] | undefined) => (typeof v === "string" ? v : Array.isArray(v) ? v[0] ?? "" : "");

/*
 * /overlay/tft?name=게임이름&tag=태그[&theme=dark|light]
 * - theme: 방송 화면 밝기에 맞춰 스트리머가 고른다. light만 화이트 테마, 없거나 다른 값이면 dark (기본)
 * - 조회: /api/search(티어) + /api/tft/matches mode "today"(오늘 순위), 열 때 한 번 + 3분마다 (TftOverlay)
 * - Riot ID가 주소에 드러나지 않는 비밀 주소는 /overlay/tft/[token] (설정 페이지에서 발급)
 * - Riot ID 조회 정보일 뿐 계정 소유권 인증이 아니다 → "인증" 표시를 하지 않는다 (RSO 승인 전)
 */
export default async function TftOverlayPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string | string[]; tag?: string | string[]; theme?: string | string[] }>;
}) {
  const params = await searchParams;
  // 정해진 두 값만 허용 (그 밖의 값은 무시하고 기본 dark)
  const theme = first(params.theme) === "light" ? "light" : "dark";
  return (
    <>
      <style>{TRANSPARENT_PAGE_CSS}</style>
      <TftOverlay name={first(params.name)} tag={first(params.tag)} theme={theme} />
    </>
  );
}
