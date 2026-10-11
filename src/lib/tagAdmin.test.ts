import { describe, it, expect } from "vitest";
import { checkSpaceTags, cleanTagName, findTagNameConflict, normTagName } from "./tagAdmin";

describe("tagAdmin", () => {
  it("공백/대소문자 차이는 같은 태그", () => {
    expect(normTagName(" L P ")).toBe("lp");
    expect(findTagNameConflict("lp", [{ id: "1", name: "LP" }])?.id).toBe("1");
    expect(findTagNameConflict("LP", [{ id: "1", name: "LP" }], "1")).toBeNull();
    expect(findTagNameConflict("책", [{ id: "1", name: "LP" }])).toBeNull();
  });
  it("cleanTagName", () => {
    expect(cleanTagName("  오래   머물기 ")).toBe("오래 머물기");
    expect(cleanTagName("  ")).toBeNull();
  });
});

describe("checkSpaceTags", () => {
  const active = ["조용한", "LP", "감각 있는"];
  it("등록된 태그는 정본 표기로 맞춘다", () => {
    expect(checkSpaceTags(["lp", " 조용한 "], active)).toEqual({ tags: ["LP", "조용한"], unknown: [] });
  });
  it("등록되지 않은 새 문자열은 막는다", () => {
    expect(checkSpaceTags(["조용한", "감각적인"], active).unknown).toEqual(["감각적인"]);
  });
  it("공간에 원래 있던 과거 태그는 그대로 둘 수 있다", () => {
    expect(checkSpaceTags(["감각적인", "조용한"], active, ["감각적인"])).toEqual({ tags: ["감각적인", "조용한"], unknown: [] });
  });
  it("중복을 제거한다", () => {
    expect(checkSpaceTags(["LP", "lp"], active).tags).toEqual(["LP"]);
  });
});
