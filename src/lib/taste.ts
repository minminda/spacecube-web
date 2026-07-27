import { TagKey } from "@prisma/client";

/* ── "같은 공간에 대한 취향은 누적하지 않고, 가장 최근의 감정으로 갱신한다" ──────
   추천/취향 프로파일 계산 전용 유틸. 방문 이력(Record) 자체는 손대지 않고,
   프로파일을 만들 때만 사용자×공간별로 가장 최근 기록 1개로 좁혀 넣는다.
   운영자 KPI(computePeriodStats 등)는 이 함수를 쓰지 않고 기간 내 전체 기록을 그대로 쓴다 —
   목적이 다르므로(추천=현재 취향, KPI=기간 집계) 의도적으로 분리했다. ──────────── */

export interface SpaceVisitRecord {
  id: string;
  spaceId: string;
  visitedAt: Date;
}

/** a가 b보다 더 최근 기록인지 — visitedAt DESC, 동시각이면 id DESC(Record엔 별도 createdAt이 없음). */
function isMoreRecent(a: SpaceVisitRecord, b: SpaceVisitRecord): boolean {
  const diff = a.visitedAt.getTime() - b.visitedAt.getTime();
  if (diff !== 0) return diff > 0;
  return a.id > b.id;
}

/**
 * 같은 사용자가 같은 공간을 여러 번 방문한 기록들 중 공간별로 가장 최근 기록 1개만 남긴다.
 * 순서는 보존하지 않는다(호출부에서 필요하면 다시 정렬할 것).
 */
export function getLatestRecordPerSpace<T extends SpaceVisitRecord>(records: T[]): T[] {
  const latestBySpace = new Map<string, T>();
  for (const r of records) {
    const current = latestBySpace.get(r.spaceId);
    if (!current || isMoreRecent(r, current)) {
      latestBySpace.set(r.spaceId, r);
    }
  }
  return [...latestBySpace.values()];
}

export function aggregateTags(
  records: (SpaceVisitRecord & { tags: { tag: TagKey }[] })[]
): [TagKey, number][] {
  const count: Partial<Record<TagKey, number>> = {};
  for (const r of getLatestRecordPerSpace(records)) {
    for (const rt of r.tags) {
      count[rt.tag] = (count[rt.tag] ?? 0) + 1;
    }
  }
  return (Object.entries(count) as [TagKey, number][]).sort((a, b) => b[1] - a[1]);
}

/**
 * 취향 프로파일 한 줄 소개 — 관리자가 태그를 자유롭게 늘릴 수 있게 되면서(카테고리/태그 리팩터)
 * 8개 조합을 손으로 나열하던 방식은 더 이상 확장 가능하지 않다. 상위 1~2개 태그 이름을 조합한
 * 일반 템플릿으로 대체한다 — 손으로 다듬은 예전 문장만큼 매끄럽진 않지만 임의 태그에 대응한다.
 */
export function getTastePhrase(topTags: { name: string; weight: number }[]): string {
  if (topTags.length === 0) return "나만의 공간을 탐험하는 사람";
  if (topTags.length === 1) return `${topTags[0].name} 공간을 좋아하는 사람`;
  return `${topTags[0].name}, ${topTags[1].name} 공간을 좋아하는 사람`;
}
