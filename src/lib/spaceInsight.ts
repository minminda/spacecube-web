import type { TagKey } from "@prisma/client";

export function aggregateSpaceTags(
  records: { tags: { tag: TagKey }[] }[]
): [TagKey, number][] {
  const counts = new Map<TagKey, number>();
  for (const r of records) {
    for (const t of r.tags) {
      counts.set(t.tag, (counts.get(t.tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function getSpaceUsageSummary(topTags: [TagKey, number][]): string | null {
  if (topTags.length === 0) return null;

  const top = topTags[0][0];
  const second = topTags[1]?.[0];

  if (top === "QUIET" && second === "FOCUSED")
    return "이 공간은 조용히 집중하며 시간을 보내는 곳으로 경험되고 있습니다.";
  if (top === "QUIET" && second === "COMFORTABLE")
    return "이 공간은 조용히 오래 머물며 생각을 정리하는 곳으로 경험되고 있습니다.";
  if (top === "QUIET")
    return "이 공간은 소음 없이 차분하게 시간을 보내는 곳으로 기록되고 있습니다.";
  if (top === "COMFORTABLE" && second === "WANT_AGAIN")
    return "이 공간은 편안해서 다시 찾고 싶은 곳으로 경험되고 있습니다.";
  if (top === "COMFORTABLE")
    return "이 공간은 혼자 방문한 사람들이 편안하게 쉬어가는 공간으로 기록되고 있습니다.";
  if (top === "INSPIRING" && second === "UNIQUE")
    return "이 공간은 새로운 자극과 특별한 경험을 주는 곳으로 경험되고 있습니다.";
  if (top === "INSPIRING")
    return "이 공간은 방문 후 새로운 생각을 얻어가는 곳으로 경험되고 있습니다.";
  if (top === "UNIQUE")
    return "이 공간은 어디에서도 느끼기 어려운 특별한 분위기로 기억되고 있습니다.";
  if (top === "WARM")
    return "이 공간은 따뜻한 분위기로 사람들에게 기억되고 있습니다.";
  if (top === "FOCUSED")
    return "이 공간은 집중해서 무언가를 하기 좋은 곳으로 경험되고 있습니다.";
  if (top === "SENSIBLE")
    return "이 공간은 감각적인 디테일로 기억되는 곳으로 경험되고 있습니다.";
  if (top === "WANT_AGAIN")
    return "이 공간은 한 번 오면 다시 찾고 싶어지는 곳으로 기록되고 있습니다.";
  return "이 공간은 방문한 사람들에게 저마다의 방식으로 기억되고 있습니다.";
}

export function getRevisitStats(records: { userId: string }[]): {
  total: number;
  revisitors: number;
  ratio: number;
} {
  const counts = new Map<string, number>();
  for (const r of records) {
    counts.set(r.userId, (counts.get(r.userId) ?? 0) + 1);
  }
  const total = counts.size;
  const revisitors = [...counts.values()].filter((c) => c > 1).length;
  return { total, revisitors, ratio: total > 0 ? Math.round((revisitors / total) * 100) : 0 };
}
