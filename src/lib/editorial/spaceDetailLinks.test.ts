import { describe, it, expect } from "vitest";
import { curationLineFor, pickSpaceReasons, relatedSpacesFor } from "./spaceDetailLinks";
import type { CurationView, SpaceView } from "./types";

const sp = (id: string, area = "연남동"): SpaceView => ({ id, slug: id, name: id, area, category: "카페", status: "PUBLISHED" } as SpaceView);
const cur = (id: string, links: [string, string | undefined][], summary = `${id} 요약`): CurationView => ({
  id, slug: `c-${id}`, number: 1, title: `${id} 제목`, summary, cover: { src: null, alt: "" }, blocks: [], status: "PUBLISHED", publishedAt: null,
  spaces: links.map(([s, note]) => ({ space: sp(s), note })),
});

describe("pickSpaceReasons — 고른 이유", () => {
  // 호출부 순서(number DESC = 최신 큐레이션 먼저)를 그대로 따른다
  const list = [cur("c3", [["a", undefined], ["b", "c3의 b"]]), cur("c2", [["a", "c2의 a"]]), cur("c1", [["a", "c1의 a"]])];
  it("note가 있는 첫 큐레이션 1개(앞 큐레이션에 note가 없으면 건너뜀)", () => {
    expect(pickSpaceReasons(list, "a")).toEqual([{ note: "c2의 a", curation: { id: "c2", slug: "c-c2", title: "c2 제목" } }]);
  });
  it("max로 여러 개, 순서 유지", () => expect(pickSpaceReasons(list, "a", 2).map((r) => r.curation.id)).toEqual(["c2", "c1"]));
  it("note가 없으면 빈 목록", () => expect(pickSpaceReasons(list, "z")).toEqual([]));
  it("공백뿐인 note는 이유가 아니다", () => expect(pickSpaceReasons([cur("c", [["a", "   "]])], "a")).toEqual([]));
});

describe("curationLineFor — 이야기 카드 한 줄", () => {
  const c = cur("c1", [["a", "a의 이유"]]);
  it("이 공간의 note", () => expect(curationLineFor(c, "a", new Set())).toBe("a의 이유"));
  it("위에서 이미 인용한 큐레이션은 요약(같은 문장 반복 없음)", () => expect(curationLineFor(c, "a", new Set(["c1"]))).toBe("c1 요약"));
  it("note가 없으면 요약", () => expect(curationLineFor(c, "b", new Set())).toBe("c1 요약"));
  it("요약도 없으면 null", () => expect(curationLineFor(cur("c2", [], ""), "a", new Set())).toBeNull());
});

describe("relatedSpacesFor — 함께 소개된 공간 우선, 지역으로 채움", () => {
  const curations = [cur("c2", [["me", "x"], ["b", "x"], ["c", "x"]]), cur("c1", [["c", "x"], ["me", "x"], ["d", "x"]])];
  it("같은 큐레이션 공간을 큐레이션 순서대로, 자기 자신 제외 · 중복 제거", () => {
    const r = relatedSpacesFor("me", curations, [sp("e")]);
    expect(r.spaces.map((s) => s.id)).toEqual(["b", "c", "d"]);
    expect(r.kind).toBe("curation");
  });
  it("모자라면 같은 지역으로 채우되 이미 나온 공간은 다시 넣지 않는다", () => {
    const r = relatedSpacesFor("me", [cur("c", [["me", "x"], ["b", "x"]])], [sp("b"), sp("e"), sp("f")]);
    expect(r.spaces.map((s) => s.id)).toEqual(["b", "e", "f"]);
    expect(r.kind).toBe("mixed");
  });
  it("큐레이션이 없으면 같은 지역 공간(fallback)", () => {
    const r = relatedSpacesFor("me", [], [sp("e"), sp("f"), sp("g"), sp("h")]);
    expect(r.spaces.map((s) => s.id)).toEqual(["e", "f", "g"]);
    expect(r.kind).toBe("area");
  });
  it("자기 자신만 있는 큐레이션 + 지역 공간 없음 → 빈 목록", () => {
    expect(relatedSpacesFor("me", [cur("c", [["me", "x"]])], []).spaces).toEqual([]);
  });
});
