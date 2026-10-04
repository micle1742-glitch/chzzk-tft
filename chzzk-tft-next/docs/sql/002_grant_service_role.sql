-- =====================================================================
-- TIERON 002: 서버(Secret key = service_role)에 users, sessions 권한 부여
-- ---------------------------------------------------------------------
-- 검토용 파일이다. 코드나 스크립트가 자동 실행하지 않는다.
-- 실행: Supabase 대시보드 → SQL Editor에 전체를 붙여넣고 Run (여러 번 실행해도 안전)
--
-- 왜 필요한가: 001 실행 후 Secret key로 조회하면 "permission denied for table users"(42501)가 났다.
--   service_role은 RLS는 우회하지만 테이블 권한(GRANT)은 따로 있어야 한다.
--   이 프로젝트에서는 새 테이블에 service_role 권한이 자동으로 붙지 않았으므로 직접 부여한다.
-- 브라우저용 역할(anon, authenticated)에는 여전히 아무 권한도 주지 않는다 (001의 revoke 유지).
-- =====================================================================

grant select, insert, update, delete on table public.users    to service_role;
grant select, insert, update, delete on table public.sessions to service_role;
