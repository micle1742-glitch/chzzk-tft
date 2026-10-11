"use client";

import { useState } from "react";
// 타입만 가져온다 (서버 코드는 번들에 포함되지 않음)
import type { RankedEntry, SearchResponse } from "../../api/search/route";
import OverlayCard, { type OverlayTheme, type OverlayToday, type OverlayView } from "../tft/OverlayCard";
import ChzzkLoginLink from "../../components/ChzzkLoginLink";
import SecretOverlayPanel from "./SecretOverlayPanel";

/*
 * OBS 오버레이 설정 (/overlay/settings)
 * 1. Riot 계정 조회: 기존 /api/search를 "계정 확인" 버튼을 누를 때만 한 번 부른다 (Riot 키는 서버에만)
 * 2. 티어 카드 확인: 조회한 Riot ID·티어·LP — 오버레이 카드에 그대로 들어가는 값
 * 3. 미리보기 및 사용: 테마 선택 + 미리보기(오른쪽, 모바일은 위) + OBS에 넣는 방법
 * 4. 비밀 주소 발급·재발급·삭제 (SecretOverlayPanel, /api/overlay/*) — OBS에 넣는 주소는 이것 하나
 *    (예전의 Riot ID가 들어간 주소 /overlay/tft?name=&tag=는 화면에서 안내하지 않지만, 이미 쓰는 사람을 위해 계속 동작한다)
 * - 치지직 로그인: 1단계 제목 옆에 로그인 버튼(로그인 후 이 페이지로 복귀) 또는 로그인 상태. 4단계 발급·관리에만 필요
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
// 예시 오늘 순위 (최신이 왼쪽). 실제 계정 확인 후에는 미리보기에서 조회하지 않는다 (요청 절약 — 실제 오버레이에서만 표시)
const EXAMPLE_TODAY: OverlayToday = { status: "ok", placements: [8, 1, 2, 3, 8, 4], complete: true };

const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);
function tierText(ok: { ranked: RankedEntry | null; tftError: boolean }): string {
  if (ok.tftError) return "지금은 불러오지 못했습니다 (오버레이에도 같은 안내가 표시됩니다)";
  if (!ok.ranked) return "현재 시즌 랭크 기록 없음";
  const { tier = "", rank, leaguePoints } = ok.ranked;
  const division = rank && !APEX_TIERS.has(tier) ? ` ${rank}` : "";
  return `${tier}${division}${typeof leaguePoints === "number" ? ` · ${leaguePoints} LP` : ""}`;
}

export default function OverlaySettings({
  // 로그인한 치지직 닉네임 (로그인 안 했으면 null) — 서버의 getSession() 결과
  chzzkName,
}: {
  chzzkName: string | null;
}) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [theme, setTheme] = useState<OverlayTheme>("dark");
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });
  // 입력을 바꾸면 이전 확인 결과는 쓰지 않는다 (다시 확인해야 발급할 수 있음)
  function changeInput(setter: (v: string) => void, value: string) {
    setter(value);
    if (lookup.status !== "idle" && lookup.status !== "loading") setLookup({ status: "idle" });
  }

  async function checkAccount() {
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
        <p className="os-desc">Riot 계정을 조회하고, 카드와 테마를 확인한 뒤 비밀 주소를 발급해 OBS에 넣으세요.</p>
      </header>

      <div className="os-grid">
        <div className="os-steps">
          {/* 1. Riot ID 확인 */}
          <section className="os-card" aria-labelledby="os-step1">
            <div className="os-step-head">
              <h2 id="os-step1" className="os-step-title">
                <span className="os-step-no">1</span> Riot 계정 조회
              </h2>
              {chzzkName ? (
                <p className="os-login-state">
                  <span className="os-login-dot" aria-hidden="true" />
                  치지직 <strong>{chzzkName}</strong> 로그인됨
                </p>
              ) : (
                <div className="os-login">
                  <div className="os-login-row">
                    <ChzzkLoginLink className="os-btn os-btn-ghost os-login-btn" next="/overlay/settings">
                      치지직 로그인하기
                    </ChzzkLoginLink>
                    <span className="os-login-star" aria-hidden="true">
                      *
                    </span>
                  </div>
                  <p className="os-login-note">
                    <span className="os-login-star">*</span> 오버레이 URL 발급 및 관리에 필요합니다.
                  </p>
                </div>
              )}
            </div>
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
            {ok && <p className="os-ok">계정을 찾았습니다. 2단계에서 카드에 들어갈 정보를 확인하세요.</p>}
            <p className="os-note">Riot API로 조회한 공개 정보만 표시합니다. 계정 소유 인증이 아닙니다.</p>
          </section>

          {/* 2. 티어 카드 확인: 카드에 들어가는 값 (카드 모양은 미리보기) */}
          <section className="os-card" aria-labelledby="os-step2">
            <h2 id="os-step2" className="os-step-title">
              <span className="os-step-no">2</span> 티어 카드 확인
            </h2>
            {ok ? (
              <>
                <dl className="os-managed">
                  <div>
                    <dt>Riot ID</dt>
                    <dd>
                      {ok.gameName}#{ok.tagLine}
                    </dd>
                  </div>
                  <div>
                    <dt>TFT 티어</dt>
                    <dd>{tierText(ok)}</dd>
                  </div>
                </dl>
                <p className="os-note">오늘 랭크 순위는 실제 오버레이에서 카드 하단에 표시되고, 3분마다 다시 불러옵니다.</p>
              </>
            ) : (
              <p className="os-hint">1단계에서 계정을 조회하면 카드에 들어갈 정보가 여기에 표시됩니다.</p>
            )}
          </section>

          {/* 3. 미리보기 및 사용: 테마 선택 + OBS 안내 (미리보기 카드는 오른쪽 칸, 모바일은 맨 위) */}
          <section className="os-card" aria-labelledby="os-step3">
            <h2 id="os-step3" className="os-step-title">
              <span className="os-step-no">3</span> 미리보기 및 사용
            </h2>
            <p className="os-sub">테마</p>
            <div className="os-themes" role="radiogroup" aria-label="테마">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={theme === t.value}
                  className={`os-theme${theme === t.value ? " is-active" : ""}`}
                  onClick={() => setTheme(t.value)}
                >
                  <strong>{t.title}</strong>
                  <span>{t.desc}</span>
                </button>
              ))}
            </div>
            <p className="os-hint">선택한 테마는 미리보기와 4단계에서 발급한 주소에 함께 적용됩니다.</p>

            <p className="os-sub">OBS에 넣는 방법</p>
            <ol className="os-howto">
              <li>
                4단계에서 <b>비밀 주소</b>를 발급하고 복사합니다.
              </li>
              <li>
                OBS에서 <b>소스 → + → 브라우저</b>를 선택하고, 복사한 주소를 <b>URL</b>에 붙여 넣습니다.
              </li>
              <li>
                <b>너비 520</b>, <b>높이 340</b>으로 설정하고 <b>확인</b>을 누릅니다.
              </li>
            </ol>
            <p className="os-note">티어와 오늘 랭크 순위는 3분마다 자동으로 다시 불러옵니다. 바로 반영하려면 소스 속성에서 “현재 페이지 새로 고침”을 누르세요.</p>
          </section>

          {/* 4. 비밀 주소 (Riot ID가 주소에 없음) */}
          <SecretOverlayPanel
            account={ok ? { gameName: ok.gameName, tagLine: ok.tagLine } : null}
            theme={theme}
            loggedIn={chzzkName !== null}
          />
        </div>

        {/* 미리보기: /overlay/tft와 같은 카드. 카드가 투명하므로 방송 화면처럼 바탕을 깐다 */}
        <aside className="os-preview-col" aria-label="오버레이 미리보기">
          <div className="os-card os-preview-card">
            <div className="os-preview-head">
              <h2 className="os-step-title">미리보기</h2>
              {!ok && <span className="os-example-badge">예시</span>}
            </div>
            <div className={`os-preview os-preview-${theme}`}>
              <OverlayCard view={previewView} theme={theme} today={ok ? undefined : EXAMPLE_TODAY} as="div" />
            </div>
            <p className="os-note">
              {ok
                ? "실제 오버레이와 같은 카드입니다. 오늘 랭크 순위는 실제 오버레이에서만 카드 하단에 표시됩니다. 배경은 방송 화면 예시입니다."
                : "예시 화면입니다 — 실제 계정·랭크 정보가 아닙니다. 계정을 확인하면 실제 정보로 바뀝니다."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
