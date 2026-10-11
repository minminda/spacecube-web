import { describe, expect, it } from "vitest";
import { adviseTags, missingSpaceInfo } from "./spaceQuality";

const full = { area: "연남", category: "서점", summary: "한 줄", mapUrl: "https://naver.me/x", description: "소개", tags: ["책", "혼자", "조용한"] };

describe("missingSpaceInfo", () => {
  it("모두 채워지면 비어 있다", () => expect(missingSpaceInfo(full)).toEqual([]));
  it("비어 있는 항목을 이름으로 알려 준다(공백만 있어도 빈 값)", () => {
    expect(missingSpaceInfo({ ...full, mapUrl: "  ", tags: [], description: "" })).toEqual(["지도 링크", "태그", "공간 소개(선정 이유)"]);
  });
});

describe("adviseTags", () => {
  const allowed = ["책", "혼자", "조용한", "LP"];
  it("3~5개이고 모두 기존 태그면 안내 없음", () => expect(adviseTags(["책", "혼자", "LP"], allowed)).toEqual({ count: null, unknown: [], variants: [], duplicates: [] }));
  it("개수 · 새 태그 · 표기 차이 · 중복", () => {
    const a = adviseTags(["lp", "조용함", "책", "책"], allowed);
    expect(a.unknown).toEqual(["조용함"]);
    expect(a.variants).toEqual([["lp", "LP"]]);
    expect(a.duplicates).toEqual(["책"]);
    expect(adviseTags(["책"], allowed).count).toBe("few");
    expect(adviseTags(["책", "혼자", "LP", "조용한", "a", "b"], allowed).count).toBe("many");
  });
});
