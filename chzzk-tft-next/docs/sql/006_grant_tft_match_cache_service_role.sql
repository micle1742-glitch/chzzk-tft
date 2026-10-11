-- =====================================================================
-- TIERON 006: 서버(Secret key = service_role)에 TFT 매치 캐시 테이블 권한 부여
-- ---------------------------------------------------------------------
-- 검토용 파일이다. 코드나 스크립트가 자동 실행하지 않는다.
-- 실행: 005 다음에 Supabase SQL Editor에서 Run (여러 번 실행해도 안전)
--
-- 왜 필요한가: 002·004와 같은 이유. 이 프로젝트에서는 새 테이블에 service_role 권한이 자동으로
--   붙지 않아서(001 실행 후 42501 permission denied 확인) 직접 부여한다.
-- 브라우저용 역할(anon, authenticated)에는 아무 권한도 주지 않는다 (005의 revoke 유지).
--
-- 최소 권한 (app/api/tft/matches/route.ts가 실제로 하는 일만)
--   tft_matches            select·insert·delete  (저장은 ON CONFLICT DO NOTHING이라 update 불필요, delete는 30일 정리)
--   tft_match_participants select·insert·delete  (update 불필요. delete는 매치 정리 시 on delete cascade로 함께 지워지는 행)
--   tft_match_id_lookups   select·insert·update·delete  (목록 갱신이 ON CONFLICT DO UPDATE라 update 필요, delete는 30일 정리)
-- =====================================================================

grant select, insert, delete         on table public.tft_matches            to service_role;
grant select, insert, delete         on table public.tft_match_participants to service_role;
grant select, insert, update, delete on table public.tft_match_id_lookups   to service_role;
