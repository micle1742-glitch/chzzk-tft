import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../../../lib/db";
import {
  RIOT_ASIA,
  RiotAbortedError,
  RiotRateLimitedError,
  fetchAccount,
  logRiotFailure,
  riotGet,
  riotHeaders,
  riotLimiter,
  riotStatus,
} from "../../../lib/riot";
import { tftSeason, type GameSeason } from "../../../lib/season";
import {
  ANALYSIS_GAME_LIMIT,
  RANKED_TFT_QUEUE_ID,
  analyzeRankedGames,
  type RankedGame,
  type TftAnalysis,
} from "../../../lib/tft-analysis";
import { getCurrentTftSet } from "../../../lib/tft-current-season";
import { findSeasonSegments, segmentForSet, type ProbeResult } from "../../../lib/tft-season-scan";

/*
 * POST /api/tft/matches — TFT 시즌별 최근 랭크 20판 분석 (docs/HANDOFF.md 5번 "전적 분석 영역")
 * 입력: { nickname, tagline, season? } (season = 세트 번호, 없으면 현재 시즌). /api/search와 독립적으로 동작한다
 *
 * 흐름
 *  1. Riot ID → PUUID, 현재 시즌(KR 챌린저 최신 랭크 매치의 세트, 서버 6시간 캐시)
 *  2. 최근 매치 ID 최대 300개 (100개씩 3회). 5분 안에 받은 목록이 캐시에 있으면 재사용
 *  3. 캐시된 매치 상세를 한 번에 읽고, 세트 경계는 이진 탐색으로 찾는다 (lib/tft-season-scan) → 시즌 목록
 *  4. 선택한 세트 구간에서 queue_id 1100 + 같은 세트 매치만 최신 20판 → 통계 (다른 세트를 섞지 않음)
 * 안전
 *  - 모든 Riot 호출은 서버 공용 제한기(lib/riot.ts riotLimiter)를 거친다: 동시 요청 합계로 초당·2분 한도를 지키고,
 *    429면 Retry-After 동안 이 서버의 모든 요청이 Riot을 부르지 않는다 (쿨다운 중에는 캐시로 가능한 결과만)
 *  - 새 매치 상세는 한 요청당 최대 45개. 429·오류·한도 대기가 길면 그 자리에서 멈추고 재시도하지 않는다
 *  - 브라우저가 요청을 취소하면(request.signal) Riot 호출을 멈추고, 이미 받은 매치는 캐시에 저장한 뒤 끝낸다
 *  - 캐시(Supabase, service_role)는 서버에서만 읽고 쓴다. 테이블이 없거나 오류면 캐시 없이 동작한다
 *  - 로그에는 API 이름·상태 코드·DB 오류 코드만 (API 키·PUUID·Riot ID·응답 본문 미출력)
 */

// 매치 ID 탐색 상한과 페이지 크기 (by-puuid/ids의 count 상한 100)
const MATCH_ID_LIMIT = 300;
const MATCH_ID_PAGE = 100;
const ID_LIST_COOLDOWN_MS = 5 * 60 * 1000;
const CACHE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
// 새 매치 상세 한도: 시즌 경계 탐색(경계 하나당 약 9회) + 분석(랭크 20판 ≈ 상세 약 28회)
const MAX_NEW_DETAILS = 45;
const DETAIL_CONCURRENCY = 3;
// 시즌 탐색에서 probe 한 번이 랭크 매치를 찾는 범위
const PROBE_WINDOW = 8;
// DB in() 조회 한 번에 넣는 매치 ID 수 (URL 길이 제한 대비)
const DB_IN_CHUNK = 100;


// 실패 응답 형식은 /api/search와 같다 ({ success: false, reason, message })
const FAILURES = {
  invalid: { status: 400, message: "게임 이름과 태그를 입력해주세요." },
  not_found: {
    status: 404,
    message: "입력한 Riot ID를 찾을 수 없습니다. 게임 이름과 태그를 확인해주세요.",
  },
  // 우리 서버의 Riot 요청 한도 대기 (Riot 429 쿨다운 포함) — 서버 오류(503)와 구분해 429 + Retry-After
  rate_limited: {
    status: 429,
    message: "요청이 많아 잠시 전적을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.",
  },
  unavailable: {
    status: 503,
    message: "현재 전적 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.",
  },
} as const;

