import { describe, expect, it } from "vitest";
import { MAX_SAVED_REGIONS, cleanRegion, parseRegionCookie, serializeRegionCookie, withRegion } from "./saved";

describe("관심 지역 이름", () => {
  it("연남동은 연남으로, 구분 문자 · 빈 값은 걸러낸다", () => {
    expect(cleanRegion("연남동")).toBe("연남");
    expect(cleanRegion(" 망원동 ")).toBe("망원");
    expect(cleanRegion("용인 처인구")).toBe("용인 처인구");
    expect(cleanRegion("a,b|c")).toBe("a b c");
    expect(cleanRegion("")).toBeNull();
    expect(cleanRegion(null)).toBeNull();
    expect(cleanRegion("가".repeat(31))).toBeNull();
  });
});

describe("지역 쿠키", () => {
  it("저장 → 읽기가 그대로 돌아온다(공백 있는 이름 포함)", () => {
    const list = ["망원", "용인 처인구", "후암"];
    expect(parseRegionCookie(serializeRegionCookie(list))).toEqual(list);
  });
  it("중복 · 정규화 전 이름 · 이상한 값을 정리한다", () => {
    expect(parseRegionCookie("연남동,연남,,망원동")).toEqual(["연남", "망원"]);
    expect(parseRegionCookie(undefined)).toEqual([]);
    expect(parseRegionCookie("%E0%A4%A")).toEqual(expect.any(Array)); // 깨진 인코딩도 던지지 않는다
  });
  it("최대 개수를 넘으면 자른다", () => {
    const many = Array.from({ length: MAX_SAVED_REGIONS + 5 }, (_, i) => `지역${i}`).join(",");
    expect(parseRegionCookie(many)).toHaveLength(MAX_SAVED_REGIONS);
  });
});

describe("별표 켜기/끄기", () => {
  it("켜면 맨 앞(최근 순), 같은 지역은 한 번만", () => {
    expect(withRegion(["망원"], "후암", true)).toEqual(["후암", "망원"]);
    expect(withRegion(["후암", "망원"], "망원동", true)).toEqual(["망원", "후암"]);
  });
  it("끄면 뺀다", () => {
    expect(withRegion(["후암", "망원"], "후암", false)).toEqual(["망원"]);
    expect(withRegion(["망원"], "없는곳", false)).toEqual(["망원"]);
  });
  it("한도를 넘으면 가장 오래된 지역이 밀려난다", () => {
    const full = Array.from({ length: MAX_SAVED_REGIONS }, (_, i) => `지역${i}`);
    const next = withRegion(full, "새지역", true);
    expect(next).toHaveLength(MAX_SAVED_REGIONS);
    expect(next[0]).toBe("새지역");
    expect(next).not.toContain(`지역${MAX_SAVED_REGIONS - 1}`);
  });
  it("쓸 수 없는 이름은 목록을 그대로", () => {
    expect(withRegion(["망원"], "", true)).toEqual(["망원"]);
  });
});
