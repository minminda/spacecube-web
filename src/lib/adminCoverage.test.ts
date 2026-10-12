import { describe, expect, it } from "vitest";
import { hasCoord, isSinglePoint, regionOptions, spacesInRegion } from "./adminCoverage";

describe("adminCoverage", () => {
  it("matches 연남 and 연남동 as the same region", () => {
    const spaces = [{ district: "연남동" }, { district: "연남" }, { district: "망원동" }, { district: null }];
    expect(spacesInRegion("연남", spaces)).toHaveLength(2);
    expect(spacesInRegion("망원동", spaces)).toHaveLength(1);
  });
  it("builds de-duplicated region options", () => {
    expect(regionOptions([{ name: "연남동" }], [{ district: "연남" }, { district: "용인 처인구" }, { district: null }])).toEqual(["연남", "용인 처인구"]);
  });
  it("detects coords and single-point sets", () => {
    expect(hasCoord({ lat: 37, lng: 126 })).toBe(true);
    expect(hasCoord({ lat: null, lng: 126 })).toBe(false);
    expect(isSinglePoint([{ lat: 37.5, lng: 126.9 }])).toBe(true);
    expect(isSinglePoint([{ lat: 37.5, lng: 126.9 }, { lat: 37.6, lng: 126.9 }])).toBe(false);
    expect(isSinglePoint([])).toBe(false);
  });
});
