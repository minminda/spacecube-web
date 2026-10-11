import { describe, expect, it } from "vitest";
import { normalizeText, queryTokens, searchRegions, searchSpaces, type SearchDoc } from "./spaceSearch";

const doc = (o: Partial<SearchDoc> & { id: string; name: string }): SearchDoc => ({
  area: "연남", category: "", tags: [], summary: "", description: "", curation: [], reasons: [], order: 0, ...o,
});

const A = doc({ id: "A", name: "북눅 연남", area: "연남", category: "독립서점", tags: ["책", "조용한"], summary: "책이 있는 조용한 곳", order: 5 });
const B = doc({ id: "B", name: "턴다운서비스", area: "연남", category: "LP카페", tags: ["음악", "LP"], description: "턴테이블과 LP 음악을 들으며 머물 수 있는 공간", order: 4 });
const C = doc({ id: "C", name: "작은 서점 후암", area: "후암", category: "독립서점", tags: ["책"], order: 3 });
const D = doc({ id: "D", name: "후암 음악 바", area: "후암", category: "바", tags: ["저녁"], description: "LP 바", order: 2 });
const E = doc({ id: "E", name: "녹화버튼", area: "망원", category: "촬영장비", tags: ["영화"], description: "캠코더를 빌려 영화처럼 기록하는 곳", order: 1 });
const F = doc({ id: "F", name: "망원 LP 하우스", area: "망원", category: "레코드숍", tags: ["LP", "음악"], order: 6 });
const G = doc({ id: "G", name: "골목 카페", area: "망원", category: "카페", description: "LP 한 장이 걸려 있는 카페", order: 7 });
const H = doc({ id: "H", name: "작업실", area: "성수", category: "작업공간", description: "책상 위의 조용한 시간", order: 8 });
const POOL = [A, B, C, D, E, F, G, H];
const ids = (q: string) => searchSpaces(POOL, q).map((h) => h.doc.id);

describe("검색어 정리", () => {
  it("공백 · 대소문자 · 기호를 정리하고 단어로 나눈다", () => {
    expect(queryTokens("  망원   LP ")).toEqual(["망원", "lp"]);
    expect(queryTokens("LP, lp  Lp")).toEqual(["lp"]); // 같은 말은 한 번만
    expect(queryTokens("")).toEqual([]);
    expect(normalizeText("LP카페!")).toBe("lp카페");
  });
  it("공백 · 대소문자만 달라도 같은 결과", () => {
    expect(ids("  lp ")).toEqual(ids("LP"));
    expect(ids("Lp")).toEqual(ids("LP"));
  });
});

