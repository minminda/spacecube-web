/** 같은 공간에 대한 재방문으로 인정하는 최소 간격 (시간 단위). 값만 바꾸면 정책 전체가 바뀐다. */
export const REVISIT_INTERVAL_HOURS = 12;

/**
 * 마지막으로 "인정된" 방문 시각(lastVisitedAt) 기준으로, 지금이 새 방문으로 인정될 시점인지 판단한다.
 * lastVisitedAt이 없으면(첫 방문) 항상 새 방문으로 인정한다.
 * 서버 시간(Date.now())을 기준으로 판정하며, 프론트엔드는 별도로 판단하지 않고 API 응답을 따른다.
 */
export function isNewVisit(lastVisitedAt: Date | null, now: Date = new Date()): boolean {
  if (!lastVisitedAt) return true;
  const elapsedMs = now.getTime() - lastVisitedAt.getTime();
  const intervalMs = REVISIT_INTERVAL_HOURS * 60 * 60 * 1000;
  return elapsedMs >= intervalMs;
}