function failure(reason: keyof typeof FAILURES) {
  const { status, message } = FAILURES[reason];
  const retryAfterSeconds = reason === "rate_limited" ? Math.max(1, Math.ceil(riotLimiter.cooldownRemainingMs() / 1000)) : undefined;
  return NextResponse.json(
    { success: false, reason, message, retryAfterSeconds },
    { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined }
  );
}

// 브라우저가 취소한 요청: 아무도 결과를 기다리지 않으므로 짧게 끝낸다 (499 = 클라이언트가 닫음)
function aborted() {
  return NextResponse.json({ success: false, reason: "aborted", message: "요청이 취소되었습니다." }, { status: 499 });
}

// Riot 호출 실패를 멈춤 사유로: 취소 / 한도(429·로컬 대기) / 그 밖 오류
function stopReasonOf(error: unknown): "aborted" | "rate_limit" | "error" {
  if (error instanceof RiotAbortedError) return "aborted";
  if (error instanceof RiotRateLimitedError || riotStatus(error) === 429) return "rate_limit";
  return "error";
}

export type TftMatchesResponse = {
  success: true;
  queueId: typeof RANKED_TFT_QUEUE_ID;
  // 선택할 수 있는 시즌: 현재 시즌 + 이 계정의 최근 매치(최대 300개)에서 실제로 발견된 세트 (최신순)
  seasons: GameSeason[];
  // 분석한 시즌 (현재 시즌을 확인하지 못했고 기록도 없으면 null)
  season: GameSeason | null;
  // 현재 시즌을 Riot 데이터로 확인했는지
  currentSeasonKnown: boolean;
  analysis: TftAnalysis;
  // ok: 분석함 / no_games: 이 시즌 랭크 기록 없음 / beyond_range: 탐색 범위(300개) 밖이라 확인 못 함
  // partial_range: 이 시즌 기록이 탐색 범위 끝까지 이어져 그 안의 판만 분석함
  seasonStatus: "ok" | "no_games" | "beyond_range" | "partial_range";
  // 300개 상한이나 목록 조회 실패로 더 오래된 기록을 확인하지 못함
  olderUnchecked: boolean;
  // 훑은 매치 ID 수 (선택한 시즌 구간 안에서)
  matchesChecked: number;
  // false면 요청 한도·오류로 중간에 멈춘 부분 결과
  complete: boolean;
  // rate_limit = Riot 429, error = Riot 오류, budget = 한 요청의 새 상세 한도 도달 (complete면 null)
  stoppedBy: "rate_limit" | "error" | "budget" | null;
  // stoppedBy가 rate_limit이면 다시 시도할 때까지 남은 초 (쿨다운이 없으면 null)
  retryAfterSeconds: number | null;
  // 매치 목록 기준 시각 (ISO). 캐시를 썼으면 캐시를 받은 시각
  checkedAt: string;
};

// 내부 멈춤 사유: 응답 값 + 취소(aborted — 응답 대신 aborted()로 끝낸다)
type StopReason = TftMatchesResponse["stoppedBy"] | "aborted";

// Riot TFT-MATCH-V1 상세 중 쓰는 필드만
type MatchDto = {
  metadata: { match_id: string };
  info: {
    queue_id: number;
    game_datetime: number;
    game_length?: number;
    tft_set_number?: number;
    game_version?: string;
    participants: { puuid: string; placement: number }[];
  };
};

// 매치 한 판에서 쓰는 값 (대상 PUUID의 등수)
type KnownMatch = {
  queueId: number;
  setNumber: number | null;
  gameDatetime: number;
  placement: number | null;
};

const isPlacement = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 8;

