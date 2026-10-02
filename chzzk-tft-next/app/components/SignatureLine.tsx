"use client";

import { useEffect, useRef, useState } from "react";

/*
 * 랜딩의 민트 시그니처 라인 (한 줄, 정적).
 * 콘텐츠 위치를 실제로 재서(data-line 속성) 경로를 그리므로, 화면 크기가 바뀌어도
 * 같은 콘텐츠를 가리킨다.
 *
 * 형태: 상단에서 거의 수직인 직선으로 내려오다가, 목적지 근처에서만 곡률이 서서히 커지며
 *       오른쪽으로 휘어 "간편한 치지직 로그인" 왼쪽 점에서 끝난다 (이후로는 이어지지 않는다).
 * 색:   직선 구간은 낮은 불투명도로 가늘고 은은하게, 끝부분으로 갈수록 민트가 진해지고
 *       가장 끝에서만 아주 약한 발광을 쓴다.
 * 모바일(860px 이하)은 한 열 레이아웃이라 곡선 없이 왼쪽 여백의 직선이 로그인 항목 옆에서 끝난다.
 */

const MINT = "#18d8b8";

type Stop = [number, number]; // [y 좌표, 투명도]
type Geo = {
  w: number;
  h: number;
  d: string;
  line: Stop[];
  glow: Stop[];
  dot: { x: number; y: number };
};

function build(main: HTMLElement): Geo | null {
  const mr = main.getBoundingClientRect();
  const find = (name: string) =>
    main.querySelector<HTMLElement>(`[data-line="${name}"]`);
  const rel = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { top: r.top - mr.top, bottom: r.bottom - mr.top, left: r.left - mr.left };
  };

  const heroEyebrow = find("hero-eyebrow");
  const heroCopy = find("hero-copy");
  const aboutItem = find("about-item");
  const aboutSection = aboutItem?.closest("section");
  if (!heroEyebrow || !heroCopy || !aboutItem || !aboutSection) return null;

  const eb = rel(heroEyebrow);
  const hc = rel(heroCopy);
  const ai = rel(aboutItem);
  const as = rel(aboutSection);
  const W = mr.width;
  const H = mr.height;

  const gx = Math.max(10, eb.left - 28); // 왼쪽 여백의 직선
  const yi = ai.top + 11; // "간편한 치지직 로그인" 제목 높이 = 선이 끝나는 곳

  // 그라디언트 정점은 y가 줄어들면 안 된다
  const monotonic = (stops: Stop[]): Stop[] => {
    let prev = 0;
    return stops.map(([y, o]) => {
      prev = Math.max(prev, Math.min(y, H));
      return [prev, o];
    });
  };

  // 모바일: 곡선 없이 왼쪽 여백의 직선이 항목 옆에서 끝난다
  if (window.matchMedia("(max-width: 860px)").matches) {
    return {
      w: W,
      h: H,
      d: `M ${gx} 0 L ${gx} ${yi}`,
      line: monotonic([
        [0, 0],
        [Math.min(140, yi * 0.25), 0.16],
        [yi - 200, 0.18],
        [yi - 90, 0.4],
        [yi - 20, 0.85],
        [yi, 1],
        [H, 1],
      ]),
      glow: monotonic([[0, 0], [yi - 40, 0], [yi, 0.3], [H, 0.3]]),
      dot: { x: gx, y: yi },
    };
  }

  const tx = ai.left - 24; // 서비스 소개 목록 왼쪽(열 사이 빈 공간)
  const dx = tx - gx;
  // 휘기 시작하는 높이: 히어로 문구 아래, ABOUT TIERON 위쪽 빈 여백
  const ys = Math.max(as.top - 60, hc.bottom + 24);
  const dy = yi - ys;

  // 직선(수직) → 완만한 곡선 하나. 도착할 때는 거의 수평으로 들어가
  // ABOUT TIERON 라벨과 제목 위쪽 빈 공간을 지나 로그인 항목 왼쪽 점에 닿는다.
  const d = [
    `M ${gx} 0`,
    `L ${gx} ${ys}`,
    `C ${gx} ${ys + dy * 0.6} ${tx - dx * 0.45} ${yi - 21} ${tx} ${yi}`,
  ].join(" ");

  // 직선 구간은 .16~.18로 은은하게, 곡선 끝으로 갈수록 서서히 진해져 끝에서 1
  const line = monotonic([
    [0, 0],
    [Math.min(140, ys * 0.25), 0.16],
    [ys, 0.18],
    [ys + dy * 0.55, 0.3],
    [ys + dy * 0.8, 0.6],
    [yi - 6, 0.95],
    [yi, 1],
    [H, 1],
  ]);

  // 발광은 끝부분에서만 아주 약하게
  const glow = monotonic([
    [0, 0],
    [ys + dy * 0.7, 0],
    [yi - 12, 0.25],
    [yi, 0.3],
    [H, 0.3],
  ]);

  return { w: W, h: H, d, line, glow, dot: { x: tx, y: yi } };
}

export default function SignatureLine() {
  const ref = useRef<SVGSVGElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);

  useEffect(() => {
    const main = ref.current?.parentElement;
    if (!main) return;

    const update = () => setGeo(build(main));

    update();
    const ro = new ResizeObserver(update);
    ro.observe(main);
    window.addEventListener("resize", update);
    document.fonts?.ready.then(update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const gradient = (id: string, stops: Stop[], h: number) => (
    <linearGradient key={id} id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={h}>
      {stops.map(([y, o], i) => (
        <stop key={i} offset={y / h} stopColor={MINT} stopOpacity={o} />
      ))}
    </linearGradient>
  );

  return (
    <svg
      ref={ref}
      className="ld-line-svg"
      aria-hidden="true"
      width={geo?.w}
      height={geo?.h}
      viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : undefined}
    >
      {geo && (
        <>
          <defs>
            {gradient("ld-line", geo.line, geo.h)}
            {gradient("ld-glow", geo.glow, geo.h)}
            <filter id="ld-glow-blur" filterUnits="userSpaceOnUse" x="0" y="0" width={geo.w} height={geo.h}>
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <path d={geo.d} fill="none" stroke="url(#ld-glow)" strokeWidth={5} filter="url(#ld-glow-blur)" />
          <path d={geo.d} fill="none" stroke="url(#ld-line)" strokeWidth={1.25} strokeLinecap="round" />
          <circle cx={geo.dot.x} cy={geo.dot.y} r={3.5} fill={MINT} />
        </>
      )}
    </svg>
  );
}
