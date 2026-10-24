import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { defaultLibraryView, filterLibrary, libraryOpenHref, parseLibraryFilter, type LibraryItem } from "./library";

const item = (o: Partial<LibraryItem>): LibraryItem => ({
  key: "k", name: "이름", area: null, meta: "", cover: null, coverIsMine: false, visited: false, saved: false,
  visitCount: 0, cubeVisits: 0, photoCount: 0, lastAt: new Date(0), tags: [], personal: false, demo: false, source: null, slug: null, ...o,
});

const items = [
  item({ key: "a", name: "북눅 연남", area: "연남동", visited: true, saved: true, tags: ["조용한"] }),
  item({ key: "b", name: "골목 카페", area: "망원", saved: true }),
  item({ key: "c", name: "개인 기록", area: null, visited: true, personal: true }),
];

describe("filterLibrary", () => {
  it("보기: 다녀온 / 저장한(아직 안 간 곳만)", () => {
    expect(filterLibrary(items, parseLibraryFilter({ view: "visited" })).map((i) => i.key)).toEqual(["a", "c"]);
    expect(filterLibrary(items, parseLibraryFilter({ view: "saved" })).map((i) => i.key)).toEqual(["b"]);
    expect(filterLibrary(items, parseLibraryFilter({})).length).toBe(3);
  });
  it("이름(공백 무시) · 지역(정규화) · 내 태그", () => {
    expect(filterLibrary(items, parseLibraryFilter({ q: "북눅연남" })).map((i) => i.key)).toEqual(["a"]);
    expect(filterLibrary(items, parseLibraryFilter({ area: "연남" })).map((i) => i.key)).toEqual(["a"]);
    expect(filterLibrary(items, parseLibraryFilter({ tag: "조용한" })).map((i) => i.key)).toEqual(["a"]);
  });
  it("알 수 없는 보기는 전체로", () => {
    expect(parseLibraryFilter({ view: "weird" }).view).toBe("all");
  });
  it("전체 보기는 다녀온 공간이 저장한 공간보다 앞(같은 상태끼리는 최근 활동 순)", () => {
    const mixed = [
      item({ key: "s1", saved: true, lastAt: new Date(3000) }),
      item({ key: "v1", visited: true, lastAt: new Date(1000) }),
      item({ key: "v2", visited: true, saved: true, lastAt: new Date(2000) }),
    ];
    expect(filterLibrary(mixed, parseLibraryFilter({})).map((i) => i.key)).toEqual(["v2", "v1", "s1"]);
  });
});

describe("defaultLibraryView", () => {
  it("다녀왔어요가 있으면 그것부터, 없으면 저장, 둘 다 없으면 다녀왔어요(빈 안내)", () => {
    expect(defaultLibraryView({ visited: 2, saved: 5 })).toBe("visited");
    expect(defaultLibraryView({ visited: 0, saved: 3 })).toBe("saved");
    expect(defaultLibraryView({ visited: 0, saved: 0 })).toBe("visited");
  });
});

describe("libraryOpenHref", () => {
  it("공개 상세가 있는 공간은 /spaces/[slug](상세 창), 개인 기록 · 상세 없는 공간은 내 기록 상세", () => {
    expect(libraryOpenHref({ key: "s-demo-green-shelf", slug: "demo-green-shelf", personal: false })).toBe("/spaces/demo-green-shelf");
    expect(libraryOpenHref({ key: "s-buk", slug: null, personal: false })).toBe("/archive/p/s-buk");
    expect(libraryOpenHref({ key: "e-abc", slug: null, personal: true })).toBe("/archive/p/e-abc");
  });
});
