@AGENTS.md

# TIERON — CLAUDE.md

> 이 파일은 Claude Code가 작업 시작 시 자동으로 읽는 프로젝트 안내서다.
> 이전 이름은 GG TIER. 모든 곳에서 **TIERON**을 사용한다.

## 한 줄 요약

치지직/게임 계정과 Riot 계정을 연결하고, Riot API 데이터로 TFT 티어를 인증·표시하는 게임 계정 인증 플랫폼(Next.js).
현재 `닉네임+태그 입력 → /api/search → Riot API → TIERON VERIFIED 카드` 흐름이 실제로 작동한다.

## 참고 문서

- 기획 확정 사항과 구축 방식: docs/HANDOFF.md (작업 시작 시 한 번 읽을 것. 디자인 규칙이 이 파일과 충돌하면 HANDOFF.md가 우선)
- 전체 구상과 Phase 1~7 로드맵: docs/ROADMAP.md (기능 기획이나 우선순위 판단이 필요할 때만 읽을 것)

## 디자인 참고 이미지

- 참고 이미지와 디자인 시안은 전부 docs/design/에 있다. 채팅에 첨부가 없어도 거기 있다고 가정한다. 파일별 역할은 docs/design/README.md에 있다.
- PNG는 .gitignore 대상이라 검색(Glob, Grep)에 안 잡힐 수 있다. 검색하지 말고 `ls docs/design`으로 목록을 보고, 경로로 직접 열어서(Read) 눈으로 확인한다.
- 화면 작업 전에 관련된 시안 한 장만 열어서 본 뒤 구현한다. 시안 안의 그림·문구·수치는 자리표시다(HANDOFF.md 4번).
- 어느 파일을 봐야 할지 모르겠거나 시안이 없으면 추측해서 구현하지 말고, 사용자에게 어디서 볼 수 있는지 먼저 묻는다.

## ⚠️ 가장 먼저 지킬 것

- **처음부터 다시 만들지 말 것.** `/tier`는 정상 작동 중이다. 기존 구현을 보존하며 수정한다.
- 작업 시작 시: `git status` 확인 → 관련 파일 읽기 → 수정.
- `.env.local`은 **실제 키 값을 출력하지 말 것.** 변수 이름만 확인한다.
- 한 번에 여러 파일을 대량 수정하지 말 것. 작업 범위를 작게 나눈다.
- 파일 전체 덮어쓰기 금지. 필요한 부분만 수정한다.

## 작업 방식 (토큰 절약)

- 검증은 최소로 한다. 이미 확인한 작업은 다시 확인하지 말고, 바꾼 부분만 확인한다.
- 보고는 바꾼 파일과 한 줄 요약으로 짧게 한다.
- 되돌리기 쉬운 일은 묻지 말고 진행한다.
- 로그인·DB·API 변경, 파괴적 git 명령, `.env` 같은 위험한 작업은 그대로 확인받는다.

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

목표 구조는 HANDOFF.md 9번이며 랜딩 리디자인 때 옮긴다.

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

> 상세 방향은 docs/HANDOFF.md 3번을 따른다.

- 거의 검은 배경 + 딥그린, 민트는 포인트로 절제해서 사용. 강한 네온·glow·방패·크리스털·3D·복잡한 기하학 장식 금지
- 얇은 테두리, 둥근 다크 카드, 여백이 넉넉한 미니멀 레이아웃 (Apple, 치지직 개발자 페이지 참고)
- 정보 70 : 장식 30, 깔끔한 정보 중심 UI
- HOME / LOGIN / TIER / RANKING / COMMUNITY 모두 같은 시각 언어
- Riot 캐릭터 사용 금지, Riot 공식 UI 복제 금지. 데이터는 Riot, 브랜드/UI는 TIERON 자체.
- 모션은 중요한 순간에만 쓴다: 인증 카드 등장, 계정 연결 단계 완료(체크가 하나씩 켜지는 방식), 랜딩의 스크롤 등장 효과(한 번만 재생, prefers-reduced-motion에서는 끔).
- 네비게이션, 목록, 입력 폼 등 자주 쓰는 UI에는 애니메이션을 넣지 않는다.

## 보안 원칙

- API 키는 서버 전용, 클라이언트 노출 금지
- 로그인 상태가 기존에 localStorage로 유지되던 부분이 있음 → **최종 인증 구조로 쓰지 않는다**
- 최종 목표: 서버 세션 / HttpOnly·Secure·SameSite 쿠키 / DB
- localStorage는 최근 검색값, UI 설정 같은 편의 데이터에만 사용
- 고려 항목: OAuth state 검증, 서버 권한 검사, Parameterized Query(SQL Injection), XSS, IDOR, 입력값 검증, Rate Limit

## 남은 작업 (우선순위)

> 순서와 상세는 docs/HANDOFF.md 11번을 따른다.

1. **현재 코드·CSS 파악** (수정 없음) → 살릴 것/바꿀 것 정리
2. **랜딩 리디자인** — 구조 먼저, 시그니처 선·나타나는 효과는 나중. 페이지 구조도 이때 HANDOFF 9번으로 옮긴다
3. **치지직 로그인·세션·`users` 자동 가입** — OAuth state 검증과 로그아웃은 완료, 서버 세션(HttpOnly 쿠키)과 `users`가 남음
4. **DB·홈 허브·권한 구분** — Supabase/PostgreSQL. 테이블: `users`, `riot_accounts`, `tier_verifications`
5. **인증 페이지** (Riot 소유권 확인은 임시, RSO는 Production Key 필요해 미확정) → 인증 완료 화면, 카드 두 상태
6. **티어 조회 수정**(조회 상태 문구·기준 시각·쿨다운), **공개 프로필**
7. **커뮤니티** (글쓰기는 로그인만), 랭킹은 준비 중
8. 이후: README·ERD·아키텍처 다이어그램, 배포 전 보안 점검

## 알려진 이슈

- "multiple lockfiles" 경고: 상위 `chzzk-tft` 폴더에도 package-lock.json이 있어서 발생. 실행엔 문제없음, 나중에 정리.
- Riot Development API Key는 24시간마다 만료된다. `Unknown apikey (401)`이 나오면 키 재발급 후 `.env.local` 교체 + 서버 재시작.

## 사용자에게 설명하는 방식 (중요)

- 추상적 설명보다 **"지금 뭘 해야 하는지" 단계별로** 안내한다.
- 사용자가 직접 수정할 때: 파일명 → `Ctrl + F` 검색어 → 지울 부분/넣을 부분 → `Ctrl + S` → 실행할 명령 순서로 명확히.
- 코드를 바꿀 때 **"왜 이렇게 하는지"를 짧게** 같이 설명한다. (사용자는 Next.js, React, 서버/클라이언트 구조, DB, SQL, 인증/OAuth, 쿠키, API 보안, Git을 공부 중)
- 작업 후 확인 순서: diff 확인 → 타입 검사 → 브라우저 확인 → 정상이면 commit 제안.