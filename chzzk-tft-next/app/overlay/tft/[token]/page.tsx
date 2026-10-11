import type { Metadata } from "next";
import { isOverlaySecretFormat } from "../../../lib/overlay-token";
import OverlayCard from "../OverlayCard";
import TokenOverlay from "../TokenOverlay";
import { TRANSPARENT_PAGE_CSS } from "../transparent";

// OBS Browser Source 전용 화면 (비밀 주소). 검색 엔진에 노출하지 않고, 다른 곳으로 주소(토큰)를 Referer로 보내지 않는다
export const metadata: Metadata = {
  title: "TFT 티어 오버레이 | TIERON",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const first = (v: string | string[] | undefined) => (typeof v === "string" ? v : Array.isArray(v) ? v[0] ?? "" : "");

/*
 * /overlay/tft/<토큰>[?theme=dark|light] — 설정 페이지에서 발급한 비밀 주소 (Riot ID가 주소에 없음)
 * - 토큰 형식만 여기서 확인하고(틀리면 DB·API 호출 없이 안내), 실제 확인은 /api/overlay/data가 한다
 * - 재발급·삭제된 토큰은 API가 404 → TokenOverlay가 안내만 표시
 * - Riot ID 조회 정보일 뿐 계정 소유권 인증이 아니다 → "인증" 표시를 하지 않는다 (RSO 승인 전)
 */
export default async function TokenOverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ theme?: string | string[] }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const theme = first(query.theme) === "light" ? "light" : "dark";
  return (
    <>
      <style>{TRANSPARENT_PAGE_CSS}</style>
      {isOverlaySecretFormat(token) ? (
        <TokenOverlay token={token} theme={theme} />
      ) : (
        <OverlayCard
          view={{ kind: "error", message: "사용할 수 없는 오버레이 주소입니다. 설정 페이지에서 새 주소를 확인해 주세요." }}
          theme={theme}
        />
      )}
    </>
  );
}
