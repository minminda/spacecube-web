import { describe, expect, it } from "vitest";
import { recommendRedirectTarget } from "./recommendRedirect";
import { cardReason } from "./spaceFinder";

describe("recommendRedirectTarget — 예전 /recommend 링크", () => {
  const on = { editorial: true, loggedIn: false };
  it("지역을 유지해 /find로", () => {
    expect(recommendRedirectTarget(on, { area: "망원" })).toBe(`/find?area=${encodeURIComponent("망원")}`);
  });
  it("예전 pa 파라미터와 동 이름도 같은 지역으로", () => {
    expect(recommendRedirectTarget(on, { pa: "연남동" })).toBe(`/find?area=${encodeURIComponent("연남")}`);
  });
  it("지역이 없거나 비어 있으면 /find", () => {
    expect(recommendRedirectTarget(on, {})).toBe("/find");
    expect(recommendRedirectTarget(on, { area: "  " })).toBe("/find");
  });
  it("새 정보구조를 볼 수 없으면 기존 화면으로", () => {
    expect(recommendRedirectTarget({ editorial: false, loggedIn: true }, { area: "망원" })).toBe("/archive/taste");
    expect(recommendRedirectTarget({ editorial: false, loggedIn: false }, { area: "망원" })).toBe("/");
  });
});

describe("cardReason — 추천 카드 이유 한 줄", () => {
  const base = { visited: false, personalized: true, matched: [] as string[], curationTitle: null, collection: null };
  it("다녀온 공간이 가장 먼저", () => {
    expect(cardReason({ ...base, visited: true, matched: ["카페"], curationTitle: "x" })).toBe("다녀온 공간");
  });
  it("취향이 겹치면 한 문장(태그 나열 없음)", () => {
    const r = cardReason({ ...base, matched: ["카페", "조용한"] });
    expect(r).toBeTruthy();
    expect(r).not.toContain("카페");
  });
  it("개인화가 아니면 취향 문장을 쓰지 않고 큐레이션 → 컬렉션 순", () => {
    expect(cardReason({ ...base, personalized: false, matched: ["카페"], curationTitle: "혼자 머무는 연남" })).toBe("큐레이션 ‘혼자 머무는 연남’");
    expect(cardReason({ ...base, personalized: false, collection: { curator: "민지", title: "비 오는 날" } })).toBe("민지의 ‘비 오는 날’");
  });
  it("근거가 없으면 null", () => {
    expect(cardReason(base)).toBeNull();
  });

  it("카테고리도 함께 넘긴다", () => {
    expect(recommendRedirectTarget({ editorial: true, loggedIn: false }, { area: "망원동", category: "카페" })).toBe(`/find?area=${encodeURIComponent("망원")}&category=${encodeURIComponent("카페")}`);
  });
});
