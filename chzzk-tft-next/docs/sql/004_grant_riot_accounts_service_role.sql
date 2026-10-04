-- =====================================================================
-- TIERON 004: 서버(Secret key = service_role)에 riot_accounts 권한 부여
-- ---------------------------------------------------------------------
-- 검토용 파일이다. 코드나 스크립트가 자동 실행하지 않는다.
-- 실행: 003 다음에 Supabase SQL Editor에서 Run (여러 번 실행해도 안전)
--
-- 왜 필요한가: 002와 같은 이유. 이 프로젝트에서는 새 테이블에 service_role 권한이 자동으로
--   붙지 않아서(001 실행 후 42501 permission denied 확인) 직접 부여한다.
-- 브라우저용 역할(anon, authenticated)에는 아무 권한도 주지 않는다 (003의 revoke 유지).
-- =====================================================================

grant select, insert, update, delete on table public.riot_accounts to service_role;
