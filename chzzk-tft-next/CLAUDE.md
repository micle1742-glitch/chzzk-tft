@AGENTS.md

# TIERON — CLAUDE.md

> 이 파일은 Claude Code가 작업 시작 시 자동으로 읽는 프로젝트 안내서다.
> 이전 이름은 GG TIER. 모든 곳에서 **TIERON**을 사용한다.

## 한 줄 요약

치지직/게임 계정과 Riot 계정을 연결하고, Riot API 데이터로 TFT 티어를 인증·표시하는 게임 계정 인증 플랫폼(Next.js).
현재 `닉네임+태그 입력 → /api/search → Riot API → TIERON VERIFIED 카드` 흐름이 실제로 작동한다.

## 참고 문서

- 전체 구상과 Phase 1~7 로드맵: docs/ROADMAP.md (기능 기획이나 우선순위 판단이 필요할 때만 읽을 것)

## ⚠️ 가장 먼저 지킬 것

- **처음부터 다시 만들지 말 것.** `/tier`는 정상 작동 중이다. 기존 구현을 보존하며 수정한다.
- 작업 시작 시: `git status` 확인 → 관련 파일 읽기 → 수정.
- `.env.local`은 **실제 키 값을 출력하지 말 것.** 변수 이름만 확인한다.
- 한 번에 여러 파일을 대량 수정하지 말 것. 작업 범위를 작게 나눈다.
- 파일 전체 덮어쓰기 금지. 필요한 부분만 수정한다.

## 명령어 (Windows PowerShell)

프로젝트 위치: `C:\Users\Admin\Desktop\joljak\chzzk-tft\chzzk-tft-next`
PowerShell 실행 정책 때문에 `npx`/`npm` 대신 `.cmd`를 쓴다.

| 용도 | 명령 |
|---|---|
| 개발 서버 | `npm.cmd run dev` → http://localhost:3000 , /tier |
| 타입 검사 | `npm.cmd exec tsc -- --noEmit` |
| 상태 확인 | `git status`, `git diff` |

**실행 전 반드시 사용자 확인이 필요한 명령:** `git reset`, `git restore`, `git clean`, `rm`, `del`, `npm install`, 파일 전체 overwrite.
문제가 생기면 먼저 `git status` + `git diff`로 원인을 확인하고, 되돌리기 명령을 바로 실행하지 않는다.

## 기술 스택

