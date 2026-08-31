import { describe, it, expect } from "vitest";
import { countNewlyUnlockedEpisodes, buildTasteScoreDistribution, pairScansWithReads } from "./reportMetrics";

const PERIOD_START = new Date("2026-07-01T00:00:00.000Z");
const PERIOD_END = new Date("2026-08-01T00:00:00.000Z");

// countNewlyUnlockedEpisodes는 방문 순번을 1부터 센다(i번째 Record 생성 시점의 누적 방문 횟수와
// 동일 — episodeState.ts의 visitCount 정의와 맞춘 것). unlockVisitCount=0(항상 공개) Episode는
// 어떤 방문 순번과도 일치하지 않으므로 이 지표에서는 "새로 해제"로 잡히지 않는다 — 그 Episode는
// 애초에 방문 없이도 열려 있었기 때문에 의도된 동작이다.
describe("countNewlyUnlockedEpisodes", () => {
  it("방문 기록이 없으면 0", () => {
    expect(countNewlyUnlockedEpisodes([], [1, 2], PERIOD_START, PERIOD_END)).toBe(0);
  });

  it("사용자의 N번째 방문이 기간 안에 있고 Episode의 unlockVisitCount와 일치하면 센다", () => {
    const records = [
      { userId: "u1", visitedAt: new Date("2026-07-05T00:00:00.000Z") }, // 1번째 방문 → unlockVisitCount=1 해제
      { userId: "u1", visitedAt: new Date("2026-07-10T00:00:00.000Z") }, // 2번째 방문 → unlockVisitCount=2 해제
    ];
    expect(countNewlyUnlockedEpisodes(records, [1, 2], PERIOD_START, PERIOD_END)).toBe(2);
  });

  it("unlockVisitCount=0(항상 공개) Episode는 어떤 방문과도 매칭되지 않는다", () => {
    const records = [{ userId: "u1", visitedAt: new Date("2026-07-05T00:00:00.000Z") }];
    expect(countNewlyUnlockedEpisodes(records, [0], PERIOD_START, PERIOD_END)).toBe(0);
  });

  it("기간 밖의 방문은 세지 않는다", () => {
    const records = [{ userId: "u1", visitedAt: new Date("2026-06-01T00:00:00.000Z") }]; // 1번째 방문, 기간 밖
    expect(countNewlyUnlockedEpisodes(records, [1], PERIOD_START, PERIOD_END)).toBe(0);
  });

  it("같은 임계값을 공유하는 Episode가 여러 개면 그만큼 여러 번 센다", () => {
    const records = [{ userId: "u1", visitedAt: new Date("2026-07-05T00:00:00.000Z") }]; // 1번째 방문
    expect(countNewlyUnlockedEpisodes(records, [1, 1], PERIOD_START, PERIOD_END)).toBe(2);
  });

  it("사용자별로 방문 횟수를 독립적으로 센다", () => {
    const records = [
      { userId: "u1", visitedAt: new Date("2026-07-01T01:00:00.000Z") }, // u1 1번째
      { userId: "u2", visitedAt: new Date("2026-07-02T01:00:00.000Z") }, // u2 1번째
    ];
    expect(countNewlyUnlockedEpisodes(records, [1], PERIOD_START, PERIOD_END)).toBe(2);
  });

  it("방문 순서는 visitedAt 기준으로 정렬해서 센다(입력 순서와 무관)", () => {
    const records = [
      { userId: "u1", visitedAt: new Date("2026-07-10T00:00:00.000Z") }, // 나중 입력이지만 2번째 방문
      { userId: "u1", visitedAt: new Date("2026-07-05T00:00:00.000Z") }, // 먼저 입력이지만 1번째 방문
    ];
    // unlockVisitCount=2인 Episode만 있으면 2번째 방문(7/10)에서만 해제되어야 함
    expect(countNewlyUnlockedEpisodes(records, [2], PERIOD_START, PERIOD_END)).toBe(1);
  });
});

describe("buildTasteScoreDistribution", () => {
  it("점수 없는 기록은 제외하고 1~5점 전부 0으로 채워 반환한다", () => {
    const dist = buildTasteScoreDistribution([{ tasteScore: null }]);
    expect(dist).toEqual([
      { score: 1, count: 0 },
      { score: 2, count: 0 },
      { score: 3, count: 0 },
      { score: 4, count: 0 },
      { score: 5, count: 0 },
    ]);
  });

  it("점수별로 정확히 집계한다", () => {
    const dist = buildTasteScoreDistribution([
      { tasteScore: 5 },
      { tasteScore: 5 },
      { tasteScore: 3 },
      { tasteScore: null },
    ]);
    expect(dist.find((d) => d.score === 5)?.count).toBe(2);
    expect(dist.find((d) => d.score === 3)?.count).toBe(1);
    expect(dist.find((d) => d.score === 1)?.count).toBe(0);
  });
});

