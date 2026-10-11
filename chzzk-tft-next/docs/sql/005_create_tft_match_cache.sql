-- =====================================================================
-- TIERON 005: TFT 매치 캐시 테이블 (전적 분석 1단계: /riot "최근 랭크 20판")
-- ---------------------------------------------------------------------
-- 검토용 파일이다. 코드나 스크립트가 자동 실행하지 않는다.
-- 실행 순서: 001 → 002 → 003 → 004 → 005 → 006
-- 실행: Supabase 대시보드 → SQL Editor에 전체를 붙여넣고 Run (한 번만)
-- 새 테이블 3개와 인덱스만 만든다. 기존 테이블을 바꾸거나 지우지 않는다 (drop·alter 기존 테이블 없음).
-- 다시 실행하면: 첫 create table에서 "already exists" 오류 → begin~commit 전체가 취소되어 아무것도 바뀌지 않는다 (안전)
-- 근거: docs/HANDOFF.md 5번 "전적 분석 영역"
-- 기존 users, sessions, riot_accounts 테이블은 바꾸지 않는다 (참조도 하지 않는다).
--
-- 왜 캐시가 필요한가
--   20판 분석 = 매치 ID 목록 1회 + 매치 상세 최대 수십 회 Riot 호출. 캐시 없이 매번 부르면 요청 한도(429)에 바로 걸린다.
--   끝난 매치는 바뀌지 않으므로 상세는 한 번 받으면 다시 부르지 않는다. 매치 ID 목록만 짧은 주기로 새로 받는다.
--
-- 저장 범위 (최소 수집)
--   - 분석에 필요한 값만 저장한다: 매치 공통 정보 + 참가자별 PUUID·등수.
--   - Riot ID(게임 이름·태그), 유닛·특성·증강 등은 1단계에서 쓰지 않으므로 저장하지 않는다.
--   - PUUID는 Riot 계정 식별자다 → 개인정보처리방침에 "전적 분석용 매치 캐시" 항목과 보관 기간을 추가한 뒤 적용한다.
--
-- 보관 정책 (서버 코드 app/api/tft/matches/route.ts가 수행)
--   - 매치 ID 목록: 5분 안에는 다시 받지 않는다 (쿨다운). 30일 지난 행은 삭제
--   - 매치 상세(tft_matches + 참가자): 받은 지 30일 지나면 삭제 (참가자 행은 on delete cascade)
--   - 정리는 분석 요청이 새 데이터를 저장할 때 함께 실행한다 (별도 예약 작업 없음)
--
-- 시즌(세트)별 분석 (docs/HANDOFF.md 5번)
--   - 매치 ID는 PUUID당 최대 300개까지 저장한다 (시즌 탐색 범위)
--   - 시즌 구분은 tft_matches.tft_set_number로 한다. 시즌 경계 탐색 결과는 따로 저장하지 않는다:
--     탐색에 쓴 매치 상세가 이 캐시에 남으므로, 다시 탐색할 때는 Riot 호출 없이 DB 읽기만으로 같은 결과가 나온다
--   - 현재 시즌(세트 번호)은 DB가 아니라 서버 메모리에 6시간 캐시한다 (app/lib/tft-current-season.ts)
--
-- 테이블
--   1. tft_matches              매치 1판 = 1행 (TFT-MATCH-V1 MatchDto.info 일부)
--   2. tft_match_participants   매치 1판의 참가자 8명 = 8행 (ParticipantDto 일부)
--   3. tft_match_id_lookups     PUUID별 "최근 매치 ID 목록" 응답과 받은 시각 (재조회 쿨다운용)
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. tft_matches: 매치 공통 정보. 끝난 매치라 한 번 저장하면 바뀌지 않는다
-- ---------------------------------------------------------------------
create table public.tft_matches (
  -- Riot 매치 ID (예: KR_1234567890). MetadataDto.match_id
  match_id        text        primary key check (char_length(match_id) between 1 and 64),
  -- 큐 종류 (InfoDto.queue_id). 랭크 판별에 쓴다. 랭크 외 매치도 "랭크 아님"을 기억하려고 저장한다
  queue_id        integer     not null,
  -- 게임 시각 (InfoDto.game_datetime, 밀리초 epoch → timestamptz로 변환해서 저장. 최신순 정렬·기간 표시용)
  game_datetime   timestamptz not null,
  -- 게임 길이(초), 시즌(세트) 번호, 게임 버전: 기준 표시·향후 필터용
  game_length     real,
  tft_set_number  integer,
  game_version    text        check (game_version is null or char_length(game_version) <= 200),
  -- TIERON이 Riot에서 받아 저장한 시각
  fetched_at      timestamptz not null default now()
);

