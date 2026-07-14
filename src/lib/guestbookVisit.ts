/* ── "이번 방문" Record 식별 ──────────────────────────────────
   취향 점수 저장 직후 방명록으로 넘어갈 때 ?visit=<recordId>를 함께 보낸다.
   점수 자체는 쿼리에 담지 않고, 서버에서 이 id가 실제로 로그인 사용자·해당
   공간의 Record인지(ownedRecords) 확인한 뒤에만 신뢰한다. 값이 없거나
   조작된 값이면 항상 가장 최근 Record로 안전하게 폴백한다. ──────────── */

export interface VisitRecordCandidate {
  id: string;
  visitedAt: Date;
}

/**
 * requestedRecordId가 ownedRecords(이미 사용자·공간으로 필터링된 목록) 안에 있으면 그대로 쓰고,
 * 아니면 가장 최근 방문(visitedAt DESC)으로 폴백한다. ownedRecords가 비어 있으면 null.
 */
export function resolveCurrentVisitRecordId(
  requestedRecordId: string | null,
  ownedRecords: VisitRecordCandidate[],
): string | null {
  if (ownedRecords.length === 0) return null;
  if (requestedRecordId && ownedRecords.some((r) => r.id === requestedRecordId)) {
    return requestedRecordId;
  }
  return [...ownedRecords].sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime())[0].id;
}

export interface OwnableRecord {
  userId: string;
  spaceId: string;
}

/**
 * 방문 완료 페이지(`/space/[slug]/complete`)에서 recordId로 조회한 Record가 실제로
 * 로그인 사용자·해당 공간의 것인지 확인한다. 다른 사용자/다른 공간의 record면 false —
 * 호출부는 이때 반드시 접근을 막아야 한다(현재는 notFound()).
 */
export function isOwnedRecord(
  record: OwnableRecord | null,
  userId: string,
  spaceId: string,
): boolean {
  return !!record && record.userId === userId && record.spaceId === spaceId;
}
