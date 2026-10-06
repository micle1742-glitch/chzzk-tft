"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/*
 * 스크롤해서 화면에 들어오면 한 번만 아래에서 살짝 올라오며 나타난다.
 * - 처음부터 화면 안에 있으면 효과 없이 그대로 보인다.
 * - prefers-reduced-motion(움직임 줄이기)이면 효과 없이 그대로 보인다.
 * - 자바스크립트가 돌기 전(서버 렌더링)에는 항상 보이는 상태라 내용이 사라지지 않는다.
 */
export default function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setHidden(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        // 화면에 들어왔거나, 이미 화면 위로 지나간 경우(뒤로가기 후 스크롤 복원) 바로 보이게
        if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
          setHidden(false);
          io.disconnect();
        }
      },
      // 관찰 영역을 화면 위쪽으로만 넓힌다: 스크롤 복원이 섹션을 한 번에 건너뛰어도 "위로 지나감"이 감지되게
      // (아래쪽은 그대로라 첫 방문 때 화면에 들어오며 나타나는 효과는 변하지 않는다)
      { threshold: 0.2, rootMargin: "100000px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${className} ld-reveal ${hidden ? "is-hidden" : ""}`}>
      {children}
    </div>
  );
}
