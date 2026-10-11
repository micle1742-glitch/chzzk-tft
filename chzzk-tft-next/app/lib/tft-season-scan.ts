/*
 * TFT 매치 ID 목록(최신순)에서 세트(시즌)별 구간을 찾는다 — 순수 로직, Riot·DB 호출은 probe 함수가 맡는다
 * 테스트: app/lib/tft-season-scan.test.mjs
 *
 * 왜 이진 탐색인가: ID 목록에는 세트 정보가 없어 상세를 받아야 세트를 안다.
 * 300판을 하나씩 확인하면 Riot 요청 한도를 넘으므로, 랭크 매치의 세트 번호가 최신순으로 내려간다는 점을 이용해
 * 경계 하나를 상세 약 9번(log2 300)으로 찾는다.
 * 구간 경계 근처의 일반 게임 몇 판이 옆 구간에 들어갈 수 있지만, 분석은 "랭크 + 같은 세트" 매치만 세므로 섞이지 않는다.
 */

export type SeasonSegment = {
  set: number; // 세트 번호
  start: number; // ID 목록에서 이 세트 구간의 시작 위치 (포함)
  end: number; // 끝 위치 (미포함)
};

// probe(i): 위치 i부터 가까운 랭크 매치의 위치와 세트
//   none = 근처(호출하는 쪽이 정한 범위)에 랭크 매치 없음 / unknown = 상세를 받지 못함(요청 한도·오류)
export type ProbeResult = { index: number; set: number } | "none" | "unknown";

export type SeasonScan = {
  segments: SeasonSegment[]; // 최신 세트부터
  complete: boolean; // false면 중간에 상세를 못 받아 일부 구간만 확인
  // stopAfterSet으로 일찍 멈췄을 때 이어서 탐색할 위치 (끝까지 탐색했으면 null)
  cursor: number | null;
};

export type ScanOptions = {
  // 이 세트 이하의 구간을 찾으면 멈춘다 (선택한 시즌 분석에 한도를 먼저 쓰기 위해)
  stopAfterSet?: number | null;
  // 이전 탐색 결과에서 이어서 (cursor 위치부터)
  resume?: SeasonScan;
};

export async function findSeasonSegments(
  n: number,
  probe: (index: number) => Promise<ProbeResult>,
  // probe 한 번이 확인하는 범위 (none이 나오면 이만큼 건너뛰고 다시 찾는다)
  window = 8,
  options: ScanOptions = {}
): Promise<SeasonScan> {
  const segments: SeasonSegment[] = options.resume ? [...options.resume.segments] : [];
  const done = (complete: boolean, cursor: number | null = null): SeasonScan => ({ segments, complete, cursor });
  if (options.resume && options.resume.cursor === null) return done(options.resume.complete);

  // 다음 랭크 매치 찾기: none이면 window만큼 뒤에서 다시
  const nextRanked = async (from: number): Promise<ProbeResult> => {
    for (let i = from; i < n; i += window) {
      const r = await probe(i);
      if (r !== "none") return r;
    }
    return "none";
  };

  let segmentStart = options.resume?.cursor ?? 0;
  let current = await nextRanked(segmentStart);

  while (true) {
    if (current === "unknown") return done(false);
    if (current === "none") return done(true);

    // current.set보다 낮은 세트가 처음 나오는 위치를 이진 탐색 (못 찾으면 n)
    let lo = current.index + 1;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const r = await probe(mid);
      if (r === "unknown") {
        // 경계를 끝까지 못 찾음: 확인한 데까지만 이 세트 구간으로 두고 멈춘다
        segments.push({ set: current.set, start: segmentStart, end: n });
        return done(false);
      }
      if (r !== "none" && r.set < current.set) hi = mid;
      else lo = mid + 1;
    }

    segments.push({ set: current.set, start: segmentStart, end: lo });
    if (lo >= n) return done(true);

    segmentStart = lo;
    // 선택한 시즌(또는 그보다 이전 시즌) 구간을 찾았으면 여기서 멈추고, 이어서 할 위치를 돌려준다
    if (options.stopAfterSet != null && current.set <= options.stopAfterSet) return done(true, lo);
    const next = await nextRanked(lo);
    // 세트 번호가 다시 올라가는 이상한 순서면(이벤트 등) 무한 반복을 막기 위해 위치가 앞으로 가는지만 확인
    if (next !== "none" && next !== "unknown" && next.index < lo) return done(false);
    current = next;
  }
}

// 같은 세트가 두 구간으로 나뉘어 나오면(순서가 섞인 경우) 하나로 합쳐 범위를 넓힌다
export function segmentForSet(segments: SeasonSegment[], set: number): SeasonSegment | null {
  const parts = segments.filter((s) => s.set === set);
  if (parts.length === 0) return null;
  return {
    set,
    start: Math.min(...parts.map((p) => p.start)),
    end: Math.max(...parts.map((p) => p.end)),
  };
}
