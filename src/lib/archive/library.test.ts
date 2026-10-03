import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { filterLibrary, parseLibraryFilter, type LibraryItem } from "./library";

const item = (o: Partial<LibraryItem>): LibraryItem => ({
  key: "k", name: "이름", area: null, meta: "", cover: null, coverIsMine: false, visited: false, saved: false,
  visitCount: 0, cubeVisits: 0, photoCount: 0, lastAt: new Date(0), tags: [], personal: false, demo: false, source: null, ...o,
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
});
