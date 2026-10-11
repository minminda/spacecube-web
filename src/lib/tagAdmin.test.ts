import { describe, it, expect } from "vitest";
import { cleanTagName, findTagNameConflict, normTagName } from "./tagAdmin";

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
