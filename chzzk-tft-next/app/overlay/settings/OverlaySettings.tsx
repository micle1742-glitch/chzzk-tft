"use client";

import { useRef, useState } from "react";
// 타입만 가져온다 (서버 코드는 번들에 포함되지 않음)
import type { RankedEntry, SearchResponse } from "../../api/search/route";
import OverlayCard, { type OverlayTheme, type OverlayView } from "../tft/OverlayCard";

/*
 * OBS 오버레이 설정 (/overlay/settings)
 * - Riot ID 확인: 기존 /api/search를 "계정 확인" 버튼을 누를 때만 한 번 부른다 (새 API 없음, Riot 키는 서버에만)
 * - 확인에 성공한 Riot ID(공식 표기)로만 오버레이 주소를 만든다. 입력을 바꾸면 다시 확인해야 한다
 * - 주소는 읽기 전용으로 보여 주고 복사 버튼으로만 가져간다 (쿼리를 직접 고치지 않게)
 * - 미리보기는 /overlay/tft와 같은 OverlayCard. 확인 전에는 "예시"임을 분명히 표시한 예시 카드
 * - Riot ID 조회 정보일 뿐 계정 소유권 인증이 아니다 (RSO 승인 전) — 인증 표현을 쓰지 않는다
 */

type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; gameName: string; tagLine: string; ranked: RankedEntry | null; tftError: boolean }
  | { status: "error"; message: string };

const THEMES: { value: OverlayTheme; title: string; desc: string }[] = [
  { value: "dark", title: "다크", desc: "검정 글씨 · 검정 테두리 — 밝은 방송 화면에 추천" },
  { value: "light", title: "라이트", desc: "흰 글씨 · 민트 테두리 — 어두운 방송 화면에 추천" },
];

// 확인 전 미리보기용 예시 (실제 계정·랭크가 아님 — 화면에 "예시"로 표시)
const EXAMPLE_VIEW: OverlayView = {
  kind: "ok",
  gameName: "예시플레이어",
  tagLine: "KR1",
  ranked: { queueType: "RANKED_TFT", tier: "GOLD", rank: "II", leaguePoints: 50 },
};

