import { describe, it, expect } from "vitest";
import { categoryOptions, filterCandidates, finderHref, parseFinderQuery, personalReason, rankCandidates, type FinderCandidate } from "./spaceFinder";
import { buildTasteProfile } from "@/lib/discoveryRecommend";

const col = (title: string, curatorSlug: string, keywords: string[]) => ({ title, slug: title, curatorSlug, curatorName: curatorSlug, curatorIsOfficial: false, keywords });
const c = (o: Partial<FinderCandidate> & { id: string }): FinderCandidate => ({ name: o.id, area: "연남", category: "카페", tags: [], order: 0, collections: [], curations: [], ...o });

const pool = [
  c({ id: "book", name: "북눅 연남", area: "연남동", category: "독립서점", order: 1, collections: [col("혼자 오래 있고 싶은 연남", "minji", ["혼자", "조용한"])], curations: [{ title: "혼자 천천히", slug: "a" }] }),
  c({ id: "lp", name: "턴다운서비스", category: "LP카페", tags: ["음악"], order: 0 }),
  c({ id: "quiet", name: "조용카페", tags: ["조용한", "감각적인"], order: 2 }),
  c({ id: "far", name: "서촌 서점", area: "서촌", category: "독립서점", tags: ["조용한"], order: 3 }),
];

describe("parseFinderQuery", () => {
  it("예전 feel/for 이름을 받고, 표기 차이(감각적인)는 같은 분위기로", () => {
    expect(parseFinderQuery({ area: "연남동", feel: "감각적인,없는것", for: "책", q: "  카페 " })).toEqual({ area: "연남", category: null, q: "카페", moods: ["감각 있는"], purposes: ["책"] });
  });
});

describe("filterCandidates — 후보 축소", () => {
  it("지역만 고르면 그 지역 공간 전부(몇 곳만 고르지 않음)", () => {
    expect(filterCandidates(pool, parseFinderQuery({ area: "연남" })).map((x) => x.id).sort()).toEqual(["book", "lp", "quiet"]);
  });
  it("검색: 이름 · 유형 · 컬렉션 키워드 · 분위기/목적 이름, 낱말은 모두 맞아야", () => {
    expect(filterCandidates(pool, parseFinderQuery({ q: "북눅" })).map((x) => x.id)).toEqual(["book"]);
    expect(filterCandidates(pool, parseFinderQuery({ q: "음악" })).map((x) => x.id)).toEqual(["lp"]);
    expect(filterCandidates(pool, parseFinderQuery({ area: "연남", q: "조용한 카페" })).map((x) => x.id)).toEqual(["quiet"]);
    expect(filterCandidates(pool, parseFinderQuery({ q: "책" })).map((x) => x.id).sort()).toEqual(["book", "far"]);
  });
  it("필터: 분위기·목적은 모두 만족해야(컬렉션 키워드 포함)", () => {
    expect(filterCandidates(pool, parseFinderQuery({ area: "연남", feel: "조용한" })).map((x) => x.id).sort()).toEqual(["book", "quiet"]);
    expect(filterCandidates(pool, parseFinderQuery({ area: "연남", feel: "조용한", for: "책" })).map((x) => x.id)).toEqual(["book"]);
  });
});

describe("rankCandidates — 개인화 정렬", () => {
  it("취향 데이터가 없으면 큐레이션·컬렉션 포함 정도 → 공개 순서", () => {
    expect(rankCandidates(pool.slice(0, 3), null).map((r) => r.space.id)).toEqual(["book", "lp", "quiet"]);
  });
  it("취향이 있으면 겹치는 속성 가중치 순, 이유는 실제 겹친 속성으로만", () => {
    const profile = buildTasteProfile({ visits: [{ name: "음악", weight: 4 }], visitCount: 1, saves: [["LP카페"]] });
    const r = rankCandidates(pool.slice(0, 3), profile);
    expect(r[0].space.id).toBe("lp");
    expect(r[0].matched).toEqual(["음악", "LP카페"]);
    expect(personalReason(r[1].matched)).toBeNull();
  });
  it("검색 후에도 같은 개인 정렬(필터 → 정렬)", () => {
    const profile = buildTasteProfile({ visits: [], visitCount: 0, saves: [["감각적인"]] });
    const filtered = filterCandidates(pool, parseFinderQuery({ area: "연남", q: "카페" }));
    expect(rankCandidates(filtered, profile)[0].space.id).toBe("quiet");
  });
  it("취향이 맞는 큐레이터가 고른 공간에 가산점", () => {
    const r = rankCandidates(pool.slice(0, 3), null, new Map([["minji", 1.5]]));
    expect(r[0].space.id).toBe("book");
    expect(r[0].affineCollections.map((k) => k.curatorSlug)).toEqual(["minji"]);
  });
});

describe("지역 · 카테고리 · 검색 조합", () => {
  const ids = (q: Parameters<typeof parseFinderQuery>[0]) => filterCandidates(pool, parseFinderQuery(q)).map((x) => x.id).sort();

  it("카테고리는 저장된 값과 정확히 같은 공간만, 지역 · 검색과 동시에 적용", () => {
    expect(ids({ category: "독립서점" })).toEqual(["book", "far"]);
    expect(ids({ area: "연남", category: "독립서점" })).toEqual(["book"]);
    expect(ids({ area: "연남", category: "독립서점", q: "북" })).toEqual(["book"]);
    expect(ids({ area: "연남", category: "LP카페", q: "북" })).toEqual([]);
    expect(ids({ category: "카페", q: "조용" })).toEqual(["quiet"]);
  });

  it("카테고리 값이 없는 공간은 전체에서만 보인다(기타로 바꾸지 않음)", () => {
    const withNull = [...pool, c({ id: "none", category: "" })];
    expect(filterCandidates(withNull, parseFinderQuery({})).map((x) => x.id)).toContain("none");
    expect(filterCandidates(withNull, parseFinderQuery({ category: "카페" })).map((x) => x.id)).not.toContain("none");
    const opts = categoryOptions(withNull);
    expect(opts[0]).toBe("독립서점"); // 많은 순
    expect([...opts].sort()).toEqual(["LP카페", "독립서점", "카페"].sort());
  });

  it("필터 뒤에도 남은 공간의 개인화 순서는 그대로", () => {
    const profile = buildTasteProfile({ visits: [{ name: "조용한", weight: 4 }], visitCount: 1, saves: [["혼자"], ["음악"]] });
    const all = rankCandidates(pool, profile).map((r) => r.space.id);
    const onlyYeonnam = rankCandidates(filterCandidates(pool, parseFinderQuery({ area: "연남" })), profile).map((r) => r.space.id);
    expect(onlyYeonnam).toEqual(all.filter((id) => onlyYeonnam.includes(id)));
  });

  it("주소에 지역 · 카테고리 · 검색어를 남긴다", () => {
    expect(finderHref({ area: null, category: null, q: "" })).toBe("/find");
    expect(finderHref({ area: "연남", category: "복합문화공간", q: "북" })).toBe(`/find?area=${encodeURIComponent("연남")}&category=${encodeURIComponent("복합문화공간")}&q=${encodeURIComponent("북")}`);
  });
});