describe("pairScansWithReads", () => {
  it("같은 방문자(userId)의 스캔 직후 조회를 짝짓고, 방문 순 최근순으로 반환한다", () => {
    const scans = [
      { scannedAt: new Date("2026-08-31T09:00:00.000Z"), userId: "u1", anonId: null },
      { scannedAt: new Date("2026-08-31T09:10:00.000Z"), userId: "u2", anonId: null },
    ];
    const reads = [
      { openedAt: new Date("2026-08-31T09:00:01.000Z"), completedAt: new Date("2026-08-31T09:00:41.000Z"), durationMs: 40_000, userId: "u1", anonId: null },
      { openedAt: new Date("2026-08-31T09:10:01.000Z"), completedAt: null, durationMs: 8_000, userId: "u2", anonId: null },
    ];
    const result = pairScansWithReads(scans, reads);
    expect(result).toHaveLength(2);
    expect(result[0].scannedAt).toEqual(scans[1].scannedAt); // 최근 방문이 먼저
    expect(result[0].storyDurationMs).toBe(8_000);
    expect(result[0].storyCompleted).toBe(false);
    expect(result[1].storyDurationMs).toBe(40_000);
    expect(result[1].storyCompleted).toBe(true);
  });

  it("익명 방문자는 anonId로 짝짓는다(userId 없이도 매칭)", () => {
    const scans = [{ scannedAt: new Date("2026-08-31T09:00:00.000Z"), userId: null, anonId: "a1" }];
    const reads = [
      { openedAt: new Date("2026-08-31T09:00:02.000Z"), completedAt: null, durationMs: null, userId: null, anonId: "a1" },
    ];
    const result = pairScansWithReads(scans, reads);
    expect(result[0].storyOpenedAt).toEqual(reads[0].openedAt);
    expect(result[0].storyDurationMs).toBeNull();
  });

  it("매칭되는 조회가 없으면 storyOpenedAt이 null(스토리 미조회)", () => {
    const scans = [{ scannedAt: new Date("2026-08-31T09:00:00.000Z"), userId: "u1", anonId: null }];
    const result = pairScansWithReads(scans, []);
    expect(result[0].storyOpenedAt).toBeNull();
    expect(result[0].storyDurationMs).toBeNull();
    expect(result[0].storyCompleted).toBe(false);
  });

  it("같은 방문자가 짧은 시간 안에 재스캔하면 각 스캔에 서로 다른 조회를 한 번씩만 짝짓는다", () => {
    const scans = [
      { scannedAt: new Date("2026-08-31T09:00:00.000Z"), userId: "u1", anonId: null },
      { scannedAt: new Date("2026-08-31T09:05:00.000Z"), userId: "u1", anonId: null },
    ];
    const reads = [
      { openedAt: new Date("2026-08-31T09:00:01.000Z"), completedAt: null, durationMs: 10_000, userId: "u1", anonId: null },
      { openedAt: new Date("2026-08-31T09:05:01.000Z"), completedAt: null, durationMs: 20_000, userId: "u1", anonId: null },
    ];
    const result = pairScansWithReads(scans, reads);
    const first = result.find((r) => r.scannedAt.getTime() === scans[0].scannedAt.getTime());
    const second = result.find((r) => r.scannedAt.getTime() === scans[1].scannedAt.getTime());
    expect(first?.storyDurationMs).toBe(10_000);
    expect(second?.storyDurationMs).toBe(20_000);
  });

  it("스캔보다 앞선(다른 방문의) 조회는 짝짓지 않는다", () => {
    const scans = [{ scannedAt: new Date("2026-08-31T09:10:00.000Z"), userId: "u1", anonId: null }];
    const reads = [
      { openedAt: new Date("2026-08-31T09:00:00.000Z"), completedAt: null, durationMs: 5_000, userId: "u1", anonId: null },
    ];
    const result = pairScansWithReads(scans, reads);
    expect(result[0].storyOpenedAt).toBeNull();
  });
});
