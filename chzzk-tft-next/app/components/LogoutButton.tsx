"use client";

// 로그아웃(POST)이 끝나면 로그인 페이지로 이동한다. 쿠키가 지워진 상태로 새로 불러오려고 전체 이동을 쓴다.
export default function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await fetch("/api/auth/chzzk/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      로그아웃
    </button>
  );
}
