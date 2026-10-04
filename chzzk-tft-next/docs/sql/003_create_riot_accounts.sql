-- =====================================================================
-- TIERON 003: riot_accounts 테이블 생성 (Riot 계정 연결)
-- ---------------------------------------------------------------------
-- 검토용 파일이다. 코드나 스크립트가 자동 실행하지 않는다.
-- 실행 순서: 001 → 002 → 003 → 004
-- 실행: Supabase 대시보드 → SQL Editor에 전체를 붙여넣고 Run (한 번만)
-- 근거: docs/HANDOFF.md 7번(로그인과 DB), 8번(Riot 소유권 인증)
-- 기존 users, sessions 테이블은 바꾸지 않는다 (참조만 한다).
--
-- 연결 규칙
--   - users 1 : N riot_accounts. 행 자체는 여러 개일 수 있다 (해제된 기록 = revoked 보존)
--   - "현재 연결"(pending·verified)은 사용자당 하나만 → 부분 unique 인덱스
--   - 같은 PUUID는 verified 상태로 둘 이상의 TIERON 계정에 연결될 수 없다 → 부분 unique 인덱스
--     (pending까지 막으면 남의 Riot ID를 먼저 pending으로 걸어 진짜 주인의 연결을 막을 수 있다)
-- =====================================================================

begin;

create table public.riot_accounts (
  id                  uuid        primary key default gen_random_uuid(),
  -- 사용자가 삭제되면 연결된 Riot 계정 행도 함께 삭제
  user_id             uuid        not null references public.users (id) on delete cascade,
  -- Riot 계정의 실제 식별자. 닉네임·태그는 바뀌어도 PUUID는 그대로다
  puuid               text        not null check (char_length(puuid) between 1 and 100),
  -- 연결·갱신 시점의 Riot ID 표기 (표시용. 식별에는 쓰지 않는다)
  game_name           text        not null check (char_length(game_name) > 0),
  tag_line            text        not null check (char_length(tag_line) > 0),
  -- 서비스 지역. 현재는 KR만 지원 (지역을 늘릴 때 이 check를 바꾼다)
  region              text        not null default 'kr' check (region in ('kr')),
  -- pending: 연결 시작, 소유권 확인 전 / verified: 소유권 확인됨 / revoked: 연결 해제·무효
  verification_status text        not null default 'pending'
                      check (verification_status in ('pending', 'verified', 'revoked')),
  -- 소유권 확인 시각. 확인 전(pending)에는 null
  verified_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- 상태와 verified_at이 서로 어긋나지 않게
  --   verified → verified_at 필수 / pending → verified_at 없음 / revoked → 이전 기록이라 둘 다 허용
  constraint riot_accounts_verified_at_matches_status check (
    (verification_status <> 'verified' or verified_at is not null)
    and (verification_status <> 'pending' or verified_at is null)
  )
);

comment on table  public.riot_accounts       is 'TIERON 사용자와 연결된 Riot 계정. 소유권 확인 상태 포함';
comment on column public.riot_accounts.puuid is 'Riot PUUID (계정 식별자). game_name·tag_line은 표시용';
comment on column public.riot_accounts.verification_status is 'pending | verified | revoked';

-- 사용자당 현재 연결(pending·verified)은 하나만. revoked 기록은 여러 개 남을 수 있다
create unique index riot_accounts_one_active_per_user
  on public.riot_accounts (user_id)
  where verification_status in ('pending', 'verified');

-- 같은 PUUID가 verified 상태로 여러 TIERON 계정에 연결되지 않게
create unique index riot_accounts_verified_puuid_unique
  on public.riot_accounts (puuid)
  where verification_status = 'verified';

-- 사용자 삭제 시 cascade, 내 연결 기록 조회를 빠르게 (위 부분 인덱스는 revoked 행을 포함하지 않음)
create index riot_accounts_user_id_idx on public.riot_accounts (user_id);
-- PUUID로 기존 연결(다른 사용자의 pending 포함) 확인을 빠르게
create index riot_accounts_puuid_idx on public.riot_accounts (puuid);

-- ---------------------------------------------------------------------
-- updated_at 자동 갱신
-- ---------------------------------------------------------------------
-- search_path를 비워 두면 함수 안에서 다른 스키마의 같은 이름 객체로 바꿔치기되지 않는다
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger riot_accounts_set_updated_at
  before update on public.riot_accounts
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 접근 제어: users·sessions와 같은 방향
-- 브라우저(anon/authenticated)는 접근 불가, 서버의 Secret key(service_role)만 허용
-- ---------------------------------------------------------------------
-- RLS를 켜고 정책을 만들지 않는다 → anon/authenticated는 모든 행이 거부된다
alter table public.riot_accounts enable row level security;

-- 이중 잠금: 테이블 권한 자체도 회수
revoke all on table public.riot_accounts from anon, authenticated;
-- (set_updated_at은 트리거 함수라 PostgreSQL이 직접 호출을 막는다 → 별도 권한 회수 불필요)

commit;
