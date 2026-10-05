"use client";

import { useState } from "react";

// 로그아웃(POST)이 끝나면 redirectTo로 이동한다. 쿠키가 지워진 상태로 새로 불러오려고 전체 이동을 쓴다.
// 요청 중에는 "로그아웃 중..." + 작은 스피너를 보여 주고 버튼을 막아 중복 요청을 방지한다.
export default function LogoutButton({
  className,
  redirectTo = "/home",
}: {
  className?: string;
  redirectTo?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-busy={pending}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        try {
          await fetch("/api/auth/chzzk/logout", { method: "POST" });
        } catch {
          // 네트워크 오류로 요청 자체가 실패하면 다시 누를 수 있게 되돌린다
          setPending(false);
          return;
        }
        // 이동이 끝날 때까지 pending 유지 (페이지가 바뀌며 사라짐)
        window.location.href = redirectTo;
      }}
    >
      {pending ? (
        <>
          <span className="sn-spinner" aria-hidden="true" />
          로그아웃 중...
        </>
      ) : (
        "로그아웃"
      )}
    </button>
  );
}
