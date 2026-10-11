import type { Metadata } from "next";
import SiteNav from "../../components/SiteNav";
import OverlaySettings from "./OverlaySettings";
import "./settings.css";

export const metadata: Metadata = {
  title: "OBS 오버레이 설정 | TIERON",
  description: "TFT 티어 오버레이의 테마를 고르고 OBS에 넣을 주소를 복사합니다.",
};

// 스트리머용 OBS 오버레이 설정: Riot ID 확인 → 테마 선택 → 미리보기 → 주소 복사 → OBS 적용 안내
// 오버레이 자체는 /overlay/tft. 이 페이지는 일반 TIERON 화면(어두운 배경)이고 투명 처리는 하지 않는다
export default function OverlaySettingsPage() {
  return (
    <div className="os-page">
      <SiteNav />
      <main className="os-main">
        <OverlaySettings />
      </main>
    </div>
  );
}