export default function OverlaySettings() {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [theme, setTheme] = useState<OverlayTheme>("dark");
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });
  const [copyState, setCopyState] = useState<"idle" | "done" | "fail">("idle");
  const urlInput = useRef<HTMLInputElement>(null);

  // 입력을 바꾸면 이전 확인 결과로 만든 주소는 쓰지 않는다
  function changeInput(setter: (v: string) => void, value: string) {
    setter(value);
    if (lookup.status !== "idle" && lookup.status !== "loading") setLookup({ status: "idle" });
    setCopyState("idle");
  }

  async function checkAccount() {
    setCopyState("idle");
    const n = name.trim();
    const t = tag.trim().replace(/^#/, "");
    if (!n || !t) {
      setLookup({ status: "error", message: "게임 이름과 태그를 모두 입력해 주세요." });
      return;
    }
    setLookup({ status: "loading" });
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: n, tagline: t }),
      });
      const data: SearchResponse | { success: false; message: string } = await response.json();
      if (!data.success) {
        setLookup({ status: "error", message: data.message });
        return;
      }
      setLookup({
        status: "ok",
        gameName: data.gameName ?? n,
        tagLine: data.tagLine ?? t,
        ranked: data.tft.status === "ok" ? data.tft.ranked : null,
        tftError: data.tft.status === "error",
      });
    } catch {
      setLookup({ status: "error", message: "계정을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    }
  }

  const ok = lookup.status === "ok" ? lookup : null;
  // 확인된 Riot ID가 있을 때만 주소를 만든다. 앞부분은 지금 접속한 TIERON 주소 (배포·로컬 모두 맞게)
  // 계정 확인은 브라우저에서 버튼을 눌러야 끝나므로 이때는 항상 window가 있다 (서버 렌더링과 어긋나지 않음)
  const origin = ok && typeof window !== "undefined" ? window.location.origin : "";
  const overlayUrl =
    ok && origin
      ? `${origin}/overlay/tft?name=${encodeURIComponent(ok.gameName)}&tag=${encodeURIComponent(ok.tagLine)}&theme=${theme}`
      : "";

  async function copyUrl() {
    if (!overlayUrl) return;
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopyState("done");
    } catch {
      // 클립보드 권한이 없는 환경: 주소 칸을 선택해 복사를 시도한다
      try {
        urlInput.current?.select();
        setCopyState(document.execCommand("copy") ? "done" : "fail");
      } catch {
        setCopyState("fail");
      }
    }
  }

  const previewView: OverlayView = ok
    ? ok.tftError
      ? { kind: "error", message: "TFT 랭크 정보를 불러오지 못했습니다." }
      : { kind: "ok", gameName: ok.gameName, tagLine: ok.tagLine, ranked: ok.ranked }
    : EXAMPLE_VIEW;

  return (
    <div className="os-layout">
      <header className="os-head">
        <p className="os-eyebrow">OBS OVERLAY</p>
        <h1>OBS 오버레이 설정</h1>
        <p className="os-desc">테마를 고르고, 미리보기를 확인한 뒤 주소를 복사해 OBS에 넣으세요.</p>
      </header>

      <div className="os-grid">
        <div className="os-steps">
          {/* 1. Riot ID 확인 */}
          <section className="os-card" aria-labelledby="os-step1">
            <h2 id="os-step1" className="os-step-title">
              <span className="os-step-no">1</span> Riot ID 확인
            </h2>
            <form
              className="os-id-form"
              onSubmit={(e) => {
                e.preventDefault();
                void checkAccount();
              }}
            >
              <div className="os-id-fields">
                <input
                  type="text"
                  aria-label="게임 이름"
                  placeholder="게임 이름"
                  value={name}
                  onChange={(e) => changeInput(setName, e.target.value)}
                  disabled={lookup.status === "loading"}
                />
                <span className="os-hash" aria-hidden="true">#</span>
                <input
                  type="text"
                  aria-label="태그"
                  placeholder="태그"
                  value={tag}
                  onChange={(e) => changeInput(setTag, e.target.value)}
                  disabled={lookup.status === "loading"}
                  className="os-tag"
                />
              </div>
              <button type="submit" className="os-btn os-btn-primary" disabled={lookup.status === "loading"}>
                {lookup.status === "loading" ? (
                  <>
                    <span className="tn-spinner" aria-hidden="true" /> 확인 중
                  </>
                ) : (
                  "계정 확인"
                )}
              </button>
            </form>

            {lookup.status === "idle" && <p className="os-hint">Riot ID를 입력하고 계정 확인을 눌러 주세요.</p>}
            {lookup.status === "error" && (
              <p className="os-error" role="alert">
                {lookup.message}
              </p>
            )}
            {ok && (
              <p className="os-ok">
                <strong>
                  {ok.gameName}#{ok.tagLine}
                </strong>{" "}
                계정을 찾았습니다.
                {ok.tftError && " (지금은 TFT 랭크를 불러오지 못했습니다. 오버레이에도 같은 안내가 표시됩니다.)"}
              </p>
            )}
            <p className="os-note">Riot API로 조회한 공개 정보만 표시합니다. 계정 소유 인증이 아닙니다.</p>
          </section>

          {/* 2. 테마 선택 */}
          <section className="os-card" aria-labelledby="os-step2">
            <h2 id="os-step2" className="os-step-title">
              <span className="os-step-no">2</span> 테마 선택
            </h2>
            <div className="os-themes" role="radiogroup" aria-labelledby="os-step2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={theme === t.value}
                  className={`os-theme${theme === t.value ? " is-active" : ""}`}
                  onClick={() => {
                    setTheme(t.value);
                    setCopyState("idle");
                  }}
                >
                  <strong>{t.title}</strong>
                  <span>{t.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 3. 주소 복사 */}
          <section className="os-card" aria-labelledby="os-step3">
            <h2 id="os-step3" className="os-step-title">
              <span className="os-step-no">3</span> OBS 주소 복사
            </h2>
            {overlayUrl ? (
              <>
                <div className="os-url-row">
                  <input
                    ref={urlInput}
                    type="text"
                    className="os-url"
                    value={overlayUrl}
                    readOnly
                    aria-label="OBS 오버레이 주소"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button type="button" className="os-btn os-btn-primary" onClick={copyUrl}>
                    {copyState === "done" ? "복사됨" : "주소 복사"}
                  </button>
                </div>
                {copyState === "done" && <p className="os-ok">주소를 복사했습니다. OBS에 붙여 넣으세요.</p>}
                {copyState === "fail" && (
                  <p className="os-error" role="alert">
                    자동 복사에 실패했습니다. 주소 칸을 눌러 전체 선택한 뒤 직접 복사해 주세요.
                  </p>
                )}
              </>
            ) : (
              <p className="os-hint">1단계에서 계정을 확인하면 주소가 만들어집니다.</p>
            )}
          </section>

          {/* OBS 적용 안내 */}
          <section className="os-card" aria-labelledby="os-howto">
            <h2 id="os-howto" className="os-step-title">OBS에 넣는 방법</h2>
            <ol className="os-howto">
              <li>
                OBS에서 <b>소스 → + → 브라우저</b>를 선택합니다.
              </li>
              <li>복사한 주소를 <b>URL</b>에 붙여 넣습니다.</li>
              <li>
                <b>너비 520</b>, <b>높이 300</b>으로 설정합니다.
              </li>
              <li>
                <b>확인</b>을 누르면 완료입니다.
              </li>
            </ol>
            <p className="os-note">티어가 바뀌면 소스 속성에서 “현재 페이지 새로 고침”을 누르면 다시 불러옵니다.</p>
          </section>
        </div>

        {/* 미리보기: /overlay/tft와 같은 카드. 카드가 투명하므로 방송 화면처럼 바탕을 깐다 */}
        <aside className="os-preview-col" aria-label="오버레이 미리보기">
          <div className="os-card os-preview-card">
            <div className="os-preview-head">
              <h2 className="os-step-title">미리보기</h2>
              {!ok && <span className="os-example-badge">예시</span>}
            </div>
            <div className={`os-preview os-preview-${theme}`}>
              <OverlayCard view={previewView} theme={theme} as="div" />
            </div>
            <p className="os-note">
              {ok
                ? "실제 오버레이와 같은 카드입니다. 배경은 방송 화면 예시입니다."
                : "예시 화면입니다 — 실제 계정·랭크 정보가 아닙니다. 계정을 확인하면 실제 정보로 바뀝니다."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
