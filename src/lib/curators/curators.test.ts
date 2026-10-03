import { describe, it, expect } from "vitest";
import { alsoPickedLine, curatorsLine, finderReason, hasBatchim, parseFinderQuery, runFinder, type FinderPick } from "./finder";
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

describe("parseFinderQuery", () => {
  it("목록 밖 값은 버리고 지역은 정규화, 각 2개까지", () => {
    const q = parseFinderQuery({ area: "연남동", feel: "조용한,시끄러운", for: ["혼자", "책", "카페"] });
    expect(q).toEqual({ area: "연남", feels: ["조용한"], purposes: ["혼자", "책"] });
  });
});

describe("runFinder", () => {
  it("큐레이터가 고른 공간만, 지역 필터, 모든 조건을 만족한 곳 중 여러 큐레이터가 고른 곳이 먼저", () => {
    const r = runFinder(spaces, picks, { area: "연남", feels: ["조용한"], purposes: ["혼자"] });
    expect(r.map((x) => x.space.id)).toEqual(["book", "quiet"]);
    expect(r.every((x) => x.allMatched)).toBe(true);
    expect(r.find((x) => x.space.id === "nopick")).toBeUndefined();
  });
  it("공간 특징이 없어도 컬렉션 키워드로 맞으면 출처를 남긴다", () => {
    const [book] = runFinder(spaces, picks, { area: "연남", feels: [], purposes: ["책"] });
    expect(book.space.id).toBe("book");
    expect(book.matched[0].via).toBe("space"); // 독립서점 → 책
    const r = runFinder(spaces, picks, { area: "연남", feels: ["조용한"], purposes: [] }).find((x) => x.space.id === "book")!;
    expect(r.matched[0]).toMatchObject({ via: "collection", collectionTitle: "혼자 오래 있고 싶은 연남" });
    expect(r.comment?.text).toBe("몇 시간 책 읽고 싶을 때.");
  });
  it("조건이 하나도 안 맞으면 결과에서 뺀다", () => {
    expect(runFinder(spaces, picks, { area: "연남", feels: ["독특한"], purposes: [] })).toHaveLength(0);
  });
  it("조건 없이 지역만 고르면 그 지역의 큐레이터 공간 전부(추천 큐레이터 많은 순)", () => {
    expect(runFinder(spaces, picks, { area: "연남", feels: [], purposes: [] })[0].space.id).toBe("book");
  });
});

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
  it("finderReason은 맞은 조건만 말한다", () => {
    expect(finderReason([])).toBeNull();
    expect(finderReason([{ label: "조용한", via: "space" }])).toContain("'조용한'");
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
