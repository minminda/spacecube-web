import { describe, it, expect } from "vitest";
import {
  HOME_THEMES,
  buildAreaOptions,
  buildAreaShelves,
  buildCategoryShelves,
  buildThemeShelves,
  filterAreaOptions,
  homeHref,
  matchesTheme,
  newestFirst,
  spacesInArea,
  pickDiscoverySet,
  type HomeSpace,
} from "./shelves";
import { findFixtureSpace, fixtureSpaces } from "./fixtures";

let n = 0;
function sp(p: Partial<HomeSpace> & { area: string | null }): HomeSpace {
  n += 1;
  return { id: `s${n}`, slug: `s${n}`, name: `공간${n}`, category: "", tags: [], image: { src: null, alt: "" }, partner: false, order: n, ...p };
}
const theme = (key: string) => HOME_THEMES.find((t) => t.key === key)!;

describe("HOME 선반 — 테마", () => {
  it("유형 · 태그 · 이름의 말로 테마를 찾는다(대소문자 무시)", () => {
    expect(matchesTheme({ category: "독립서점", tags: [], name: "x" }, theme("book"))).toBe(true);
    expect(matchesTheme({ category: "카페", tags: ["LP"], name: "x" }, theme("music"))).toBe(true);
    expect(matchesTheme({ category: "카페", tags: [], name: "x" }, theme("music"))).toBe(false);
  });

  it("한 글자 키워드는 정확히 같을 때만(‘바’가 ‘바다’에 걸리지 않게)", () => {
    expect(matchesTheme({ category: "바", tags: [], name: "x" }, theme("evening"))).toBe(true);
    expect(matchesTheme({ category: "바다 카페", tags: [], name: "바다" }, theme("evening"))).toBe(false);
  });

  it("한 공간이 여러 테마 선반에 동시에 나온다", () => {
    const s = sp({ area: "후암", category: "카페", tags: ["음악", "혼자"] });
    const shelves = buildThemeShelves([s, sp({ area: "후암", category: "카페", tags: ["음악", "혼자"] }), sp({ area: "망원", category: "카페", tags: ["음악", "혼자"] })], { min: 3 });
    const keys = shelves.map((x) => x.theme.key);
    expect(keys).toEqual(expect.arrayContaining(["music", "coffee", "alone"]));
    for (const shelf of shelves) expect(shelf.spaces.map((x) => x.id)).toContain(s.id);
  });

  it("공간이 min곳보다 적은 테마는 선반을 만들지 않는다", () => {
    const shelves = buildThemeShelves([sp({ area: "연남", category: "갤러리", tags: [] }), sp({ area: "연남", category: "갤러리", tags: [] })], { min: 3 });
    expect(shelves.find((s) => s.theme.key === "exhibition")).toBeUndefined();
  });
});

describe("HOME 선반 — 지역 · 유형", () => {
  const spaces = [
    sp({ area: "후암", category: "카페" }), sp({ area: "후암", category: "카페" }), sp({ area: "후암", category: "서점" }),
    sp({ area: "망원", category: "카페" }), sp({ area: "망원", category: "카페" }), sp({ area: "망원", category: "카페" }), sp({ area: "망원", category: "숍" }),
    sp({ area: "연남", category: "카페" }),
  ];

  it("공간이 많은 지역부터, min곳 미만 지역은 제외", () => {
    const shelves = buildAreaShelves(spaces, { min: 3 });
    expect(shelves.map((s) => s.area)).toEqual(["망원", "후암"]);
    expect(shelves[0].total).toBe(4);
  });

  it("선반 안은 새로 소개한 순", () => {
    const [mangwon] = buildAreaShelves(spaces, { min: 3 });
    const orders = mangwon.spaces.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => b - a));
  });

  it("지역 안 유형 선반(‘후암의 카페’)은 2곳 이상인 유형만", () => {
    const cats = buildCategoryShelves(spacesInArea(spaces, "후암동"), { min: 2 });
    expect(cats.map((c) => c.category)).toEqual(["카페"]);
  });

  it("지역 이름은 정규화해서 고른다(후암동 → 후암), 없으면 전체", () => {
    expect(spacesInArea(spaces, "후암동")).toHaveLength(3);
    expect(spacesInArea(spaces, null)).toHaveLength(spaces.length);
  });

  it("newestFirst는 원본을 바꾸지 않는다", () => {
    const copy = [...spaces];
    newestFirst(spaces);
    expect(spaces).toEqual(copy);
  });
});

