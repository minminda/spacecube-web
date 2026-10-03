import { describe, it, expect } from "vitest";
import {
  SAVE_WEIGHT, attrKey, buildTasteProfile, candidateAttributes, discoveryReason, isEmptyProfile,
  profileSummary, rankDiscovery, topAttributes,
} from "./discoveryRecommend";

const spaces = [
  { id: "a", name: "가 서점", category: "독립서점", tags: ["조용한", "책"] },
  { id: "b", name: "나 LP바", category: "LP카페", tags: ["음악", "조용한"] },
  { id: "c", name: "다 카페", category: "카페", tags: [] },
];

describe("buildTasteProfile", () => {
  it("방문 가중치와 저장(SAVE_WEIGHT)을 같은 이름으로 합친다", () => {
    const p = buildTasteProfile({ visits: [{ name: "조용한", weight: 4 }], visitCount: 1, saves: [["조용한", "LP카페"]] });
    expect(p.weights.get(attrKey("조용한"))).toBe(4 + SAVE_WEIGHT);
    expect(p.weights.get(attrKey("LP카페"))).toBe(SAVE_WEIGHT);
  });
  it("한 저장 공간 안의 중복 속성은 한 번만 센다", () => {
    const p = buildTasteProfile({ visits: [], visitCount: 0, saves: [["책", "책 "]] });
    expect(p.weights.get("책")).toBe(SAVE_WEIGHT);
  });
  it("신호가 없으면 빈 프로필", () => {
    expect(isEmptyProfile(buildTasteProfile({ visits: [], visitCount: 0, saves: [] }))).toBe(true);
  });
});

describe("rankDiscovery", () => {
  const profile = buildTasteProfile({ visits: [{ name: "조용한", weight: 5 }, { name: "음악", weight: 3 }], visitCount: 2, saves: [] });

  it("겹치는 속성 가중치 합으로 정렬하고 점수 0은 뺀다", () => {
    const r = rankDiscovery(spaces, profile);
    expect(r.map((x) => x.space.id)).toEqual(["b", "a"]);
    expect(r[0].matched).toEqual(["조용한", "음악"]);
  });
  it("제외 목록(방문·저장한 곳)을 거른다", () => {
    expect(rankDiscovery(spaces, profile, { exclude: new Set(["b"]) }).map((x) => x.space.id)).toEqual(["a"]);
  });
  it("limit", () => {
    expect(rankDiscovery(spaces, profile, { limit: 1 })).toHaveLength(1);
  });
});

describe("문구", () => {
  it("겹친 속성이 없으면 이유를 만들지 않는다", () => {
    expect(discoveryReason([])).toBeNull();
    expect(discoveryReason(["조용한", "음악", "책"])).toContain("조용한 · 음악");
  });
  it("요약은 실제 신호 출처를 말한다", () => {
    const visitsOnly = buildTasteProfile({ visits: [{ name: "조용한", weight: 1 }], visitCount: 1, saves: [] });
    expect(profileSummary(visitsOnly)).toContain("다녀온 공간에서");
    const savesOnly = buildTasteProfile({ visits: [], visitCount: 0, saves: [["책"]] });
    expect(profileSummary(savesOnly)).toContain("저장한 공간에서");
    expect(profileSummary(buildTasteProfile({ visits: [], visitCount: 0, saves: [] }))).toBeNull();
  });
  it("topAttributes / candidateAttributes", () => {
    const p = buildTasteProfile({ visits: [{ name: "음악", weight: 1 }, { name: "조용한", weight: 3 }], visitCount: 1, saves: [] });
    expect(topAttributes(p, 1)).toEqual(["조용한"]);
    expect(candidateAttributes({ category: "카페", tags: ["카페", "조용한"] })).toEqual(["카페", "조용한"]);
  });
});
