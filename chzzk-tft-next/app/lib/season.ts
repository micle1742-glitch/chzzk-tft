/*
 * 게임 공통 시즌 자료형 (전적 분석의 시즌 선택). 순수 타입·함수라 서버·클라이언트 어디서든 import 가능
 * - TFT: 세트 번호(info.tft_set_number) = 시즌. id "18", 표시 "세트 18"
 * - LoL은 시즌 판단 방식이 달라(패치 기반) 나중에 같은 형태로 만들어 붙인다
 * 시즌 이름(세트 이름 등)은 Riot API가 주지 않으므로 하드코딩하지 않고 숫자로만 표시한다
 */
export type GameSeason = {
  id: string; // 서버에 다시 보낼 값
  label: string; // 화면 표시 ("세트 18")
  isCurrent: boolean; // 현재 시즌 여부 (서버가 Riot 데이터로 판단)
};

export function tftSeason(setNumber: number, currentSet: number | null): GameSeason {
  return { id: String(setNumber), label: `세트 ${setNumber}`, isCurrent: setNumber === currentSet };
}
