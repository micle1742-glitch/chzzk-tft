-- =====================================================================
-- TIERON 007: overlays 테이블 생성 (스트리머별 비밀 OBS 오버레이 주소)
-- ---------------------------------------------------------------------
-- 검토용 파일이다. 코드나 스크립트가 자동 실행하지 않는다.
-- 실행 순서: 001 → 002 → (003 → 004) → (005 → 006) → 007 → 008
-- 실행: Supabase 대시보드 → SQL Editor에 전체를 붙여넣고 Run (한 번만)
-- 기존 테이블·정책은 바꾸지 않는다 (users를 참조만 한다).
--
-- 설계 요약
--   - 오버레이 주소: /overlay/tft/<토큰>. Riot ID를 주소에 넣지 않는다
--   - 토큰·관리 키 원문은 저장하지 않는다. sessions와 같이 SHA-256 hex(64자)만 저장
--     (생성·해시: app/lib/overlay-token.ts) → DB가 유출돼도 해시로는 주소·관리 권한을 만들 수 없다
--   - 오버레이 토큰(주소)과 관리 키(재발급·삭제 권한)는 서로 다른 난수 → 주소가 새어도 남이 재발급할 수 없다
--   - 재발급: 같은 행의 token_hash를 새 값으로 바꾼다 → 이전 토큰은 어디에도 남지 않아 즉시 무효
--   - Riot 계정 소유권 인증과는 무관하다 (riot_accounts와 분리). 누구 Riot ID로든 발급될 수 있는 "조회" 정보
--   - 로그인 없이도 발급할 수 있다 (치지직 로그인 필수화는 출시 단계). 로그인 상태로 발급하면 user_id를 남긴다
-- =====================================================================

begin;

create table public.overlays (
  id              uuid        primary key default gen_random_uuid(),

  -- 오버레이 토큰(주소에 들어가는 값)의 SHA-256 hex. 조회는 이 값으로 한다
  token_hash      text        not null unique check (token_hash ~ '^[0-9a-f]{64}$'),

  -- 관리 키(재발급·삭제 권한)의 SHA-256 hex. 관리 요청은 이 값으로 행을 찾는다
  manage_key_hash text        not null unique check (manage_key_hash ~ '^[0-9a-f]{64}$'),

  -- 로그인 상태로 발급했을 때만 채운다. 사용자가 삭제되면 그 사용자의 오버레이도 삭제
  user_id         uuid        references public.users (id) on delete cascade,

  -- 조회 기준이 되는 Riot 계정 식별자 (닉네임·태그가 바뀌어도 그대로)
  puuid           text        not null check (char_length(puuid) between 1 and 100),

  -- 표시용 Riot ID (발급 시점 값, 이후 puuid로 갱신). 식별에는 쓰지 않는다
  game_name       text        not null check (char_length(game_name) > 0),
  tag_line        text        not null check (char_length(tag_line) > 0),

  created_at      timestamptz not null default now(),
  -- 마지막 재발급 시각 (재발급한 적 없으면 null)
  rotated_at      timestamptz,
  -- 오버레이가 마지막으로 조회된 시각 (오래 안 쓴 오버레이 정리용, 매 요청마다가 아니라 간격을 두고 갱신)
  last_seen_at    timestamptz,
  -- 삭제(폐기) 시각. null이 아니면 이 토큰으로는 조회되지 않는다
  revoked_at      timestamptz,

  -- 같은 난수가 두 칸에 들어가는 실수를 막는다
  constraint overlays_token_differs_from_manage_key check (token_hash <> manage_key_hash),
  -- 시각 순서가 어긋나지 않게
  constraint overlays_timestamps_after_created check (
    (rotated_at   is null or rotated_at   >= created_at)
    and (last_seen_at is null or last_seen_at >= created_at)
    and (revoked_at   is null or revoked_at   >= created_at)
  )
);

comment on table  public.overlays                 is '스트리머별 비밀 OBS 오버레이 주소. Riot 소유권 인증 아님 (조회 정보)';
comment on column public.overlays.token_hash      is '오버레이 토큰 원문이 아니라 SHA-256 hex';
comment on column public.overlays.manage_key_hash is '관리 키 원문이 아니라 SHA-256 hex';
comment on column public.overlays.puuid           is 'Riot PUUID (조회 기준). game_name·tag_line은 표시용';
comment on column public.overlays.revoked_at      is 'null이 아니면 폐기된 오버레이';

-- token_hash·manage_key_hash는 unique 제약이 인덱스를 만든다 (조회·관리 요청용)

-- 로그인 사용자의 오버레이 목록·사용자 삭제 시 cascade를 빠르게 (로그인 없이 발급한 행은 제외)
create index overlays_user_id_idx on public.overlays (user_id) where user_id is not null;

-- 오래 안 쓴 오버레이 정리(delete ... where last_seen_at < now() - interval '90 days')를 빠르게
create index overlays_last_seen_at_idx on public.overlays (last_seen_at);

-- ---------------------------------------------------------------------
-- 접근 제어: users·sessions(001)와 같은 방향
-- 브라우저(anon/authenticated)는 접근 불가, 서버의 Secret key(service_role)만 허용 (권한 부여는 008)
-- ---------------------------------------------------------------------

-- RLS를 켜고 정책을 만들지 않는다 → anon/authenticated는 모든 행이 거부된다
alter table public.overlays enable row level security;

-- 이중 잠금: 정책 실수로 RLS가 풀려도 브라우저용 역할에는 테이블 권한 자체가 없게 한다
revoke all on table public.overlays from anon, authenticated;

commit;