const chunks = <T,>(list: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

export async function POST(request: Request) {
  const body: { nickname?: unknown; tagline?: unknown; season?: unknown } = await request
    .json()
    .catch(() => ({}));
  const { nickname, tagline, season } = body;
  const requestedSet =
    season === undefined || season === null || season === "" ? null : Number(season);
  if (
    typeof nickname !== "string" ||
    typeof tagline !== "string" ||
    !nickname ||
    !tagline ||
    nickname.length > 100 ||
    tagline.length > 20 ||
    (requestedSet !== null && (!Number.isInteger(requestedSet) || requestedSet < 1 || requestedSet > 99))
  ) {
    return failure("invalid");
  }

  const maybeHeaders = riotHeaders();
  if (!maybeHeaders) {
    console.error("TFT 전적 분석 불가: 서버에 Riot API 키가 설정되지 않음");
    return failure("unavailable");
  }
  // 아래 중첩 함수(ensureDetails)에서도 null이 아닌 값으로 쓰도록 고정
  const headers: Record<string, string> = maybeHeaders;

  // 브라우저 연결이 끊기면(새 조회·시즌 변경으로 취소) 취소되는 신호
  const signal = request.signal;

  // 1. Riot ID → PUUID
  let puuid: string;
  try {
    puuid = (await fetchAccount(nickname, tagline, headers, signal)).puuid;
  } catch (error) {
    if (riotStatus(error) === 404) return failure("not_found");
    logRiotFailure("Account", error);
    const reason = stopReasonOf(error);
    if (reason === "aborted") return aborted();
    return failure(reason === "rate_limit" ? "rate_limited" : "unavailable");
  }

  // 현재 시즌 (실패하면 null — 개인 기록으로 대신 정하지 않는다)
  const currentSet = await getCurrentTftSet(headers);

  // 캐시: 환경 변수·테이블이 없거나 오류가 나면 이번 요청은 캐시 없이 진행한다
  let db: SupabaseClient | null = null;
  try {
    db = getSupabase();
  } catch {
    console.error("TFT 매치 캐시 사용 불가: Supabase 환경 변수 없음");
  }
  const cacheOff = (step: string, code: string | undefined) => {
    if (db) console.error(`TFT 매치 캐시 사용 불가 (${step}: ${code ?? "알 수 없음"}) — 캐시 없이 진행`);
    db = null;
  };

  const now = Date.now();
  const retentionCutoff = new Date(now - CACHE_RETENTION_MS).toISOString();
  let stoppedBy: StopReason = null;

  // 2. 최근 매치 ID 목록 최대 300개 (쿨다운 캐시)
  let cachedIds: { ids: string[]; checkedAt: number } | null = null;
  if (db) {
    const { data, error } = await db
      .from("tft_match_id_lookups")
      .select("match_ids, checked_at")
      .eq("puuid", puuid)
      .gte("checked_at", retentionCutoff)
      .maybeSingle();
    if (error) cacheOff("ID 목록 읽기", error.code);
    else if (data) cachedIds = { ids: data.match_ids as string[], checkedAt: Date.parse(data.checked_at) };
  }

  let ids: string[] = [];
  let checkedAt = now;
  // 300개를 다 채웠거나 중간 페이지를 못 받으면 더 오래된 기록이 있을 수 있다
  let olderUnchecked = false;

  if (cachedIds && now - cachedIds.checkedAt < ID_LIST_COOLDOWN_MS) {
    ids = cachedIds.ids;
    checkedAt = cachedIds.checkedAt;
    olderUnchecked = ids.length >= MATCH_ID_LIMIT;
  } else {
    let pageFailed = false;
    for (let start = 0; start < MATCH_ID_LIMIT; start += MATCH_ID_PAGE) {
      try {
        const data = await riotGet<string[]>(`${RIOT_ASIA}/tft/match/v1/matches/by-puuid/${puuid}/ids`, headers, {
          params: { start, count: MATCH_ID_PAGE },
          signal,
        });
        const page = Array.isArray(data) ? data.filter((id) => typeof id === "string") : [];
        ids.push(...page);
        if (page.length < MATCH_ID_PAGE) break; // 끝까지 받음
        if (ids.length >= MATCH_ID_LIMIT) olderUnchecked = true;
      } catch (error) {
        logRiotFailure("TFT Match IDs", error);
        stoppedBy = stopReasonOf(error);
        pageFailed = true;
        break;
      }
    }
    ids = ids.slice(0, MATCH_ID_LIMIT);

    if (pageFailed && ids.length === 0) {
      if (stoppedBy === "aborted") return aborted();
      // 첫 페이지부터 실패: 쿨다운이 지난 캐시라도 쓰고, 그것도 없으면 분석 불가
      if (!cachedIds) return failure(stoppedBy === "rate_limit" ? "rate_limited" : "unavailable");
      ids = cachedIds.ids;
      checkedAt = cachedIds.checkedAt;
      olderUnchecked = ids.length >= MATCH_ID_LIMIT;
    } else {
      if (pageFailed) olderUnchecked = true;
      checkedAt = now;
      if (db && !pageFailed) {
        const { error } = await db
          .from("tft_match_id_lookups")
          .upsert({ puuid, match_ids: ids, checked_at: new Date(now).toISOString() }, { onConflict: "puuid" });
        if (error) cacheOff("ID 목록 저장", error.code);
      }
    }
  }

  // 3-1. 캐시된 매치 상세를 한 번에 읽는다 (30일 이내에 받은 것만)
  const known = new Map<string, KnownMatch>();
  if (db && ids.length > 0) {
    for (const part of chunks(ids, DB_IN_CHUNK)) {
      if (!db) break;
      const [matches, mine] = await Promise.all([
        db
          .from("tft_matches")
          .select("match_id, queue_id, tft_set_number, game_datetime")
          .in("match_id", part)
          .gte("fetched_at", retentionCutoff),
        db.from("tft_match_participants").select("match_id, placement").eq("puuid", puuid).in("match_id", part),
      ]);
      if (matches.error || mine.error) {
        cacheOff("매치 읽기", (matches.error ?? mine.error)?.code);
        break;
      }
      const placements = new Map(mine.data.map((p) => [p.match_id as string, p.placement as number]));
      for (const m of matches.data) {
        // 이 PUUID의 참가자 행이 없으면(저장 도중 실패 등) 캐시에 없는 것으로 보고 다시 받는다
        // (매치 ID 목록이 이 PUUID 기준이라 정상이라면 참가자 행이 반드시 있다)
        const placement = placements.get(m.match_id as string);
        if (placement === undefined) continue;
        known.set(m.match_id as string, {
          queueId: m.queue_id as number,
          setNumber: Number.isInteger(m.tft_set_number) ? (m.tft_set_number as number) : null,
          gameDatetime: Date.parse(m.game_datetime as string),
          placement,
        });
      }
    }
  }

  // 새 상세 받기: 한도·간격·첫 실패에서 멈춤을 한 곳에서 관리한다
  const fetched: MatchDto[] = [];
  let newRequests = 0;
  async function ensureDetails(matchIds: string[]) {
    const missing = matchIds.filter((id) => !known.has(id));
    for (const part of chunks(missing, DETAIL_CONCURRENCY)) {
      if (stoppedBy) return;
      if (signal.aborted) {
        stoppedBy = "aborted";
        return;
      }
      if (newRequests + part.length > MAX_NEW_DETAILS) {
        stoppedBy = "budget";
        return;
      }
      newRequests += part.length;

      // 속도는 공용 제한기가 맞춘다 (동시에 들어온 다른 분석 요청과 합산)
      const results: PromiseSettledResult<MatchDto>[] = await Promise.allSettled(
        part.map((id) =>
          riotGet<MatchDto>(`${RIOT_ASIA}/tft/match/v1/matches/${encodeURIComponent(id)}`, headers, { signal })
        )
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          const dto = result.value;
          if (!dto?.metadata?.match_id || !Array.isArray(dto.info?.participants)) continue;
          fetched.push(dto);
          const myPlacement = dto.info.participants.find((p) => p.puuid === puuid)?.placement;
          known.set(dto.metadata.match_id, {
            queueId: dto.info.queue_id,
            setNumber: Number.isInteger(dto.info.tft_set_number) ? (dto.info.tft_set_number as number) : null,
            gameDatetime: dto.info.game_datetime,
            placement: isPlacement(myPlacement) ? myPlacement : null,
          });
        } else if (!stoppedBy) {
          // 한 번 실패하면 더 요청하지 않는다 (429면 재시도 폭주 방지, 취소·로컬 대기는 Riot 오류로 기록하지 않음)
          logRiotFailure("TFT Match", result.reason);
          stoppedBy = stopReasonOf(result.reason);
        }
      }
    }
  }

  // 3-2. 세트 경계 탐색: probe(i) = i부터 PROBE_WINDOW 안의 첫 랭크 매치
  const probe = async (index: number): Promise<ProbeResult> => {
    const end = Math.min(index + PROBE_WINDOW, ids.length);
    for (let j = index; j < end; j++) {
      await ensureDetails([ids[j]]);
      const m = known.get(ids[j]);
      if (!m) return "unknown";
      if (m.queueId === RANKED_TFT_QUEUE_ID && m.setNumber !== null) return { index: j, set: m.setNumber };
    }
    return "none";
  };
  // 선택한 시즌 구간을 찾으면 일단 멈춘다 → 분석에 한도를 먼저 쓰고, 남은 한도로 나머지 시즌을 이어서 찾는다
  const firstTarget = requestedSet ?? currentSet;
  let scan = await findSeasonSegments(ids.length, probe, PROBE_WINDOW, { stopAfterSet: firstTarget });

  // 분석할 세트: 요청값 → 현재 시즌 → (현재 시즌 확인 실패 시) 기록에서 가장 최근 세트
  const targetSet = firstTarget ?? scan.segments[0]?.set ?? null;

  // 4. 선택한 세트 구간에서 랭크 + 같은 세트만 최신순으로
  const ranked: RankedGame[] = [];
  let checked = 0;
  const segment = targetSet !== null ? segmentForSet(scan.segments, targetSet) : null;
  if (segment) {
    walk: for (let i = segment.start; i < segment.end && ranked.length < ANALYSIS_GAME_LIMIT; i += DETAIL_CONCURRENCY) {
      const part = ids.slice(i, Math.min(i + DETAIL_CONCURRENCY, segment.end));
      await ensureDetails(part);
      for (const id of part) {
        const m = known.get(id);
        // 확인하지 못한 매치에서 멈춘다 (건너뛰고 더 오래된 판을 섞지 않음)
        if (!m) break walk;
        checked += 1;
        if (m.queueId === RANKED_TFT_QUEUE_ID && m.setNumber === targetSet && m.placement !== null) {
          ranked.push({ matchId: id, placement: m.placement, gameDatetime: m.gameDatetime });
          if (ranked.length >= ANALYSIS_GAME_LIMIT) break walk;
        }
      }
    }
  }

  // 남은 한도로 나머지 시즌 탐색 (멈춤이 있었으면 더 요청하지 않음)
  if (scan.cursor !== null && !stoppedBy) {
    scan = await findSeasonSegments(ids.length, probe, PROBE_WINDOW, { resume: scan });
  }
  // 탐색이 중간에 끊겼거나 끝까지 못 갔으면 그 뒤 구간은 확인하지 못한 것
  if (!scan.complete || scan.cursor !== null) olderUnchecked = true;

  // 시즌 목록: 현재 시즌 + 실제로 발견된 세트 (최신순, 중복 없음)
  const foundSets = [...new Set(scan.segments.map((s) => s.set))];
  const seasonSets = [...new Set([...(currentSet !== null ? [currentSet] : []), ...foundSets])].sort(
    (a, b) => b - a
  );
  const seasons = seasonSets.map((set) => tftSeason(set, currentSet));

  // 시즌 상태
  const oldestFound = foundSets.length > 0 ? Math.min(...foundSets) : null;
  let seasonStatus: TftMatchesResponse["seasonStatus"];
  if (targetSet === null) {
    seasonStatus = olderUnchecked ? "beyond_range" : "no_games";
  } else if (!segment) {
    // 이 세트 기록을 못 찾음: 찾은 가장 오래된 세트보다 이전 시즌이고 더 오래된 기록이 남아 있으면 단정하지 않는다
    seasonStatus =
      olderUnchecked && (oldestFound === null || targetSet < oldestFound) ? "beyond_range" : "no_games";
  } else if (ranked.length < ANALYSIS_GAME_LIMIT && segment.end >= ids.length && olderUnchecked) {
    seasonStatus = "partial_range";
  } else {
    seasonStatus = ranked.length > 0 ? "ok" : "no_games";
  }

  // 5. 30일 지난 캐시 정리 → 새로 받은 매치 저장 (실패해도 분석 결과는 그대로 돌려준다)
  //    정리를 먼저 한다: 기간이 지난 행이 남아 있으면 같은 매치를 새로 받아도 저장(ON CONFLICT DO NOTHING)이 무시되고
  //    직후 정리에서 지워져 버리기 때문
  if (db && fetched.length > 0) {
    const [oldMatches, oldLookups] = await Promise.all([
      db.from("tft_matches").delete().lt("fetched_at", retentionCutoff),
      db.from("tft_match_id_lookups").delete().lt("checked_at", retentionCutoff),
    ]);
    if (oldMatches.error || oldLookups.error) {
      console.error(`TFT 매치 캐시 정리 실패 (${(oldMatches.error ?? oldLookups.error)?.code ?? "알 수 없음"})`);
    }
  }
  if (db && fetched.length > 0) {
    const matchRows = fetched.map((dto) => ({
      match_id: dto.metadata.match_id,
      queue_id: dto.info.queue_id,
      game_datetime: new Date(dto.info.game_datetime).toISOString(),
      game_length: typeof dto.info.game_length === "number" ? dto.info.game_length : null,
      tft_set_number: Number.isInteger(dto.info.tft_set_number) ? dto.info.tft_set_number : null,
      game_version: typeof dto.info.game_version === "string" ? dto.info.game_version.slice(0, 200) : null,
    }));
    // 참가자는 PUUID와 등수만 저장 (Riot ID·유닛·특성 등은 저장하지 않음)
    const participantRows = fetched.flatMap((dto) =>
      dto.info.participants
        .filter((p) => typeof p.puuid === "string" && isPlacement(p.placement))
        .map((p) => ({ match_id: dto.metadata.match_id, puuid: p.puuid, placement: p.placement }))
    );

    const saved = await db.from("tft_matches").upsert(matchRows, { onConflict: "match_id", ignoreDuplicates: true });
    if (saved.error) {
      cacheOff("매치 저장", saved.error.code);
    } else {
      const savedParticipants = await db
        .from("tft_match_participants")
        .upsert(participantRows, { onConflict: "match_id,puuid", ignoreDuplicates: true });
      if (savedParticipants.error) cacheOff("참가자 저장", savedParticipants.error.code);
    }
  }

  // 분석 기준: 20판을 모았거나 선택 시즌 구간을 끝까지 훑었으면 완료 (그 뒤 시즌 탐색이 멈춘 것은 olderUnchecked로 따로 알린다)
  // 취소된 요청: 받은 매치는 위에서 캐시에 저장했으니 결과는 만들지 않고 끝낸다
  if (stoppedBy === "aborted" || signal.aborted) return aborted();

  const complete =
    stoppedBy === null ||
    ranked.length >= ANALYSIS_GAME_LIMIT ||
    (segment !== null && checked >= segment.end - segment.start);

  const response: TftMatchesResponse = {
    success: true,
    queueId: RANKED_TFT_QUEUE_ID,
    seasons,
    season: targetSet !== null ? tftSeason(targetSet, currentSet) : null,
    currentSeasonKnown: currentSet !== null,
    analysis: analyzeRankedGames(ranked),
    seasonStatus,
    olderUnchecked,
    matchesChecked: checked,
    complete,
    stoppedBy: complete ? null : stoppedBy,
    retryAfterSeconds:
      !complete && stoppedBy === "rate_limit" && riotLimiter.cooldownRemainingMs() > 0
        ? Math.ceil(riotLimiter.cooldownRemainingMs() / 1000)
        : null,
    checkedAt: new Date(checkedAt).toISOString(),
  };
  return NextResponse.json(response);
}
