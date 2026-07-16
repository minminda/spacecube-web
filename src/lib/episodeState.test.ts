import { describe, it, expect } from "vitest";
import { computeEpisodeState } from "./episodeState";

describe("computeEpisodeState", () => {
  it("unlockVisitCount가 visitCount보다 크면 LOCKED", () => {
    expect(computeEpisodeState(3, 2)).toBe("LOCKED");
  });

  it("unlockVisitCount가 visitCount와 같으면 NEWLY_UNLOCKED(이번 방문으로 막 해제됨)", () => {
    expect(computeEpisodeState(2, 2)).toBe("NEWLY_UNLOCKED");
  });

  it("unlockVisitCount가 0이고 visitCount도 0이면(첫 방문, 항상 공개 Episode) NEWLY_UNLOCKED", () => {
    expect(computeEpisodeState(0, 0)).toBe("NEWLY_UNLOCKED");
  });

  it("unlockVisitCount가 visitCount보다 작으면 UNLOCKED(예전에 이미 해제됨)", () => {
    expect(computeEpisodeState(1, 3)).toBe("UNLOCKED");
  });
});
