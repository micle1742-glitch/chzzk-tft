const express = require("express");
const path = require("path");
require("dotenv").config();
const axios = require("axios");

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});


app.post("/api/search", async (req, res) => {

    const nickname = req.body.nickname;
    const tagline = req.body.tagline;

    console.log("조회 요청:", nickname + "#" + tagline);

    const apiKey = process.env.RIOT_API_KEY;

    try {

        // 1. 라이엇 계정 조회
        const accountResponse = await axios.get(
            `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${nickname}/${tagline}`,
            {
                headers: {
                    "X-Riot-Token": apiKey
                }
            }
        );


        // 2. PUUID 가져오기
        const puuid = accountResponse.data.puuid;

        console.log("PUUID:", puuid);


        // 3. TFT 티어 조회
        const tierResponse = await axios.get(
            `https://kr.api.riotgames.com/tft/league/v1/by-puuid/${puuid}`,
            {
                headers: {
                    "X-Riot-Token": apiKey
                }
            }
        );

        console.log("티어 정보:", tierResponse.data);


        // 4. 홈페이지로 결과 전달
        res.json({
            success: true,
            nickname: nickname,
            tier: tierResponse.data
        });

    } catch (error) {

        console.log(
            "조회 에러:",
            error.response?.data || error.message
        );

        res.status(500).json({
            success: false,
            message: "조회 실패"
        });
    }

});

// 치지직 로그인 시작
app.get("/auth/chzzk", (req, res) => {

    const clientId = process.env.CHZZK_CLIENT_ID;

    const redirectUri = "http://localhost:3000/auth/chzzk/callback";

    const state = "stream_game_profile_login";

    const authUrl =
        `https://chzzk.naver.com/account-interlock` +
        `?clientId=${clientId}` +
        `&redirectUri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}`;

    res.redirect(authUrl);

});

// 치지직 로그인 콜백
app.get("/auth/chzzk/callback", async (req, res) => {

    const code = req.query.code;
    const state = req.query.state;

    console.log("치지직 인증 코드:", code);
    console.log("State:", state);

    try {

        const clientId = process.env.CHZZK_CLIENT_ID;
        const clientSecret = process.env.CHZZK_CLIENT_SECRET;

        // 치지직 Access Token 발급 요청
        const tokenResponse = await axios.post(
            "https://openapi.chzzk.naver.com/auth/v1/token",
            {
                grantType: "authorization_code",
                clientId: clientId,
                clientSecret: clientSecret,
                code: code,
                state: state
            }
        );

        console.log("토큰 응답:", tokenResponse.data);

        const accessToken = tokenResponse.data.content.accessToken;

        console.log("Access Token:", accessToken);

        // 치지직 로그인한 유저 정보 조회
const userResponse = await axios.get(
    "https://openapi.chzzk.naver.com/open/v1/users/me",
    {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    }
);

console.log("유저 정보:", userResponse.data);

const channelId = userResponse.data.content.channelId;
const nickname = userResponse.data.content.nickname;

res.redirect(
    `/?channelId=${encodeURIComponent(channelId)}&nickname=${encodeURIComponent(nickname)}`
);

    } catch (error) {

        console.log(
            "치지직 토큰 발급 에러:",
            error.response?.data || error.message
        );

        res.status(500).send("치지직 토큰 발급 실패");

    }

});

app.listen(PORT, () => {
    console.log(`서버 실행중: http://localhost:${PORT}`);
});