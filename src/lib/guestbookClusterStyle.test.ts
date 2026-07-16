import { describe, it, expect } from "vitest";
import {
  isValidHexColor,
  relativeLuma,
  isTooDarkForBlackBackground,
  validateClusterColor,
  clampFontSize,
  DARK_LUMA_THRESHOLD,
  COLOR_PRESETS,
  FONT_SIZE_PRESETS,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
} from "./guestbookClusterStyle";

describe("isValidHexColor", () => {
  it("정상 6자리 HEX는 통과", () => {
    expect(isValidHexColor("#FFFFFF")).toBe(true);
    expect(isValidHexColor("#8c8c8c")).toBe(true);
  });
  it("# 없음/길이 틀림/잘못된 문자는 거부", () => {
    expect(isValidHexColor("FFFFFF")).toBe(false);
    expect(isValidHexColor("#FFF")).toBe(false);
    expect(isValidHexColor("#GGGGGG")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
    expect(isValidHexColor(null)).toBe(false);
    expect(isValidHexColor(undefined)).toBe(false);
    expect(isValidHexColor(123)).toBe(false);
  });
});

describe("relativeLuma / isTooDarkForBlackBackground", () => {
  it("흰색은 밝기 255", () => {
    expect(relativeLuma("#FFFFFF")).toBeCloseTo(255, 0);
  });
  it("검정은 밝기 0", () => {
    expect(relativeLuma("#000000")).toBe(0);
  });
  it(`임계값(${DARK_LUMA_THRESHOLD}) 미만이면 너무 어두운 것으로 판정`, () => {
    expect(isTooDarkForBlackBackground("#101010")).toBe(true);
    expect(isTooDarkForBlackBackground("#202020")).toBe(true);
  });
  it("중간 밝기 이상은 통과", () => {
    expect(isTooDarkForBlackBackground("#808080")).toBe(false);
  });
  it("6개 색상 프리셋은 전부 어두운색 판정을 통과한다", () => {
    for (const hex of Object.values(COLOR_PRESETS)) {
      expect(isTooDarkForBlackBackground(hex)).toBe(false);
    }
  });
});

describe("validateClusterColor", () => {
  it("형식이 잘못됐거나 없으면 기본값으로 조용히 폴백(ok:true)", () => {
    expect(validateClusterColor(undefined, "#EBEBEB")).toEqual({ ok: true, value: "#EBEBEB" });
    expect(validateClusterColor("not-a-color", "#EBEBEB")).toEqual({ ok: true, value: "#EBEBEB" });
    expect(validateClusterColor(null, "#EBEBEB")).toEqual({ ok: true, value: "#EBEBEB" });
  });
  it("형식은 맞지만 너무 어두우면 저장을 차단(ok:false)", () => {
    const result = validateClusterColor("#0A0A0A", "#EBEBEB");
    expect(result).toEqual({ ok: false, reason: "too_dark" });
  });
  it("형식이 맞고 충분히 밝으면 입력값을 그대로 사용", () => {
    expect(validateClusterColor("#F5D76E", "#EBEBEB")).toEqual({ ok: true, value: "#F5D76E" });
  });
});

describe("clampFontSize", () => {
  it("숫자가 아니거나 없으면 fallback", () => {
    expect(clampFontSize(undefined, 16)).toBe(16);
    expect(clampFontSize(NaN, 16)).toBe(16);
    expect(clampFontSize("abc", 16)).toBe(16);
  });
  it(`${FONT_SIZE_MIN} 미만은 ${FONT_SIZE_MIN}으로 클램프`, () => {
    expect(clampFontSize(4, 16)).toBe(FONT_SIZE_MIN);
  });
  it(`${FONT_SIZE_MAX} 초과는 ${FONT_SIZE_MAX}로 클램프`, () => {
    expect(clampFontSize(100, 16)).toBe(FONT_SIZE_MAX);
  });
  it("범위 안이면 반올림해서 그대로 사용", () => {
    expect(clampFontSize(22.4, 16)).toBe(22);
    expect(clampFontSize(FONT_SIZE_PRESETS.LARGE, 16)).toBe(FONT_SIZE_PRESETS.LARGE);
  });
});