- Next.js 16 (App Router, Turbopack), React, TypeScript, CSS
- 백엔드: Next.js API Route (예전 Express/server.js 구조에서 이전 완료. 바깥 `chzzk-tft` 폴더의 public/*.html 등은 예전 버전)
- 외부 API: Riot API (`RIOT_API_KEY`는 `.env.local`, 서버에서만 사용)
- Git: `main` 브랜치, GitHub origin/main 연동

## 구조

```
app/
├─ api/
│  ├─ auth/chzzk/      # 치지직 인증 (/api/auth/chzzk/me → 200 확인)
│  └─ search/          # POST: { nickname, tagline } → Riot API 조회
├─ login/page.tsx      # 치지직만 실제 대상, Google/Kakao/Facebook 비활성
├─ tier/page.tsx       # 티어 인증 페이지 (정상 작동)
├─ tier/tier.css
├─ page.tsx            # 홈 (네비: 홈, 게임, 티어 인증, 랭킹, 커뮤니티)
├─ home.css, globals.css, layout.tsx
```

## /tier 현재 구현

- 상태(useState): `nickname`, `tagline`, `result`, `message`, `loading`
- 빈 입력 검증, 로딩 중 버튼 "티어 확인 중..." + 입력/버튼 disabled, 실패 메시지
- 카드 표시: 지역 KR, 닉네임#태그, 티어/랭크, LP, 승/패, 승률, VERIFIED BY TIERON
- 승률 = `wins / (wins + losses) * 100`, 소수점 첫째 자리
- 티어 엠블럼은 자체 UI로 임시 구현 (Riot 공식 아이콘 미사용)
- 조회 결과는 저장하지 않음 → 새로고침 시 사라짐 (의도된 현재 상태)
- 주의: 현재는 "티어 조회"이지 "계정 소유권 인증"이 아니다.

## 데이터 원칙

- Riot API가 제공하는 데이터만 정확하게 표시한다.
- Top 4, 평균 순위 등 확실히 제공되지 않는 값을 **임의로 만들지 않는다.**

## 디자인 규칙

- 거의 검은 배경 + 다크 그린, 민트/청록 네온 포인트, 은은한 glow
- 얇은 테두리, 둥근 반투명 다크 카드, 추상적 기하학/입자 효과
- 정보 70% : 장식 30%, 깔끔한 정보 중심 UI
- HOME / LOGIN / TIER / RANKING / COMMUNITY 모두 같은 시각 언어
- **Riot 캐릭터 사용 금지, Riot 공식 UI 복제 금지.** 데이터는 Riot, 브랜드/UI는 TIERON 자체.
- 모션은 중요한 순간에만 쓴다: 인증 카드 등장, 계정 연결 단계 완료(체크가 하나씩 켜지는 방식).
- 네비게이션, 목록, 입력 폼 등 자주 쓰는 UI에는 애니메이션을 넣지 않는다.
- 인트로는 첫 방문 시에만 표시(localStorage로 기록), 한 번에 부드럽게 나타나는 단순한 화면, 건너뛰기 가능.

## 보안 원칙

- API 키는 서버 전용, 클라이언트 노출 금지
- 로그인 상태가 기존에 localStorage로 유지되던 부분이 있음 → **최종 인증 구조로 쓰지 않는다**
- 최종 목표: 서버 세션 / HttpOnly·Secure·SameSite 쿠키 / DB
- localStorage는 최근 검색값, UI 설정 같은 편의 데이터에만 사용
- 고려 항목: OAuth state 검증, 서버 권한 검사, Parameterized Query(SQL Injection), XSS, IDOR, 입력값 검증, Rate Limit

## 남은 작업 (우선순위)

1. **UI 안정화** — 카드 세부 디자인, 엠블럼 결정, 모바일 확인, 전체 디자인 통일, 남은 "GG TIER" 표기 → TIERON, CSS 중복 정리, 홈 내부 링크 `<a>` → `next/link`의 `<Link>`, 첫 방문 인트로 화면, 인증 기능 컴포넌트화(인트로·홈·/tier 공용)
2. **치지직 인증** — OAuth 흐름 완성, 서버 세션, HttpOnly 쿠키
3. **Riot 계정 연결** — 치지직 ↔ Riot 계정 소유권 확인 (RSO는 Production Key 필요해 미확정)
4. **DB** — Supabase/PostgreSQL. 테이블: `users`, `riot_accounts`, `tier_verifications`
5. **기능 확장** — 게임, 랭킹, 커뮤니티, 프로필/스트리머 페이지
6. **보안 강화 및 배포**

## 알려진 이슈

- "multiple lockfiles" 경고: 상위 `chzzk-tft` 폴더에도 package-lock.json이 있어서 발생. 실행엔 문제없음, 나중에 정리.
- Riot Development API Key는 24시간마다 만료된다. `Unknown apikey (401)`이 나오면 키 재발급 후 `.env.local` 교체 + 서버 재시작.

## 사용자에게 설명하는 방식 (중요)

- 추상적 설명보다 **"지금 뭘 해야 하는지" 단계별로** 안내한다.
- 사용자가 직접 수정할 때: 파일명 → `Ctrl + F` 검색어 → 지울 부분/넣을 부분 → `Ctrl + S` → 실행할 명령 순서로 명확히.
- 코드를 바꿀 때 **"왜 이렇게 하는지"를 짧게** 같이 설명한다. (사용자는 Next.js, React, 서버/클라이언트 구조, DB, SQL, 인증/OAuth, 쿠키, API 보안, Git을 공부 중)
- 작업 후 확인 순서: diff 확인 → 타입 검사 → 브라우저 확인 → 정상이면 commit 제안.