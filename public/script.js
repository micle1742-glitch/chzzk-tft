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

document.getElementById("result").innerHTML =
    `${data.nickname}님의 티어는 ${tierInfo.tier} ${tierInfo.rank} ${tierInfo.leaguePoints}LP 입니다.`;

}