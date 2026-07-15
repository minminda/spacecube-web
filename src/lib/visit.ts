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

export interface VisitScopedRecord {
  id: string;
  visitedAt: Date;
  tasteScore: number | null;
}

/**
 * "이번 방문"에 이미 저장된 Record가 있는지 판정한다 — /api/records가 새 Record를 만들지
 * 기존 것을 갱신할지 정하는 기준(isNewVisit)과 동일한 기준을 재사용해, 취향 점수 폼이
 * 뒤로가기/새로고침 후에도 이미 저장된 값을 그대로 보여줄 수 있게 한다.
 * lastRecord는 반드시 호출부에서 이미 userId·spaceId로 필터링된 값이어야 한다
 * (이 함수 자체는 소유권을 검증하지 않는다 — resolveCurrentVisitRecordId와 같은 패턴).
 */
export function resolveCurrentVisitRecord(
  lastRecord: VisitScopedRecord | null,
  now: Date = new Date(),
): { id: string; tasteScore: number | null } | null {
  if (!lastRecord) return null;
  if (isNewVisit(lastRecord.visitedAt, now)) return null;
  return { id: lastRecord.id, tasteScore: lastRecord.tasteScore };
}
