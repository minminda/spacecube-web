/* ── LATEST 정렬(순수 함수) ───────────────────────────────────────────────
   LATEST는 별도 저장소가 아니다 — 발행된 콘텐츠(CURATION · PEOPLE · THOUGHT · SPACE)를 매번 조회해 합친 결과다.
   그래서 콘텐츠를 발행(status=PUBLISHED, publishedAt 기록)하면 /latest와 홈 LATEST에 사람이 따로 등록하지 않아도 나타난다.
   정렬: publishedAt DESC(초안 미리보기는 publishedAt이 없어 updatedAt), 같은 시각이면 먼저 만든 것이 앞(등록 순서 유지).
   Collection 등 새 종류도 같은 LatestRow로 넣으면 같은 규칙을 따른다. ── */

export interface LatestRow<T> {
  /** 정렬 시각(ms) */
  t: number;
  /** 같은 시각일 때 등록 순서(ms) */
  created: number;
  item: T;
}

export function latestKey(r: { publishedAt: Date | null; updatedAt: Date; createdAt: Date }): { t: number; created: number } {
  return { t: (r.publishedAt ?? r.updatedAt).getTime(), created: r.createdAt.getTime() };
}

export function orderLatest<T>(rows: LatestRow<T>[]): T[] {
  return [...rows].sort((a, b) => b.t - a.t || a.created - b.created).map((r) => r.item);
}
