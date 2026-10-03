import { describe, it, expect } from "vitest";
import { normalizeArea, sameArea } from "./area";

describe("normalizeArea", () => {
  it("동 접미사를 떼서 같은 동네로 묶는다", () => {
    expect(normalizeArea("연남동")).toBe("연남");
    expect(normalizeArea(" 망원동 ")).toBe("망원");
    expect(normalizeArea("연남")).toBe("연남");
  });
  it("동으로 끝나지 않는 지역명은 그대로(공백만 정리)", () => {
    expect(normalizeArea("용인  처인구")).toBe("용인 처인구");
    expect(normalizeArea("서촌")).toBe("서촌");
  });
  it("한 글자 + 동은 지명 자체라 그대로 둔다", () => {
    expect(normalizeArea("중동")).toBe("중동");
  });
  it("빈 값은 null", () => {
    expect(normalizeArea("  ")).toBeNull();
    expect(normalizeArea(null)).toBeNull();
  });
  it("sameArea", () => {
    expect(sameArea("연남동", "연남")).toBe(true);
    expect(sameArea("연남", "망원")).toBe(false);
    expect(sameArea(null, null)).toBe(false);
  });
});
