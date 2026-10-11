-- =====================================================================
-- TIERON 008: 서버(Secret key = service_role)에 overlays 권한 부여
-- ---------------------------------------------------------------------
-- 검토용 파일이다. 코드나 스크립트가 자동 실행하지 않는다.
-- 실행: 007 다음에 Supabase SQL Editor에서 Run (여러 번 실행해도 안전)
--
-- 왜 필요한가: 002·004·006과 같은 이유. 이 프로젝트에서는 새 테이블에 service_role 권한이 자동으로
--   붙지 않아서(001 실행 후 42501 permission denied 확인) 직접 부여한다.
-- 브라우저용 역할(anon, authenticated)에는 아무 권한도 주지 않는다 (007의 revoke 유지).
--
-- 필요한 권한 (예정된 서버 코드가 하는 일)
--   select  오버레이 조회(token_hash), 관리 요청(manage_key_hash)
--   insert  주소 발급
--   update  재발급(token_hash 교체·rotated_at), 폐기(revoked_at), 표시용 Riot ID·last_seen_at 갱신
--   delete  오래 안 쓴·폐기된 오버레이 정리
-- =====================================================================

grant select, insert, update, delete on table public.overlays to service_role;
