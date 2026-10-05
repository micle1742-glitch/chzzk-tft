import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../components/LegalFooter";
import LogoutButton from "../components/LogoutButton";
import SiteNav from "../components/SiteNav";
import { getSession } from "../lib/session";
import "../legal.css";
import "./mypage.css";

export const metadata: Metadata = {
  title: "마이페이지 | TIERON",
  description: "내 TIERON 프로필과 인증 정보",
};

/*
 * 마이페이지 UI 뼈대.
 * - 실제로 표시하는 데이터는 로그인 세션의 치지직 닉네임뿐이다 (getSession — 기존 세션 로직 그대로 사용)
 * - Riot 계정 연결·소유권 인증(RSO), 인증 카드, 프로필 편집은 아직 없으므로
 *   가짜 티어·LP 없이 "아직 인증되지 않음 / 준비 중" 상태로만 보여 준다
 * - 로그인하지 않았으면 같은 레이아웃에서 로그인 안내를 보여 준다 (강제 리다이렉트 없음)
 */
// 게임 티어 카드 목록. 다른 게임(Steam 등)이 생기면 여기에 추가하면 된다
const TIER_GAMES = [
  { game: "TFT", fullName: "Teamfight Tactics" },
  { game: "LoL", fullName: "League of Legends" },
];

// 내 활동에 앞으로 기록될 활동 종류 (실제 기록이 아니라 안내용)
const ACTIVITY_KINDS = ["TIERON 가입", "프로필 생성", "Riot 계정 인증", "인증 카드 생성"];

// 인증 카드 한 장의 데이터 형태. 소유권 인증(RSO 등)이 붙으면 서버에서 채운다
type CertCard = {
  game: string; // 예: "TFT"
  riotId: string; // 게임 이름#태그
  tier: string;
  rank: string;
  leaguePoints: number;
  verifiedAt: string; // ISO 시각
};

