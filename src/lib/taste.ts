import { Tag } from "@prisma/client";
import { TAG_LABELS } from "./tags";

export function aggregateTags(
  records: { tags: { tag: Tag }[] }[]
): [Tag, number][] {
  const count: Partial<Record<Tag, number>> = {};
  for (const r of records) {
    for (const rt of r.tags) {
      count[rt.tag] = (count[rt.tag] ?? 0) + 1;
    }
  }
  return (Object.entries(count) as [Tag, number][]).sort((a, b) => b[1] - a[1]);
}

export function getTastePhrase(topTags: [Tag, number][]): string {
  if (topTags.length === 0) return "나만의 공간을 탐험하는 사람";
  const tags = topTags.map(([t]) => t);

  if (tags.includes("QUIET") && tags.includes("FOCUSED"))      return "조용히 집중할 수 있는 공간을 좋아하는 사람";
  if (tags.includes("QUIET") && tags.includes("INSPIRING"))    return "조용히 영감을 얻는 공간을 찾는 사람";
  if (tags.includes("QUIET") && tags.includes("COMFORTABLE"))  return "조용하고 편안한 공간에서 오래 머무는 사람";
  if (tags.includes("WARM") && tags.includes("COMFORTABLE"))   return "따뜻하고 편안한 분위기를 즐기는 사람";
  if (tags.includes("UNIQUE") && tags.includes("INSPIRING"))   return "독특하고 영감 있는 공간을 탐험하는 사람";
  if (tags.includes("SENSIBLE") && tags.includes("UNIQUE"))    return "감각적이고 독특한 공간을 발견하는 사람";
  if (tags.includes("INSPIRING") && tags.includes("SENSIBLE")) return "영감 있고 감각적인 공간에 끌리는 사람";
  if (tags.includes("COMFORTABLE") && tags.includes("WANT_AGAIN")) return "편안해서 다시 찾고 싶은 공간을 좋아하는 사람";

  const fallback: Partial<Record<Tag, string>> = {
    QUIET:       "조용한 공간에서 오래 머무는 사람",
    INSPIRING:   "영감을 주는 공간을 찾는 사람",
    COMFORTABLE: "편안한 공간을 즐기는 사람",
    UNIQUE:      "독특한 공간을 탐험하는 사람",
    WANT_AGAIN:  "다시 찾고 싶은 공간을 만드는 사람",
    SENSIBLE:    "감각 있는 공간에 끌리는 사람",
    WARM:        "따뜻한 분위기의 공간을 좋아하는 사람",
    FOCUSED:     "집중할 수 있는 공간을 선호하는 사람",
  };
  return fallback[tags[0]] ?? "나만의 공간을 탐험하는 사람";
}

/** 두 태그 목록 간 겹치는 수 (유사도 점수) */
export function tagOverlap(a: Tag[], b: Tag[]): number {
  const setB = new Set(b);
  return a.filter((t) => setB.has(t)).length;
}