describe("한 단어 — 필드별 순위", () => {
  it("공간명이 정확히 같으면 가장 위", () => {
    expect(ids("북눅 연남")[0]).toBe("A");
    expect(ids("골목 카페")[0]).toBe("G");
  });

  it("공간명 단어 일치(80)가 지역 정확히(75)보다 위, 그다음 지역 정확히", () => {
    expect(ids("연남")).toEqual(["A", "B"]); // A는 이름에 "연남"이 단어로, B는 지역이 "연남"
  });

  it("지역이 같은 공간은 최근에 소개한 곳 먼저(점수가 같을 때)", () => {
    const r = searchSpaces([doc({ id: "x", name: "가", area: "서촌", order: 1 }), doc({ id: "y", name: "나", area: "서촌", order: 9 })], "서촌");
    expect(r.map((h) => h.doc.id)).toEqual(["y", "x"]);
  });

  it("태그 정확히 일치가 이름 일부 일치보다 위", () => {
    const tag = doc({ id: "tag", name: "가나다", tags: ["전시"] });
    const part = doc({ id: "part", name: "옆집 전시장", tags: [] }); // 이름 가운데 "전시장" — 앞부분도 단어도 아닌 일부 일치(45)
    expect(searchSpaces([part, tag], "전시").map((h) => h.doc.id)).toEqual(["tag", "part"]);
  });

  it("이름이 검색어로 시작하면(앞부분 80) 태그 정확히(60)보다 위", () => {
    const tag = doc({ id: "tag", name: "가나다", tags: ["전시"] });
    const prefix = doc({ id: "prefix", name: "전시장 옆집", tags: [] });
    expect(searchSpaces([tag, prefix], "전시").map((h) => h.doc.id)).toEqual(["prefix", "tag"]);
  });

  it("설명에만 있는 말도 찾는다(가장 낮은 점수)", () => {
    const hits = searchSpaces(POOL, "캠코더");
    expect(hits.map((h) => h.doc.id)).toEqual(["E"]);
    expect(hits[0].matched[0]).toMatchObject({ field: "description", points: 10 });
  });

  it("이름에 없어도 설명에 LP가 있으면 LP 검색에 나온다", () => {
    expect(ids("LP")).toContain("G"); // 이름 · 태그 어디에도 LP가 없고 설명에만 있다
  });

  it("큐레이션 · 선정 이유에 있는 말도 찾는다", () => {
    const d = doc({ id: "c", name: "가게", curation: ["혼자 오래 머무는 연남"], reasons: ["창가 자리가 좋아요"] });
    expect(searchSpaces([d], "오래 머무는")[0].matched[0].field).toBe("curation");
    expect(searchSpaces([d], "창가")[0].matched[0].field).toBe("reason");
  });

  it("LP — 이름 · 태그 · 테마에 맞는 공간이 설명만 맞는 공간보다 위", () => {
    expect(ids("LP")).toEqual(["F", "B", "D", "G"]);
  });
});

describe("여러 단어는 점수를 더한다", () => {
  it("망원 LP — 둘 다 맞는 공간이 위, 한쪽만 맞는 공간도 남는다", () => {
    const r = ids("망원 LP");
    expect(r.slice(0, 2)).toEqual(["F", "G"]); // F: 이름 · 지역 · 태그, G: 지역 + 설명
    expect(r.indexOf("G")).toBeLessThan(r.indexOf("E")); // 망원만 맞는 E보다 위
    expect(r.indexOf("G")).toBeLessThan(r.indexOf("B")); // LP만 맞는 B보다 위
    expect(r).toContain("B"); // LP만 맞아도 결과에서 사라지지 않는다
    expect(r).toContain("E");
  });

  it("후암 책 — 둘 다 → 후암만 → 책만", () => {
    expect(ids("후암 책").slice(0, 3)).toEqual(["C", "D", "A"]);
  });
});

describe("지역 이름 정리", () => {
  it("연남동 = 연남", () => {
    expect(ids("연남동")).toEqual(ids("연남"));
  });
  it("한 글자 단어는 정확히 같을 때와 테마로만 맞는다(설명 속 '책상'에 걸리지 않음)", () => {
    const r = ids("책");
    expect(r).toEqual(expect.arrayContaining(["A", "C"]));
    expect(r).not.toContain("H");
  });
});

describe("결과 없음", () => {
  it("맞는 공간이 없으면 빈 목록", () => {
    expect(ids("존재하지않는검색어")).toEqual([]);
    expect(ids("   ")).toEqual([]);
  });
});

describe("지역 검색", () => {
  const AREAS = ["망원", "연남", "후암", "서촌", "성수", "용인 처인구"];
  it("정확히 같은 지역이 먼저", () => {
    expect(searchRegions(AREAS, "연남동")).toEqual([{ area: "연남", exact: true }]);
    expect(searchRegions(AREAS, "망원 LP")).toEqual([{ area: "망원", exact: true }]);
  });
  it("앞부분만 맞는 지역은 두 글자 이상일 때 뒤에", () => {
    expect(searchRegions(AREAS, "용인")).toEqual([{ area: "용인 처인구", exact: false }]);
    expect(searchRegions(AREAS, "처인구")).toEqual([{ area: "용인 처인구", exact: false }]);
    expect(searchRegions(AREAS, "망")).toEqual([]);
  });
  it("지역이 아닌 말은 지역 결과가 없다", () => {
    expect(searchRegions(AREAS, "LP")).toEqual([]);
  });
});
