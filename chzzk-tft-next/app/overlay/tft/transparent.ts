// 투명 배경: 전역 CSS(globals.css)가 body를 흰색으로 칠하므로 오버레이 화면에서만 지운다.
// 서버 HTML에 바로 들어가는 <style>이라 :has()·스크립트 없이, 첫 화면부터 적용된다 (구형 OBS Chromium 포함).
// 오버레이 페이지(/overlay/tft, /overlay/tft/[token])에서만 렌더링되므로 다른 페이지 배경에는 영향이 없다.
export const TRANSPARENT_PAGE_CSS = "html,body{background:transparent!important;background-color:transparent!important}";
