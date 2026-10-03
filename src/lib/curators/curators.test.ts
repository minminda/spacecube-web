import { describe, it, expect } from "vitest";
import { alsoPickedLine, curatorsLine, hasBatchim, type FinderPick } from "./finder";
import { affinityReason, computeAffinities, curatorPickRecommendations, enrichProfileWithCollections, pickReason } from "./affinity";
import { buildTasteProfile } from "@/lib/discoveryRecommend";

const spaces = [
  { id: "book", name: "북눅", area: "연남동", category: "독립서점", tags: [] as string[] },
  { id: "lp", name: "LP바", area: "연남", category: "LP카페", tags: ["음악", "밤"] },
  { id: "quiet", name: "조용카페", area: "연남", category: "카페", tags: ["조용한", "혼자"] },
  { id: "far", name: "서촌카페", area: "서촌", category: "카페", tags: ["조용한"] },
  { id: "nopick", name: "아무도안고름", area: "연남", category: "카페", tags: ["조용한"] },
];

const pick = (spaceId: string, curatorSlug: string, curatorName: string, collectionTitle: string, keywords: string[], comment: string | null = null): FinderPick => ({
  spaceId, curatorSlug, curatorName, collectionSlug: collectionTitle, collectionTitle, keywords, comment,
});

const picks: FinderPick[] = [
  pick("book", "minji", "민지", "혼자 오래 있고 싶은 연남", ["혼자", "조용한", "책"], "몇 시간 책 읽고 싶을 때."),
  pick("book", "official", "공간큐브", "오래 머물 이유", ["오래 머무는"]),
  pick("quiet", "minji", "민지", "혼자 오래 있고 싶은 연남", ["혼자", "조용한"]),
  pick("lp", "hyunwoo", "현우", "오래 듣고 싶은 연남", ["음악", "밤"], "음질 때문에 다시 가는 곳."),
  pick("far", "minji", "민지", "비 오는 날", ["조용한"]),
];

describe("문구", () => {
  it("받침에 맞는 조사", () => {
    expect(hasBatchim("민지님")).toBe(true);
    expect(hasBatchim("공간큐브")).toBe(false);
    expect(curatorsLine([{ name: "민지" }, { name: "공간큐브", isOfficial: true }])).toBe("민지님과 공간큐브가 추천한 곳");
    expect(curatorsLine([{ name: "현우" }])).toBe("현우님이 추천한 곳");
    expect(pickReason("공간큐브", [], "오래 머물 이유")).toContain("공간큐브가");
    expect(alsoPickedLine([{ name: "공간큐브", isOfficial: true }])).toBe("공간큐브도 고른 곳");
    expect(alsoPickedLine([{ name: "민지" }, { name: "현우" }])).toBe("민지님과 현우님도 고른 곳");
  });
});

describe("affinity", () => {
  const curators = [
    { slug: "minji", name: "민지", tasteTags: ["조용한", "책", "혼자"] },
    { slug: "hyunwoo", name: "현우", tasteTags: ["음악", "LP", "밤"] },
  ];
  const spaceMap = new Map(spaces.map((s) => [s.id, s]));

  it("같은 공간·같은 결로 단계를 정하고, 겹침이 없으면 '새로운 취향'", () => {
    const profile = enrichProfileWithCollections(buildTasteProfile({ visits: [], visitCount: 0, saves: [["독립서점"]] }), new Set(["book"]), picks);
    const aff = computeAffinities(profile, new Set(["book"]), curators, picks, spaceMap);
    expect(aff[0].curator.slug).toBe("minji");
    expect(aff[0].level).toBe("very");
    expect(aff[0].sharedSpaceIds).toEqual(["book"]);
    expect(aff.find((a) => a.curator.slug === "hyunwoo")!.level).toBe("new");
    expect(affinityReason(aff[0], "민지님")).toContain("1곳을 민지님도");
  });

  it("취향 맞는 큐레이터의 아직 안 간 공간을 지역별로 추천", () => {
    const profile = enrichProfileWithCollections(buildTasteProfile({ visits: [], visitCount: 0, saves: [["독립서점"]] }), new Set(["book"]), picks);
    const aff = computeAffinities(profile, new Set(["book"]), curators, picks, spaceMap);
    const recs = curatorPickRecommendations(aff, picks, spaceMap, profile, { exclude: new Set(["book"]) });
    expect(recs.map((r) => r.space.id)).toEqual(["quiet", "far"]);
    expect(recs[0].overlap).toContain("조용한");
    const seochon = curatorPickRecommendations(aff, picks, spaceMap, profile, { exclude: new Set(["book"]), area: (s) => s.area === "서촌" });
    expect(seochon.map((r) => r.space.id)).toEqual(["far"]);
  });
});
