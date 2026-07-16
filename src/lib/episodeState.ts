/**
 * Episode 열람 상태 — unlockVisitCount(이 방문 횟수부터 열람 가능)와 visitCount(누적 방문
 * 횟수, Record 개수)를 비교해 판정한다. visitCount는 Record가 삭제되지 않는 한 영구적이므로
 * 이 판정 자체도 영구적이다 — 공간 접근 권한(SpaceUnlock, 12시간 만료)과는 별개로 관리된다.
 * COMING_SOON(아직 관리자가 만들지 않은 다음 이야기)은 실제 Episode 행이 없어 이 함수의
 * 대상이 아니다 — 호출부에서 별도의 placeholder로 처리한다.
 */
export type EpisodeState = "LOCKED" | "NEWLY_UNLOCKED" | "UNLOCKED";

export function computeEpisodeState(unlockVisitCount: number, visitCount: number): EpisodeState {
  if (unlockVisitCount > visitCount) return "LOCKED";
  if (unlockVisitCount === visitCount) return "NEWLY_UNLOCKED";
  return "UNLOCKED";
}
