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

export function getTastePhrase(topTags: [TagKey, number][]): string {
  if (topTags.length === 0) return "나만의 공간을 탐험하는 사람";
  const tags = topTags.map(([t]) => t);

  if (tags.includes("QUIET") && tags.includes("FOCUSED"))          return "조용히 집중할 수 있는 공간을 좋아하는 사람";
  if (tags.includes("QUIET") && tags.includes("INSPIRING"))        return "조용히 영감을 얻는 공간을 찾는 사람";
  if (tags.includes("QUIET") && tags.includes("COMFORTABLE"))      return "조용하고 편안한 공간에서 오래 머무는 사람";
  if (tags.includes("WARM") && tags.includes("COMFORTABLE"))       return "따뜻하고 편안한 분위기를 즐기는 사람";
  if (tags.includes("UNIQUE") && tags.includes("INSPIRING"))       return "독특하고 영감 있는 공간을 탐험하는 사람";
  if (tags.includes("SENSIBLE") && tags.includes("UNIQUE"))        return "감각적이고 독특한 공간을 발견하는 사람";
  if (tags.includes("INSPIRING") && tags.includes("SENSIBLE"))     return "영감 있고 감각적인 공간에 끌리는 사람";
  if (tags.includes("COMFORTABLE") && tags.includes("WANT_AGAIN")) return "편안해서 다시 찾고 싶은 공간을 좋아하는 사람";

  const fallback: Partial<Record<TagKey, string>> = {
    QUIET:      "조용한 공간에서 오래 머무는 사람",
    INSPIRING:  "영감을 주는 공간을 찾는 사람",
    COMFORTABLE:"편안한 공간을 즐기는 사람",
    UNIQUE:     "독특한 공간을 탐험하는 사람",
    WANT_AGAIN: "다시 찾고 싶은 공간을 만드는 사람",
    SENSIBLE:   "감각 있는 공간에 끌리는 사람",
    WARM:       "따뜻한 분위기의 공간을 좋아하는 사람",
    FOCUSED:    "집중할 수 있는 공간을 선호하는 사람",
  };
  return fallback[tags[0]] ?? "나만의 공간을 탐험하는 사람";
}

export function tagOverlap(a: TagKey[], b: TagKey[]): number {
  const setB = new Set(b);
  return a.filter((t) => setB.has(t)).length;
}
