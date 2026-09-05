const params = new URLSearchParams(window.location.search);

const chzzkNickname = params.get("nickname");
const channelId = params.get("channelId");

console.log("치지직 닉네임:", chzzkNickname);
console.log("채널 ID:", channelId);

if (chzzkNickname && channelId) {
    document.getElementById("loginInfo").innerHTML = `
        <h2>🎉 ${chzzkNickname}님, 치지직 로그인 성공!</h2>
        <p>채널 연동이 완료되었습니다.</p>
    `;
}
async function searchTier() {

    const nickname = document.getElementById("nickname").value;
    const tagline = document.getElementById("tagline").value;

    console.log(nickname, tagline);
    // 닉네임 또는 태그라인을 입력하지 않았는지 확인
    if (nickname === "" || tagline === "") {
        alert("게임 이름과 태그를 모두 입력해주세요.");
        return;
    }

    const response = await fetch("/api/search", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        //JSON.stringify() : 객체를 JSON 문자열로 변환

        body: JSON.stringify({
            nickname: nickname,
            tagline: tagline
        })

    });

    const data = await response.json();

console.log("서버에서 받은 데이터:", data);

if (!data.success) {
    document.getElementById("result").innerHTML = data.message;
    return;
}

const tierInfo = data.tier[0];

document.getElementById("result").innerHTML = `
    <div class="tier-card">
        <h2>🎉 ${data.nickname}님 인증 완료!</h2>

        <p>🏆 롤체 티어</p>

        <h1>
            ${tierInfo.tier} ${tierInfo.rank}
        </h1>

        <p>
            ${tierInfo.leaguePoints} LP
        </p>

        <p>
            승리: ${tierInfo.wins}승 /
            패배: ${tierInfo.losses}패
        </p>
    </div>
`;

}