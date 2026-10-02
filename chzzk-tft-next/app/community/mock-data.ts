/*
 * ⚠️ 목업 데이터 (UI 확인용)
 * 실제 랭킹·게시글·댓글이 아니다. 화면에도 "예시 데이터"로 표시한다.
 * DB/API가 생기면 이 파일을 지우고 실제 데이터로 바꾼다.
 */

export type MockRanker = {
  rank: number;
  nickname: string;
  tag: string;
  tier: "Challenger" | "Grandmaster" | "Master";
  lp: number;
};

export type MockPost = {
  id: number;
  category: "공지" | "자유" | "공략" | "질문" | "정보";
  title: string;
  author: string;
  date: string; // 표시용 MM.DD
  comments: number;
  body: string;
};

export const MOCK_RANKING: MockRanker[] = [
  { rank: 1, nickname: "TFT_God", tag: "KR1", tier: "Challenger", lp: 1342 },
  { rank: 2, nickname: "SetKing", tag: "KR1", tier: "Challenger", lp: 1298 },
  { rank: 3, nickname: "EnjoyTFT", tag: "KR1", tier: "Challenger", lp: 1276 },
  { rank: 4, nickname: "MoonTFT", tag: "KR1", tier: "Challenger", lp: 1243 },
  { rank: 5, nickname: "LuckyDay", tag: "KR1", tier: "Challenger", lp: 1201 },
  { rank: 6, nickname: "Strategy", tag: "KR1", tier: "Grandmaster", lp: 987 },
  { rank: 7, nickname: "Tactician", tag: "KR1", tier: "Grandmaster", lp: 965 },
  { rank: 8, nickname: "AutoChess", tag: "KR1", tier: "Grandmaster", lp: 932 },
  { rank: 9, nickname: "Neon", tag: "KR1", tier: "Master", lp: 856 },
  { rank: 10, nickname: "Cloud", tag: "KR1", tier: "Master", lp: 842 },
];

export const MOCK_POSTS: MockPost[] = [
  {
    id: 1,
    category: "공지",
    title: "커뮤니티 이용 수칙 안내드립니다.",
    author: "TIERON",
    date: "09.20",
    comments: 12,
    body: "서로 존중하는 커뮤니티를 위해 이용 수칙을 지켜 주세요. (예시 게시글)",
  },
  {
    id: 2,
    category: "자유",
    title: "이번 시즌 랭크 어디까지 올리셨나요?",
    author: "초코덴탈",
    date: "09.27",
    comments: 5,
    body: "다들 이번 시즌 목표 티어가 어디인가요? (예시 게시글)",
  },
  {
    id: 3,
    category: "공략",
    title: "초보자를 위한 1티어 조합 정리",
    author: "전략왕김치",
    date: "09.27",
    comments: 38,
    body: "처음 시작하는 분들을 위한 기본 조합을 정리했습니다. (예시 게시글)",
  },
  {
    id: 4,
    category: "질문",
    title: "현 메타에서 이 덱 어떤가요?",
    author: "TFT하는사람",
    date: "09.27",
    comments: 4,
    body: "요즘 자주 쓰는 덱인데 괜찮은지 궁금합니다. (예시 게시글)",
  },
  {
    id: 5,
    category: "정보",
    title: "패치 노트 보고 정리한 변경점",
    author: "패치읽어주는남자",
    date: "09.26",
    comments: 41,
    body: "이번 패치에서 바뀐 점을 요약했습니다. (예시 게시글)",
  },
  {
    id: 6,
    category: "자유",
    title: "티어 올리는 멘탈 관리 팁 공유합니다",
    author: "멘탈코치",
    date: "09.26",
    comments: 27,
    body: "연패할 때 멘탈 잡는 방법을 공유해요. (예시 게시글)",
  },
  {
    id: 7,
    category: "질문",
    title: "초반에 어떤 템이 제일 좋나요?",
    author: "초보입니다",
    date: "09.25",
    comments: 6,
    body: "초반 아이템 우선순위가 궁금합니다. (예시 게시글)",
  },
];
