import { describe, expect, it } from "vitest";
import { isValidKoreaCoord } from "./kakaoLocal";
import { activeAdminNavKey, adminBackFallback } from "./adminNav";

describe("isValidKoreaCoord", () => {
  it("accepts Seoul and rejects out-of-range / non-numeric", () => {
    expect(isValidKoreaCoord(37.56, 126.92)).toBe(true);
    expect(isValidKoreaCoord(0, 0)).toBe(false);
    expect(isValidKoreaCoord(126.9, 37.5)).toBe(false);
    expect(isValidKoreaCoord("37", 126)).toBe(false);
    expect(isValidKoreaCoord(NaN, 126)).toBe(false);
  });
});

describe("space map nav", () => {
  it("highlights its own item and goes back to 운영 공간", () => {
    expect(activeAdminNavKey("/admin/spaces/map")).toBe("space-map");
    expect(activeAdminNavKey("/admin/spaces")).toBe("spaces");
    expect(adminBackFallback("/admin/spaces/map")).toBe("/admin/spaces");
  });
});
