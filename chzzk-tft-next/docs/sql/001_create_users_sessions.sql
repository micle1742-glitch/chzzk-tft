-- =====================================================================
-- TIERON 001: users, sessions 테이블 생성
-- ---------------------------------------------------------------------
-- 검토용 파일이다. 코드나 스크립트가 자동 실행하지 않는다.
-- 실행: Supabase 대시보드 → SQL Editor에 전체를 붙여넣고 Run (한 번만)
-- 근거: docs/HANDOFF.md 7번(로그인과 DB)
--
-- [확인 필요] chzzk_id에는 치지직 /open/v1/users/me 응답의 channelId를 넣을 예정이다.
--   channelId가 바뀌지 않는 고유 식별자인지는 치지직 개발자 문서에서 아직 확인하지 않았다.
--   (HANDOFF.md 12번) 확인 전까지는 이 가정 위에서 개발만 하고, 실제 사용자 데이터는 쌓지 않는다.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- users: 치지직 로그인으로 자동 가입한 TIERON 사용자
-- ---------------------------------------------------------------------
create table public.users (
  -- TIERON 자체 기본키. 외부 서비스 ID(chzzk_id)를 기본키로 쓰지 않는다
  id            uuid        primary key default gen_random_uuid(),
  -- 치지직 고유 식별값 (현재 계획: channelId) — 같은 치지직 계정은 한 번만 가입
  chzzk_id      text        not null unique,
  -- 치지직 닉네임. 로그인할 때마다 최신 값으로 갱신
  display_name  text        not null check (char_length(display_name) > 0),
  -- 공개 프로필 노출 여부
  is_public     boolean     not null default true,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

comment on table  public.users          is 'TIERON 사용자. 치지직 OAuth 첫 로그인 시 자동 가입';
comment on column public.users.chzzk_id is '치지직 channelId (안정적인 고유값인지 확인 필요)';

-- ---------------------------------------------------------------------
-- sessions: 로그인 세션 (기기마다 한 행)
-- 쿠키에는 무작위 토큰 원문, DB에는 그 SHA-256 해시(hex 64자)만 저장한다
-- → DB가 유출돼도 해시로는 쿠키를 만들 수 없다
-- ---------------------------------------------------------------------
create table public.sessions (
  id         text        primary key check (id ~ '^[0-9a-f]{64}$'),
  user_id    uuid        not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at)
);

comment on table  public.sessions    is '로그인 세션. id = 세션 토큰의 SHA-256 hex';
comment on column public.sessions.id is '쿠키 토큰 원문이 아니라 SHA-256 해시';

-- 한 사용자의 세션 전체 조회·삭제(모든 기기 로그아웃), 사용자 삭제 시 cascade를 빠르게
create index sessions_user_id_idx on public.sessions (user_id);
-- 만료된 세션 일괄 정리(delete ... where expires_at < now())를 빠르게
create index sessions_expires_at_idx on public.sessions (expires_at);

-- ---------------------------------------------------------------------
-- 접근 제어: 브라우저(anon/authenticated 키)로는 접근 불가, 서버의 Secret key만 허용
-- ---------------------------------------------------------------------
-- RLS를 켜고 정책을 하나도 만들지 않는다 → anon/authenticated는 모든 행이 거부된다.
-- service_role(Secret key)은 RLS를 우회하므로 서버 코드(app/lib/db.ts)는 정상 동작한다.
alter table public.users    enable row level security;
alter table public.sessions enable row level security;

-- 이중 잠금: 정책 실수로 RLS가 풀려도 브라우저용 역할에는 테이블 권한 자체가 없게 한다
revoke all on table public.users    from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;

commit;