export default async function MyPage() {
  const session = await getSession();

  // 아직 인증 카드를 저장·조회하는 기능이 없으므로 항상 빈 목록 → 빈 상태 표시 (가짜 카드 없음)
  const certCards: CertCard[] = [];

  return (
    <div className="mp-page">
      <SiteNav />

      <main className="mp-main">
        <header className="mp-head">
          <p className="mp-eyebrow">MY PAGE</p>
          <h1>마이페이지</h1>
          <p className="mp-desc">내 TIERON 프로필과 인증 정보를 관리하세요.</p>
        </header>

        <div className="mp-top">
          {/* 1. 프로필 카드 */}
          <section className="mp-card mp-profile" aria-labelledby="mp-profile-title">
            <h2 id="mp-profile-title" className="mp-sr-only">프로필</h2>

            <div className="mp-profile-head">
              {/* 프로필 이미지 자리: 아직 이미지가 없어 닉네임 첫 글자로 표시 */}
              <div className="mp-avatar" aria-hidden="true">
                {session ? session.nickname.slice(0, 1) : <PersonIcon />}
              </div>
              <div className="mp-profile-name">
                {session ? (
                  <>
                    <strong>{session.nickname}</strong>
                    <span className="mp-chip">
                      <span className="mp-chip-dot" aria-hidden="true" />
                      TIERON 사용자
                    </span>
                  </>
                ) : (
                  <>
                    <strong className="mp-muted-strong">로그인이 필요합니다</strong>
                    <span className="mp-sub">치지직으로 로그인하면 프로필이 만들어집니다.</span>
                  </>
                )}
              </div>
            </div>

            {/* 연결 상태: 실제로 아는 값(로그인 여부)만 "연결됨", 나머지는 미연결 */}
            <dl className="mp-fields">
              <div>
                <dt>치지직 계정</dt>
                <dd>
                  {session ? (
                    <span className="mp-pill is-on">연결됨</span>
                  ) : (
                    <span className="mp-pill">로그인 필요</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Riot ID</dt>
                <dd>
                  <span className="mp-pill">미연결</span>
                </dd>
              </div>
            </dl>

            {session ? (
              <button type="button" className="mp-btn mp-btn-ghost mp-btn-block" disabled>
                <EditIcon />
                프로필 편집
                <span className="mp-soon">준비 중</span>
              </button>
            ) : (
              <Link href="/login" className="mp-btn mp-btn-primary">
                로그인하러 가기
              </Link>
            )}
          </section>

          {/* 2. 게임 티어 카드 — 실제 인증 데이터가 없으므로 미인증 상태만.
                 게임이 늘면 TIER_GAMES에 추가하면 그리드에 자동으로 한 칸씩 붙는다 */}
          <section className="mp-tiers" aria-labelledby="mp-tiers-title">
            <h2 id="mp-tiers-title" className="mp-section-title">게임 티어</h2>
            <div className="mp-tier-grid">
              {TIER_GAMES.map((g) => (
                <TierPlaceholder key={g.game} game={g.game} fullName={g.fullName} />
              ))}
            </div>
          </section>
        </div>

        {/* 3. 내 인증 카드 — 넓은 영역. 인증 카드 데이터가 생기면 목록을, 없으면 빈 상태를 보여 준다 */}
        <section className="mp-card mp-cert" aria-labelledby="mp-cert-title">
          <div className="mp-cert-head">
            <h2 id="mp-cert-title" className="mp-section-title">내 인증 카드</h2>
            <span className="mp-soon">준비 중</span>
          </div>

          {certCards.length > 0 ? (
            <div className="mp-cert-grid">
              {certCards.map((card) => (
                <CertCardView key={card.game} card={card} />
              ))}
            </div>
          ) : (
            <div className="mp-empty">
              <div className="mp-empty-icon" aria-hidden="true">
                <PlusIcon />
              </div>
              <p className="mp-empty-title">아직 인증 카드가 없습니다</p>
              <p className="mp-empty-desc">
                Riot 계정을 인증하면 내 티어가 담긴 인증 카드를 만들 수 있습니다.
              </p>
              <div className="mp-empty-actions">
                <Link href="/verify" className="mp-btn mp-btn-outline">
                  Riot 계정 인증하기
                  <ArrowIcon />
                </Link>
                <button type="button" className="mp-btn mp-btn-ghost" disabled>
                  카드 만들기
                  <span className="mp-soon">준비 중</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 4. 내 활동 + 내 프로필 공유 (데스크톱 2칸, 모바일 1열) */}
        <div className="mp-row">
          <section className="mp-card mp-activity" aria-labelledby="mp-activity-title">
            <div className="mp-cert-head">
              <h2 id="mp-activity-title" className="mp-section-title">내 활동</h2>
            </div>

            {/* 활동 기록을 저장·조회하는 기능이 아직 없어 빈 상태만. 날짜·활동을 지어내지 않는다 */}
            <div className="mp-empty mp-empty-sm">
              <div className="mp-empty-icon" aria-hidden="true">
                <ClockIcon />
              </div>
              <p className="mp-empty-title">아직 활동 기록이 없습니다</p>
              <p className="mp-empty-desc">아래와 같은 활동이 생기면 이곳에 순서대로 기록됩니다.</p>
              <ul className="mp-activity-kinds" aria-label="기록될 활동 종류">
                {ACTIVITY_KINDS.map((kind) => (
                  <li key={kind}>{kind}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mp-card mp-share" aria-labelledby="mp-share-title">
            <div className="mp-cert-head">
              <h2 id="mp-share-title" className="mp-section-title">내 프로필 공유</h2>
              <span className="mp-soon">준비 중</span>
            </div>

            <div className="mp-share-preview">
              <div className="mp-share-brand">
                <span className="mp-wordmark">
                  TIER<span>ON</span>
                </span>
                <small>PROFILE</small>
              </div>
              <p className="mp-share-name">{session ? session.nickname : "TIERON 프로필"}</p>
              {/* 공개 주소는 아직 없다 (Riot 계정 인증 후 만들 예정) — 임의 URL을 보여 주지 않는다 */}
              <p className="mp-share-url">공개 프로필 주소는 Riot 계정 인증 후 만들어집니다.</p>
            </div>

            <div className="mp-share-actions">
              <button type="button" className="mp-btn mp-btn-ghost" disabled>
                <EyeIcon />
                공개 프로필 보기
                <span className="mp-soon">준비 중</span>
              </button>
              <button type="button" className="mp-btn mp-btn-ghost" disabled>
                <LinkIcon />
                프로필 링크 복사
                <span className="mp-soon">준비 중</span>
              </button>
            </div>
          </section>
        </div>

        {/* 5. 계정 / 설정 */}
        <section className="mp-card mp-account" aria-labelledby="mp-account-title">
          <h2 id="mp-account-title" className="mp-section-title">계정</h2>

          <ul className="mp-rows">
            <li>
              <div>
                <strong>로그인 계정</strong>
                <span>{session ? `치지직 · ${session.nickname}` : "로그인하지 않았습니다"}</span>
              </div>
              {session ? (
                <LogoutButton className="mp-btn mp-btn-ghost mp-btn-sm" />
              ) : (
                <Link href="/login" className="mp-btn mp-btn-ghost mp-btn-sm">
                  로그인
                </Link>
              )}
            </li>
            <li>
              <div>
                <strong>프로필 공개 설정</strong>
                <span>인증 카드·프로필 공개 범위를 정합니다.</span>
              </div>
              <span className="mp-soon">준비 중</span>
            </li>
            <li>
              <div>
                <strong>연결된 계정 관리</strong>
                <span>Riot 계정 연결 상태를 확인하고 해제합니다.</span>
              </div>
              <span className="mp-soon">준비 중</span>
            </li>
            <li>
              <div>
                <strong>계정 삭제 요청</strong>
                <span>
                  화면에서 직접 탈퇴하는 기능은 아직 없어{" "}
                  <a href="mailto:project.contact.kr@gmail.com">문의 이메일</a>로 요청할 수 있습니다.
                </span>
              </div>
              <Link href="/privacy" className="mp-text-link">
                개인정보처리방침
              </Link>
            </li>
          </ul>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}

// 게임 티어 자리: 인증 전이라 티어·LP 없이 상태와 인증 안내만
function TierPlaceholder({ game, fullName }: { game: string; fullName: string }) {
  return (
    <article className="mp-card mp-tier">
      <div className="mp-tier-head">
        <span className="mp-game-tag">{game}</span>
        <span className="mp-status">미인증</span>
      </div>
      <p className="mp-tier-game">{fullName}</p>

      <div className="mp-tier-empty">
        <div className="mp-tier-emblem" aria-hidden="true">
          <LockIcon />
        </div>
        <div>
          <p className="mp-tier-title">아직 인증되지 않았습니다</p>
          <p className="mp-tier-desc">Riot 계정을 인증하면 {game} 랭크가 여기에 표시됩니다.</p>
          <p className="mp-tier-note">
            <span className="mp-chip-dot is-off" aria-hidden="true" />
            Riot 공식 인증 준비 중
          </p>
        </div>
      </div>

      <Link href="/verify" className="mp-btn mp-btn-outline mp-btn-block">
        Riot 계정 인증하기
      </Link>
    </article>
  );
}

// 인증 카드 한 장 (데이터가 생기면 사용). 소유권 인증이 끝난 정보만 들어오므로 "TIERON 인증" 표시를 쓴다
function CertCardView({ card }: { card: CertCard }) {
  return (
    <article className="mp-cert-card">
      <div className="mp-cert-card-head">
        <span className="mp-share-brand">
          <span className="mp-wordmark">
            TIER<span>ON</span>
          </span>
        </span>
        <span className="mp-chip">
          <span className="mp-chip-dot" aria-hidden="true" />
          TIERON 인증 · {card.game}
        </span>
      </div>
      <p className="mp-cert-card-id">{card.riotId}</p>
      <p className="mp-cert-card-tier">
        {card.tier} {card.rank} · {card.leaguePoints} LP
      </p>
      <p className="mp-cert-card-time">
        인증 시각 {new Date(card.verifiedAt).toLocaleString("ko-KR")}
      </p>
    </article>
  );
}

function ClockIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx={12} cy={12} r={3} />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx={12} cy={7} r={4} />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
