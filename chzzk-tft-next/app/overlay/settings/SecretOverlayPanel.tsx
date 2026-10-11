"use client";

import { useEffect, useState } from "react";
// 타입만 가져온다 (서버 코드는 번들에 포함되지 않음)
import type { OverlayStatusResponse } from "../../api/overlay/status/route";
import type { OverlayTheme } from "../tft/OverlayCard";

/*
 * 비밀 오버레이 주소 (/overlay/tft/<토큰>) 발급·재발급·삭제 — 설정 페이지의 한 칸
 * - 관리 키는 서버가 HttpOnly 쿠키로만 다룬다. 이 코드는 관리 키를 보거나 저장하지 않는다
 * - 토큰(주소)은 발급·재발급 응답에서 한 번만 받아 이 화면의 메모리(state)에만 둔다
 *   (localStorage·URL에 저장하지 않음 → 새로 고치면 다시 볼 수 없고, 필요하면 재발급)
 * - 주소는 방송 화면에 비칠 수 있어 기본으로 가려 두고, "보기"·복사 버튼으로만 꺼낸다
 * - 서버 오류 본문은 그대로 보여 주지 않고 상태 코드·사유별로 정한 문구만 쓴다
 */

type Status =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "managed"; gameName: string; tagLine: string; createdAt: string; rotatedAt: string | null }
  | { kind: "error" };

type Busy = null | "issue" | "rotate" | "revoke";
type Confirm = null | "rotate" | "revoke";

// 응답 상태 코드·사유 → 사용자 문구 (서버 message는 쓰지 않는다)
function messageFor(action: "issue" | "rotate" | "revoke", status: number, body: unknown): string {
  const b = (body ?? {}) as { reason?: unknown; retryAfterSeconds?: unknown };
  const wait = typeof b.retryAfterSeconds === "number" && b.retryAfterSeconds > 0 ? Math.ceil(b.retryAfterSeconds) : null;
  if (status === 429) {
    return wait ? `요청이 많습니다. ${wait}초 뒤에 다시 시도해 주세요.` : "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (status === 403) return "보안 확인에 실패했습니다. 페이지를 새로 고친 뒤 다시 시도해 주세요.";
  if (status === 409) return "이 브라우저에서 이미 관리 중인 오버레이가 있습니다. 아래에서 재발급하거나 삭제한 뒤 다시 발급해 주세요.";
  if (status === 404) {
    if (action === "issue" && b.reason === "account_not_found") return "Riot ID를 찾을 수 없습니다. 1단계에서 계정을 다시 확인해 주세요.";
    return "관리할 오버레이를 찾을 수 없습니다. 이미 삭제되었거나 이 브라우저에 관리 정보가 없습니다.";
  }
  if (status === 400) return "입력한 Riot ID를 확인해 주세요.";
  return "지금은 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.";
}

const dateText = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });

