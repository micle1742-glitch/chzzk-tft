"use client";

import type { GameSeason } from "../lib/season";
import "./season-select.css";

/*
 * 시즌 선택 드롭다운 (게임 공통 — TFT 전적 분석에서 사용, 나중에 LoL도 같은 GameSeason 목록으로 재사용)
 * 목록은 서버가 실제 데이터로 만든 시즌만 받는다. 이 컴포넌트는 시즌을 지어내지 않는다.
 */
export default function SeasonSelect({
  seasons,
  value,
  onChange,
  disabled = false,
  label = "분석 시즌",
}: {
  seasons: GameSeason[];
  value: string;
  onChange: (seasonId: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  if (seasons.length === 0) return null;
  return (
    <label className="season-select">
      <span className="season-select-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
            {s.isCurrent ? " (현재 시즌)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
