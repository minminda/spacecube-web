import { Tag } from "@prisma/client";
import type { Lang } from "./i18n";

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

export function getTastePhrase(topTags: [Tag, number][], lang: Lang = "ko"): string {
  if (topTags.length === 0) {
    if (lang === "en") return "Someone exploring their own kind of space";
    if (lang === "ja") return "自分だけの空間を探している人";
    return "나만의 공간을 탐험하는 사람";
  }
  const tags = topTags.map(([t]) => t);

  if (lang === "en") {
    if (tags.includes("QUIET") && tags.includes("FOCUSED"))          return "Someone who loves quiet spaces to focus in";
    if (tags.includes("QUIET") && tags.includes("INSPIRING"))        return "Someone who seeks quiet, inspiring spaces";
    if (tags.includes("QUIET") && tags.includes("COMFORTABLE"))      return "Someone who lingers in quiet, comfortable spaces";
    if (tags.includes("WARM") && tags.includes("COMFORTABLE"))       return "Someone who enjoys warm, cozy atmospheres";
    if (tags.includes("UNIQUE") && tags.includes("INSPIRING"))       return "Someone who explores unique and inspiring spaces";
    if (tags.includes("SENSIBLE") && tags.includes("UNIQUE"))        return "Someone who discovers sensible, distinctive spaces";
    if (tags.includes("INSPIRING") && tags.includes("SENSIBLE"))     return "Someone drawn to inspiring and sensible spaces";
    if (tags.includes("COMFORTABLE") && tags.includes("WANT_AGAIN")) return "Someone who returns to comforting spaces again and again";
    const fallbackEn: Partial<Record<Tag, string>> = {
      QUIET:       "Someone who lingers in quiet spaces",
      INSPIRING:   "Someone who seeks out inspiring spaces",
      COMFORTABLE: "Someone who enjoys comfortable spaces",
      UNIQUE:      "Someone who explores unique spaces",
      WANT_AGAIN:  "Someone who finds spaces worth returning to",
      SENSIBLE:    "Someone drawn to sensible spaces",
      WARM:        "Someone who loves warm, welcoming spaces",
      FOCUSED:     "Someone who prefers spaces to focus in",
    };
    return fallbackEn[tags[0]] ?? "Someone exploring their own kind of space";
  }

  if (lang === "ja") {
    if (tags.includes("QUIET") && tags.includes("FOCUSED"))          return "静かに集中できる空間が好きな人";
    if (tags.includes("QUIET") && tags.includes("INSPIRING"))        return "静かにインスピレーションを得られる空間を探す人";
    if (tags.includes("QUIET") && tags.includes("COMFORTABLE"))      return "静かで居心地の良い空間に長居する人";
    if (tags.includes("WARM") && tags.includes("COMFORTABLE"))       return "温かく居心地の良い雰囲気を楽しむ人";
    if (tags.includes("UNIQUE") && tags.includes("INSPIRING"))       return "ユニークでインスピレーションある空間を探す人";
    if (tags.includes("SENSIBLE") && tags.includes("UNIQUE"))        return "センスのあるユニークな空間を見つける人";
    if (tags.includes("INSPIRING") && tags.includes("SENSIBLE"))     return "インスピレーションとセンスのある空間に惹かれる人";
    if (tags.includes("COMFORTABLE") && tags.includes("WANT_AGAIN")) return "居心地が良くて何度も訪れたい空間が好きな人";
    const fallbackJa: Partial<Record<Tag, string>> = {
      QUIET:       "静かな空間に長居する人",
      INSPIRING:   "インスピレーションのある空間を探す人",
      COMFORTABLE: "居心地の良い空間を楽しむ人",
      UNIQUE:      "ユニークな空間を探索する人",
      WANT_AGAIN:  "また訪れたい空間を見つける人",
      SENSIBLE:    "センスのある空間に惹かれる人",
      WARM:        "温かい雰囲気の空間が好きな人",
      FOCUSED:     "集中できる空間を好む人",
    };
    return fallbackJa[tags[0]] ?? "自分だけの空間を探している人";
  }

  if (tags.includes("QUIET") && tags.includes("FOCUSED"))          return "조용히 집중할 수 있는 공간을 좋아하는 사람";
  if (tags.includes("QUIET") && tags.includes("INSPIRING"))        return "조용히 영감을 얻는 공간을 찾는 사람";
  if (tags.includes("QUIET") && tags.includes("COMFORTABLE"))      return "조용하고 편안한 공간에서 오래 머무는 사람";
  if (tags.includes("WARM") && tags.includes("COMFORTABLE"))       return "따뜻하고 편안한 분위기를 즐기는 사람";
  if (tags.includes("UNIQUE") && tags.includes("INSPIRING"))       return "독특하고 영감 있는 공간을 탐험하는 사람";
  if (tags.includes("SENSIBLE") && tags.includes("UNIQUE"))        return "감각적이고 독특한 공간을 발견하는 사람";
  if (tags.includes("INSPIRING") && tags.includes("SENSIBLE"))     return "영감 있고 감각적인 공간에 끌리는 사람";
  if (tags.includes("COMFORTABLE") && tags.includes("WANT_AGAIN")) return "편안해서 다시 찾고 싶은 공간을 좋아하는 사람";
  const fallbackKo: Partial<Record<Tag, string>> = {
    QUIET:       "조용한 공간에서 오래 머무는 사람",
    INSPIRING:   "영감을 주는 공간을 찾는 사람",
    COMFORTABLE: "편안한 공간을 즐기는 사람",
    UNIQUE:      "독특한 공간을 탐험하는 사람",
    WANT_AGAIN:  "다시 찾고 싶은 공간을 만드는 사람",
    SENSIBLE:    "감각 있는 공간에 끌리는 사람",
    WARM:        "따뜻한 분위기의 공간을 좋아하는 사람",
    FOCUSED:     "집중할 수 있는 공간을 선호하는 사람",
  };
  return fallbackKo[tags[0]] ?? "나만의 공간을 탐험하는 사람";
}

/** 두 태그 목록 간 겹치는 수 (유사도 점수) */
export function tagOverlap(a: Tag[], b: Tag[]): number {
  const setB = new Set(b);
  return a.filter((t) => setB.has(t)).length;
}
