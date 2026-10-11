import { describe, it, expect } from "vitest";
import { cleanRegionName, countSpacesInRegion, findRegionConflict, findUnregisteredRegions, makeRegionSlug } from "./regions";

const R = [{ id: "1", name: "연남" }, { id: "2", name: "망원" }];

describe("regions", () => {
  it("cleanRegionName은 공백을 정리하고 빈 값은 null", () => {
    expect(cleanRegionName("  연남   동 ")).toBe("연남 동");
    expect(cleanRegionName("   ")).toBeNull();
    expect(cleanRegionName(3)).toBeNull();
  });
  it("연남 / 연남동은 같은 지역으로 본다", () => {
    expect(findRegionConflict("연남동", R)?.id).toBe("1");
    expect(findRegionConflict("서촌", R)).toBeNull();
    expect(findRegionConflict("연남동", R, "1")).toBeNull(); // 자기 자신은 제외
  });
  it("slug는 충돌하지 않게 만든다", () => {
    expect(makeRegionSlug("Seochon", new Set())).toBe("seochon");
    expect(makeRegionSlug("서촌", new Set())).toBe("region-1");
    expect(makeRegionSlug("서촌", new Set(["region-1"]))).toBe("region-2");
  });
  it("같은 slug는 한 공간으로 센다", () => {
    const used = [{ value: "연남동", slug: "a" }, { value: "연남", slug: "a" }, { value: "연남동", slug: "b" }, { value: "망원동", slug: "c" }];
    expect(countSpacesInRegion("연남", used)).toBe(2);
  });
  it("미등록 지역은 정규화해서 묶는다", () => {
    const used = [{ value: "서촌", slug: "a" }, { value: "서촌동", slug: "b" }, { value: "연남동", slug: "c" }];
    expect(findUnregisteredRegions(used, ["연남"])).toEqual([{ label: "서촌", count: 2, values: ["서촌", "서촌동"] }]);
  });
});
