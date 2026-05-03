import type { Tag } from "@prisma/client";

// 공간 전체 기록에서 태그 빈도 집계 (taste.ts의 aggregateTags와 동일 인터페이스)
export function aggregateSpaceTags(
  records: { tags: { tag: Tag }[] }[]
): [Tag, number][] {
  const counts = new Map<Tag, number>();
  for (const r of records) {
    for (const t of r.tags) {
      counts.set(t.tag, (counts.get(t.tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// 태그 빈도 기반으로 "이 공간은 ~로 경험되고 있습니다" 한 문장 생성
export function getSpaceUsageSummary(
  topTags: [Tag, number][],
  lang: string
): string | null {
  if (topTags.length === 0) return null;

  const top = topTags[0][0];
  const second = topTags[1]?.[0];

  if (lang === "ko") {
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

  if (lang === "ja") {
    if (top === "QUIET") return "この空間は、静かにゆっくり過ごせる場所として記録されています。";
    if (top === "COMFORTABLE") return "この空間は、一人でのんびりと過ごせる場所として記録されています。";
    if (top === "INSPIRING") return "この空間は、新しいインスピレーションを得られる場所として体験されています。";
    if (top === "UNIQUE") return "この空間は、独特の雰囲気で記憶される場所として体験されています。";
    if (top === "WARM") return "この空間は、温かい雰囲気として記憶されています。";
    if (top === "FOCUSED") return "この空間は、集中して時間を過ごすのに適した場所として体験されています。";
    if (top === "WANT_AGAIN") return "この空間は、また訪れたいと思わせる場所として記録されています。";
    return "この空間は、訪れた方それぞれの形で記憶されています。";
  }

  if (lang === "zh") {
    if (top === "QUIET") return "这个空间被记录为安静地长时间停留、整理思绪的地方。";
    if (top === "COMFORTABLE") return "这个空间被记录为可以舒适休憩的地方。";
    if (top === "INSPIRING") return "这个空间被体验为能获得新启发的地方。";
    if (top === "UNIQUE") return "这个空间以其独特氛围留存在人们记忆中。";
    if (top === "WARM") return "这个空间以温暖的氛围留存在人们记忆中。";
    if (top === "FOCUSED") return "这个空间被体验为专注度过时光的好地方。";
    if (top === "WANT_AGAIN") return "这个空间被记录为让人想再次光临的地方。";
    return "这个空间以各自的方式被每位访客铭记。";
  }

  // en (default)
  if (top === "QUIET") return "This space is experienced as a place to sit quietly and gather thoughts.";
  if (top === "COMFORTABLE") return "This space is remembered as a comfortable retreat for solo visitors.";
  if (top === "INSPIRING") return "This space is experienced as a place that sparks new ideas.";
  if (top === "UNIQUE") return "This space is remembered for its one-of-a-kind atmosphere.";
  if (top === "WARM") return "This space is remembered for its warm, welcoming feel.";
  if (top === "FOCUSED") return "This space is experienced as a good place to focus and get things done.";
  if (top === "WANT_AGAIN") return "This space is recorded as a place people want to return to.";
  return "This space is remembered in its own way by every visitor.";
}

// 재방문 비율 계산 (records: { userId }[] 배열)
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
