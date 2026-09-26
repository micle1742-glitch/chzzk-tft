"use client";

import "./tier.css";
import { useState } from "react";

export default function TierPage() {
  const [nickname, setNickname] = useState("");
  const [tagline, setTagline] = useState("");

  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState("");

  async function searchTier() {
    setMessage("");
    setResult(null);

    if (nickname === "" || tagline === "") {
      alert("게임 이름과 태그를 모두 입력해주세요.");
      return;
    }

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: nickname,
          tagline: tagline,
        }),
      });

      const data = await response.json();

      console.log("서버에서 받은 데이터:", data);

      if (!data.success) {
        setMessage(data.message);
        return;
      }

      const tierInfo = data.tier[0];

      setResult({
        nickname: data.nickname,
        tier: tierInfo,
      });
    } catch (error) {
      console.error("조회 오류:", error);
      setMessage("티어 조회 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="container">
      <h1>🎮 롤체 티어 인증</h1>

      <p>치지직 연동 프로젝트</p>

      <div id="loginInfo"></div>

      <input
        type="text"
        id="nickname"
        placeholder="게임 이름 (예: Faker)"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />

      <input
        type="text"
        id="tagline"
        placeholder="태그 (예: KR1)"
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
      />

      <button onClick={searchTier}>티어 조회</button>

      <div id="result">
        {message && <p>{message}</p>}

        {result && (
          <div className="tier-card">
            <h2>🎉 {result.nickname}님 인증 완료!</h2>

            <p>🏆 롤체 티어</p>

            <h1>
              {result.tier.tier} {result.tier.rank}
            </h1>

            <p>{result.tier.leaguePoints} LP</p>

            <p>
              승리: {result.tier.wins}승 / {result.tier.losses}패
            </p>
          </div>
        )}
      </div>
    </div>
  );
}