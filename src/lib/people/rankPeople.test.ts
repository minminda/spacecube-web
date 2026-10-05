import { describe, expect, it } from "vitest";
import { feelOverlap, rankPeople, type PersonCandidate } from "./rankPeople";

const features = new Map<string, string[]>([
  ["booknook", ["독립서점"]],
  ["dasijeom", ["복합문화공간"]],
  ["inner", ["복합문화공간"]],
  ["turndown", ["LP카페"]],
  ["aka", ["카페"]],
  ["nokhwa", ["촬영장비"]],
]);

const person = (userId: string, spaces: [string, boolean][]): PersonCandidate => ({
  userId, handle: userId, spaces: spaces.map(([slug, visited]) => ({ slug, visited })),
});

const viewerA = { visited: new Set(["booknook", "dasijeom", "inner"]), saved: new Set<string>() };

describe("rankPeople", () => {
  it("같은 공간을 다녀온 사람이 위, 전혀 다른 사람이 아래", () => {
    const ranked = rankPeople(viewerA, [
      person("different", [["aka", true], ["nokhwa", true], ["turndown", false]]),
      person("similar", [["booknook", true], ["dasijeom", true], ["turndown", true]]),
      person("partial", [["inner", false], ["aka", true]]),
    ], features);
    expect(ranked.map((r) => r.userId)).toEqual(["similar", "partial", "different"]);
    expect(ranked[0].reason).toBe("visited");
    expect(ranked[2].reason).toBeNull();
  });

  it("다녀온 곳은 안 겹쳐도 같은 공간이 둘 이상이면 '여러 곳 겹쳐요'", () => {
    const [r] = rankPeople(viewerA, [person("b", [["booknook", false], ["inner", false]])], features);
    expect(r.reason).toBe("shared");
  });

  it("같은 공간이 없어도 결(유형)이 같으면 '결이 비슷해요'", () => {
    const viewer = { visited: new Set(["dasijeom"]), saved: new Set<string>() };
    const [r] = rankPeople(viewer, [person("c", [["inner", true]])], features);
    expect(r.reason).toBe("feel");
  });

  it("같은 사람은 한 번만, 공개 공간이 없는 사람은 빠진다", () => {
    const ranked = rankPeople(viewerA, [
      person("dup", [["booknook", true]]),
      person("dup", [["booknook", true]]),
      person("empty", []),
    ], features);
    expect(ranked.map((r) => r.userId)).toEqual(["dup"]);
  });

  it("취향 기록이 없으면(비로그인) 공개 공간이 많은 사람부터, 이유 없음", () => {
    const ranked = rankPeople(null, [
      person("few", [["aka", true]]),
      person("many", [["aka", true], ["nokhwa", true], ["turndown", false]]),
    ], features);
    expect(ranked.map((r) => r.userId)).toEqual(["many", "few"]);
    expect(ranked.every((r) => r.reason === null)).toBe(true);
  });

  it("결 겹침은 0~1, 한쪽이 비면 0", () => {
    expect(feelOverlap(new Map([["a", 2]]), new Map([["a", 1], ["b", 1]]))).toBe(0.5);
    expect(feelOverlap(new Map(), new Map([["a", 1]]))).toBe(0);
  });
});
