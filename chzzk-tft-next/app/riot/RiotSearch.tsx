"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { riotResultHref } from "./RiotClient";
import "./tier.css";

/*
 * /riot 전적 검색 화면 — Riot ID 입력과 조회 버튼만
 * 조회는 결과 화면(/riot/result)이 한다: 여기서는 주소만 바꿔 넘긴다 (API를 두 번 부르지 않기 위해)
 * 결과 화면의 "← 다시 전적 검색"으로 돌아오면 이전 Riot ID가 채워져 있다 (initialName·initialTag)
 */
export default function RiotSearch({ initialName, initialTag }: { initialName: string; initialTag: string }) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialName);
  const [tagline, setTagline] = useState(initialTag);
  // 결과 화면으로 넘어가는 동안 버튼에 진행 상태 표시
  const [pending, startTransition] = useTransition();

  function search() {
    if (nickname === "" || tagline === "") {
      alert("게임 이름과 태그를 모두 입력해주세요.");
      return;
    }
    startTransition(() => router.push(riotResultHref(nickname, tagline)));
  }

  return (
    <div className="tier-page">
      <div className="tier-wrapper">
        <Link href="/home" className="home-link">
          ← 홈으로
        </Link>

        <form
          className="container"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          {/* 브랜드 */}
          <div className="brand">
            TIER<span>ON</span>
          </div>

          {/* 제목 및 설명 — 조회 페이지다. 소유권 인증은 별도 단계(HANDOFF 5번: 조회 ≠ 인증) */}
          <h1>Riot 티어 조회</h1>

          <p className="description">Riot ID(게임 이름#태그)로 TFT·LoL 랭크 정보를 조회합니다.</p>

          {/* 게임 이름 입력 */}
          <input
            type="text"
            id="nickname"
            placeholder="게임 이름 (예: Faker)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={pending}
          />

          {/* 태그 입력 */}
          <input
            type="text"
            id="tagline"
            placeholder="태그 (예: KR1)"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            disabled={pending}
          />

          {/* 조회 버튼 */}
          <button type="submit" disabled={pending}>
            {pending ? (
              <>
                <span className="tn-spinner" aria-hidden="true" />
                티어 확인 중...
              </>
            ) : (
              "티어 조회"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