comment on table  public.tft_matches          is 'TFT 매치 캐시 (TFT-MATCH-V1). 끝난 매치라 갱신하지 않는다. fetched_at 기준 30일 보관';

-- 30일 보관 정리(서버 코드가 fetched_at < now() - 30일 행을 삭제 → 참가자 행은 cascade)를 빠르게
create index tft_matches_fetched_at_idx on public.tft_matches (fetched_at);
comment on column public.tft_matches.queue_id is 'InfoDto.queue_id. 랭크 여부 판별용';

-- ---------------------------------------------------------------------
-- 2. tft_match_participants: 참가자별 등수. 분석은 "이 PUUID의 등수"만 읽는다
-- ---------------------------------------------------------------------
create table public.tft_match_participants (
  -- 매치가 삭제되면 참가자 행도 함께 삭제
  match_id   text    not null references public.tft_matches (match_id) on delete cascade,
  puuid      text    not null check (char_length(puuid) between 1 and 100),
  -- 최종 등수 1~8 (ParticipantDto.placement)
  placement  smallint not null check (placement between 1 and 8),
  primary key (match_id, puuid)
);

comment on table public.tft_match_participants is 'TFT 매치 참가자별 등수. 전적 분석 계산의 원본 값';

-- 한 PUUID의 매치들을 빠르게 찾기 (기본키는 match_id가 앞이라 puuid 검색에 못 쓴다)
create index tft_match_participants_puuid_idx on public.tft_match_participants (puuid);

-- ---------------------------------------------------------------------
-- 3. tft_match_id_lookups: PUUID별 최근 매치 ID 목록 캐시
--    새 게임이 생길 수 있어 영구 저장하지 않고, checked_at으로 재조회 쿨다운을 판단한다 (서버 코드에서 n분)
-- ---------------------------------------------------------------------
create table public.tft_match_id_lookups (
  puuid       text        primary key check (char_length(puuid) between 1 and 100),
  -- Riot이 돌려준 순서(최신순) 그대로. 최대 300개 (100개씩 3페이지 — 시즌 탐색 범위)
  match_ids   text[]      not null default '{}' check (cardinality(match_ids) <= 300),
  checked_at  timestamptz not null default now()
);

comment on table public.tft_match_id_lookups is 'PUUID별 최근 TFT 매치 ID 목록과 받은 시각. 재조회 쿨다운(5분)용, checked_at 기준 30일 보관';

create index tft_match_id_lookups_checked_at_idx on public.tft_match_id_lookups (checked_at);

-- ---------------------------------------------------------------------
-- 접근 제어: users·sessions·riot_accounts와 같은 방향
-- 브라우저(anon/authenticated)는 접근 불가, 서버의 Secret key(service_role)만 허용 (권한 부여는 006)
-- ---------------------------------------------------------------------
-- RLS를 켜고 정책을 만들지 않는다 → anon/authenticated는 모든 행이 거부된다
alter table public.tft_matches            enable row level security;
alter table public.tft_match_participants enable row level security;
alter table public.tft_match_id_lookups   enable row level security;

-- 이중 잠금: 테이블 권한 자체도 회수
revoke all on table public.tft_matches            from anon, authenticated;
revoke all on table public.tft_match_participants from anon, authenticated;
revoke all on table public.tft_match_id_lookups   from anon, authenticated;

commit;
