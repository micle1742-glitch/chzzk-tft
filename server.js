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


app.listen(PORT, () => {
    console.log(`서버 실행중: http://localhost:${PORT}`);
});