export default function SecretOverlayPanel({
  account,
  theme,
}: {
  // 1단계에서 확인한 Riot ID (확인 전이면 null)
  account: { gameName: string; tagLine: string } | null;
  theme: OverlayTheme;
}) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  // 방금 발급·재발급한 주소의 경로 (/overlay/tft/<토큰>). 메모리에만
  const [path, setPath] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "done" | "fail">("idle");

  async function refreshStatus() {
    try {
      const response = await fetch("/api/overlay/status", { method: "POST", cache: "no-store" });
      const data: OverlayStatusResponse | { success: false } = await response.json();
      if (!response.ok || !data.success) throw new Error("status");
      setStatus(
        data.managed
          ? { kind: "managed", gameName: data.gameName, tagLine: data.tagLine, createdAt: data.createdAt, rotatedAt: data.rotatedAt }
          : { kind: "none" }
      );
      if (!data.managed) setPath(null);
    } catch {
      setStatus({ kind: "error" });
    }
  }

  // 화면을 열 때 이 브라우저의 관리 상태를 한 번 확인 (응답 후에만 state를 바꾼다)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/overlay/status", { method: "POST", cache: "no-store" })
      .then(async (response) => {
        const data: OverlayStatusResponse | { success: false } = await response.json();
        if (cancelled) return;
        if (!response.ok || !data.success) return setStatus({ kind: "error" });
        setStatus(
          data.managed
            ? { kind: "managed", gameName: data.gameName, tagLine: data.tagLine, createdAt: data.createdAt, rotatedAt: data.rotatedAt }
            : { kind: "none" }
        );
      })
      .catch(() => {
        if (!cancelled) setStatus({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(action: "issue" | "rotate" | "revoke") {
    setBusy(action);
    setError(null);
    setNotice(null);
    setConfirm(null);
    setCopyState("idle");
    try {
      const url = action === "issue" ? "/api/overlay" : `/api/overlay/${action}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "issue" && account ? JSON.stringify({ nickname: account.gameName, tagline: account.tagLine }) : "{}",
        cache: "no-store",
      });
      const data: unknown = await response.json().catch(() => null);
      const ok = response.ok && (data as { success?: unknown } | null)?.success === true;
      if (!ok) {
        setError(messageFor(action, response.status, data));
        // 서버 상태가 화면과 다를 수 있는 경우(이미 있음·없음) 다시 확인
        if (response.status === 409 || response.status === 404) await refreshStatus();
        return;
      }
      if (action === "revoke") {
        setPath(null);
        setReveal(false);
        setNotice("오버레이를 삭제했습니다. 이전 주소는 더 이상 작동하지 않습니다. OBS 소스도 지워 주세요.");
      } else {
        const p = (data as { path?: unknown }).path;
        setPath(typeof p === "string" && p.startsWith("/overlay/tft/") ? p : null);
        setReveal(false);
        setNotice(
          action === "rotate"
            ? "새 주소를 발급했습니다. 이전 주소는 이제 작동하지 않으니 OBS의 URL을 새 주소로 바꿔 주세요."
            : "주소를 발급했습니다. 이 주소는 지금 한 번만 볼 수 있으니 바로 복사해 OBS에 넣어 주세요."
        );
      }
      await refreshStatus();
    } catch {
      setError("지금은 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  // 발급 직후에만 있는 주소. 앞부분은 지금 접속한 TIERON 주소, 테마는 2단계 선택을 따른다
  const fullUrl = path && typeof window !== "undefined" ? `${window.location.origin}${path}?theme=${theme}` : "";

  async function copyUrl() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopyState("done");
    } catch {
      setCopyState("fail");
    }
  }

  const managed = status.kind === "managed" ? status : null;

  return (
    <section className="os-card" aria-labelledby="os-secret">
      <h2 id="os-secret" className="os-step-title">
        <span className="os-step-no">4</span> 비밀 주소 발급
      </h2>
      <p className="os-hint os-hint-top">
        OBS에 넣을 주소입니다. Riot ID 대신 추측할 수 없는 값을 써서, 주소가 새면 재발급으로 바로 막을 수 있습니다.
      </p>

      {status.kind === "loading" && <p className="os-hint">관리 상태를 확인하는 중…</p>}
      {status.kind === "error" && (
        <p className="os-error" role="alert">
          관리 상태를 확인하지 못했습니다. 잠시 후 페이지를 새로 고쳐 주세요.
        </p>
      )}

      {status.kind === "none" && (
        <>
          <p className="os-hint">이 브라우저에서 관리 중인 비밀 주소가 없습니다.</p>
          <button
            type="button"
            className="os-btn os-btn-primary os-btn-block"
            onClick={() => void run("issue")}
            disabled={!account || busy !== null}
          >
            {busy === "issue" ? (
              <>
                <span className="tn-spinner" aria-hidden="true" /> 발급 중
              </>
            ) : account ? (
              `${account.gameName}#${account.tagLine} 비밀 주소 발급`
            ) : (
              "1단계에서 계정을 확인하면 발급할 수 있습니다"
            )}
          </button>
        </>
      )}

      {managed && (
        <dl className="os-managed">
          <div>
            <dt>계정</dt>
            <dd>
              {managed.gameName}#{managed.tagLine}
            </dd>
          </div>
          <div>
            <dt>발급</dt>
            <dd>{dateText(managed.createdAt)}</dd>
          </div>
          {managed.rotatedAt && (
            <div>
              <dt>마지막 재발급</dt>
              <dd>{dateText(managed.rotatedAt)}</dd>
            </div>
          )}
        </dl>
      )}

      {managed && fullUrl && (
        <>
          <div className="os-url-row">
            <input
              type={reveal ? "text" : "password"}
              className="os-url"
              value={fullUrl}
              readOnly
              aria-label="비밀 오버레이 주소"
              autoComplete="off"
              onFocus={(e) => reveal && e.currentTarget.select()}
            />
            <button type="button" className="os-btn os-btn-ghost" onClick={() => setReveal((v) => !v)}>
              {reveal ? "가리기" : "보기"}
            </button>
            <button type="button" className="os-btn os-btn-primary" onClick={copyUrl}>
              {copyState === "done" ? "복사됨" : "주소 복사"}
            </button>
          </div>
          {copyState === "fail" && (
            <p className="os-error" role="alert">
              자동 복사에 실패했습니다. “보기”를 누른 뒤 주소 칸을 선택해 직접 복사해 주세요.
            </p>
          )}
          <p className="os-note">방송 화면에 이 주소가 보이지 않게 주의하세요. 테마를 바꾸면 주소 끝의 theme 값도 바뀝니다.</p>
        </>
      )}

      {managed && !fullUrl && (
        <p className="os-hint">
          보안을 위해 발급한 주소는 다시 보여 줄 수 없습니다. 주소가 필요하면 재발급하세요. (이전 주소는 작동을 멈춥니다)
        </p>
      )}

      {notice && <p className="os-ok">{notice}</p>}
      {error && (
        <p className="os-error" role="alert">
          {error}
        </p>
      )}

      {managed && (
        <div className="os-manage">
          {confirm === null && (
            <div className="os-manage-row">
              <button type="button" className="os-btn os-btn-ghost" onClick={() => setConfirm("rotate")} disabled={busy !== null}>
                재발급
              </button>
              <button type="button" className="os-btn os-btn-danger" onClick={() => setConfirm("revoke")} disabled={busy !== null}>
                삭제
              </button>
            </div>
          )}
          {confirm && (
            <div className="os-confirm" role="alertdialog" aria-labelledby="os-confirm-text">
              <p id="os-confirm-text">
                {confirm === "rotate"
                  ? "새 주소를 발급하면 지금 OBS에 넣은 주소는 즉시 작동을 멈춥니다. 재발급할까요?"
                  : "삭제하면 이 오버레이 주소는 즉시 작동을 멈추고 되돌릴 수 없습니다. 삭제할까요?"}
              </p>
              <div className="os-manage-row">
                <button
                  type="button"
                  className={`os-btn ${confirm === "rotate" ? "os-btn-primary" : "os-btn-danger"}`}
                  onClick={() => void run(confirm)}
                  disabled={busy !== null}
                >
                  {busy ? "처리 중" : confirm === "rotate" ? "재발급" : "삭제"}
                </button>
                <button type="button" className="os-btn os-btn-ghost" onClick={() => setConfirm(null)} disabled={busy !== null}>
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ul className="os-secret-notes">
        <li>
          재발급·삭제 권한은 이 브라우저에만 저장됩니다. 브라우저 쿠키를 지우거나 다른 브라우저·기기에서는 이 오버레이를
          관리할 수 없습니다.
        </li>
        <li>주소는 발급할 때 한 번만 보여 줍니다. 다시 볼 수 없으니 잃어버리면 재발급해 주세요.</li>
        <li>Riot API로 조회한 공개 정보를 표시할 뿐, 계정 소유를 인증하지 않습니다.</li>
      </ul>
    </section>
  );
}
