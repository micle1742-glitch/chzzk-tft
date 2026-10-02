"use client";

// 로그아웃(POST)이 끝나면 redirectTo로 이동한다. 쿠키가 지워진 상태로 새로 불러오려고 전체 이동을 쓴다.
export default function LogoutButton({
  className,
  redirectTo = "/login",
}: {
  className?: string;
  redirectTo?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await fetch("/api/auth/chzzk/logout", { method: "POST" });
        window.location.href = redirectTo;
      }}
    >
      로그아웃
    </button>
  );
}