describe("HOME 지역 선택", () => {
  const options = buildAreaOptions([
    { area: "후암", spaceCount: 4, curationCount: 1 },
    { area: "을지로", spaceCount: 2, curationCount: 0 },
    { area: "익선", spaceCount: 5, curationCount: 0 },
  ]);

  it("추천 지역을 먼저(데이터 없어도 보임), 그다음 등록된 다른 지역(공간 많은 순)", () => {
    expect(options.slice(0, 5).map((o) => o.area)).toEqual(["망원", "연남", "후암", "서촌", "성수"]);
    expect(options.slice(0, 5).every((o) => o.suggested)).toBe(true);
    expect(options.find((o) => o.area === "망원")?.spaceCount).toBe(0);
    expect(options.slice(5).map((o) => o.area)).toEqual(["익선", "을지로"]);
  });

  it("검색은 공백 · ‘동’ 생략을 허용한다", () => {
    expect(filterAreaOptions(options, "후암동").map((o) => o.area)).toEqual(["후암"]);
    expect(filterAreaOptions(options, " 을 지 ").map((o) => o.area)).toEqual(["을지로"]);
    expect(filterAreaOptions(options, "")).toHaveLength(options.length);
  });

  it("HOME 주소는 지역 · 미리보기 파라미터를 유지한다", () => {
    expect(homeHref({})).toBe("/");
    expect(homeHref({ area: "후암" })).toBe(`/?area=${encodeURIComponent("후암")}`);
    expect(homeHref({ area: "후암", preview: "fixtures" })).toBe(`/?area=${encodeURIComponent("후암")}&preview=fixtures`);
  });
});

describe("HOME 시연용 가상 공간(fixtures)", () => {
  it("fixture-N slug · 사진 · 태그 3~5개를 갖고 모두 시연용 지역 망원이다", () => {
    const list = fixtureSpaces(100);
    expect(list).toHaveLength(11);
    for (const f of list) {
      expect(f.fixture).toBe(true);
      expect(f.slug).toMatch(/^fixture-\d+$/);
      expect(findFixtureSpace(f.slug as string)?.id).toBe(f.id);
      expect(f.tags.length).toBeGreaterThanOrEqual(3);
      expect(f.tags.length).toBeLessThanOrEqual(5);
      expect(f.id.startsWith("fixture:")).toBe(true);
      expect(f.image.src).toMatch(/^\/demo\//);
      expect(f.area).toBe("망원");
      expect(f.partner).toBe(false);
    }
  });

  it("fixture slug가 아니면 찾지 않는다(실제 공간 slug와 섞이지 않는다)", () => {
    expect(findFixtureSpace("buk")).toBeNull();
    expect(findFixtureSpace("fixture-9999")).toBeNull();
    expect(findFixtureSpace("fixture-0")).toBeNull();
    expect(findFixtureSpace("fixture-12")).toBeNull();
  });

  it("시연용 공간만으로도 지역 · 테마 선반 구조가 생긴다", () => {
    const list = fixtureSpaces(0);
    expect(buildAreaShelves(list, { min: 3 }).length).toBeGreaterThan(0);
    expect(buildThemeShelves(list, { min: 3 }).length).toBeGreaterThan(0);
  });
});

describe("개인화 데이터가 없을 때의 먼저 둘러보기(pickDiscoverySet)", () => {
  const photo = { src: "/x.jpg", alt: "" };
  const mk = (i: number, category: string, area: string, tags: string[], src: string | null = photo.src): HomeSpace =>
    ({ id: `p${i}`, slug: `p${i}`, name: `p${i}`, area, category, tags, image: src ? photo : { src: null, alt: "" }, partner: false, order: i });

  it("사진 없는 공간은 고르지 않고 같은 공간을 두 번 넣지 않는다", () => {
    const list = [mk(1, "카페", "망원", ["커피"], null), mk(2, "카페", "망원", ["커피"]), mk(2, "카페", "망원", ["커피"]), mk(3, "서점", "연남", ["책"])];
    const out = pickDiscoverySet(list, 10);
    expect(out.map((s) => s.id)).toEqual(["p2", "p3"]);
  });

  it("유형이 겹치지 않게 먼저 고른다 — 카페가 앞에 몰려 있어도 다른 유형이 일찍 나온다", () => {
    const list = [mk(1, "카페", "망원", ["커피"]), mk(2, "카페", "망원", ["커피"]), mk(3, "카페", "망원", ["커피"]), mk(4, "북카페", "망원", ["책"]), mk(5, "LP카페", "망원", ["LP"])];
    const out = pickDiscoverySet(list, 3);
    expect(new Set(out.map((s) => s.category)).size).toBe(3);
  });

  it("같은 입력이면 같은 결과이고 n을 넘기지 않는다", () => {
    const list = Array.from({ length: 8 }, (_, i) => mk(i + 1, i % 2 ? "카페" : "서점", "망원", ["조용한"]));
    expect(pickDiscoverySet(list, 4).map((s) => s.id)).toEqual(pickDiscoverySet([...list].reverse(), 4).map((s) => s.id));
    expect(pickDiscoverySet(list, 4)).toHaveLength(4);
  });
});
