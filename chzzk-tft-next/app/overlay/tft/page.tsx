import type { Metadata } from "next";
import TftOverlay from "./TftOverlay";

// OBS Browser Source 전용 화면 — NAV·배경 없이 카드만. 검색 엔진에는 노출하지 않는다
export const metadata: Metadata = {
  title: "TFT 티어 오버레이 | TIERON",
  robots: { index: false, follow: false },
};

const first = (v: string | string[] | undefined) => (typeof v === "string" ? v : Array.isArray(v) ? v[0] ?? "" : "");

// 투명 배경: 전역 CSS(globals.css)가 body를 흰색으로 칠하므로 이 화면에서만 지운다.
// 서버 HTML에 바로 들어가는 <style>이라 :has()·스크립트 없이, 첫 화면부터 적용된다 (구형 OBS Chromium 포함).
// 이 페이지에서만 렌더링되므로 다른 페이지 배경에는 영향이 없다.
const TRANSPARENT_PAGE_CSS = "html,body{background:transparent!important;background-color:transparent!important}";

/*
 * /overlay/tft?name=게임이름&tag=태그[&theme=dark|light]
 * - theme: 방송 화면 밝기에 맞춰 스트리머가 고른다. light만 화이트 테마, 없거나 다른 값이면 dark (기본)
 * - 조회는 기존 /api/search를 화면을 열 때 한 번만 부른다 (자동 갱신 없음 — OBS에서 소스를 새로고침하면 다시 조회)
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
