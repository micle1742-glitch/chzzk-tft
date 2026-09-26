import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nickname = body.nickname;
    const tagline = body.tagline;

    if (!nickname || !tagline) {
      return NextResponse.json(
        {
          success: false,
          message: "닉네임과 태그를 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.RIOT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Riot API Key가 없습니다.",
        },
        { status: 500 }
      );
    }

    // 1. Riot ID → PUUID 조회
    const accountResponse = await axios.get(
      `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(nickname)}/${encodeURIComponent(tagline)}`,
      {
        headers: {
          "X-Riot-Token": apiKey,
        },
      }
    );

    const puuid = accountResponse.data.puuid;

    // 2. PUUID → TFT 티어 조회
    const tierResponse = await axios.get(
      `https://kr.api.riotgames.com/tft/league/v1/by-puuid/${puuid}`,
      {
        headers: {
          "X-Riot-Token": apiKey,
        },
      }
    );

    return NextResponse.json({
      success: true,
      nickname,
      tier: tierResponse.data,
    });
  } catch (error: any) {
    console.error(
      "Riot API 조회 에러:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        success: false,
        message: "조회 실패",
      },
      { status: 500 }
    );
  }
}