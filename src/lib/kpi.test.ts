import { describe, it, expect } from "vitest";
import { computePeriodStats } from "./kpi";
import { isNewVisit } from "./visit";

const PERIOD_START = new Date("2026-07-01T00:00:00.000Z");
const PERIOD_END = new Date("2026-08-01T00:00:00.000Z");

describe("computePeriodStats", () => {
  it("QR 이용자 0명 — 모든 비율이 0/null로, 에러 없이 처리된다", () => {
    const stats = computePeriodStats([], [], PERIOD_START, PERIOD_END);
    expect(stats.qrUsers).toBe(0);
    expect(stats.returningUsers).toBe(0);
    expect(stats.revisitRate).toBe(0);
    expect(stats.guestbookWriters).toBe(0);
    expect(stats.guestbookRate).toBe(0);
    expect(stats.averageTasteScore).toBeNull();
  });

  it("12시간 이내 중복 방문은 isNewVisit이 애초에 새 Record를 만들지 않게 막는다(전제 조건 확인)", () => {
    const last = new Date("2026-07-10T00:00:00.000Z");
    const elevenHoursLater = new Date(last.getTime() + 11 * 60 * 60 * 1000);
    expect(isNewVisit(last, elevenHoursLater)).toBe(false);

    // 그 결과 같은 사용자의 방문 1건만 존재 — 재방문으로 집계되지 않는다.
    const stats = computePeriodStats(
      [{ userId: "u1", visitedAt: last, tasteScore: null }],
      [],
      PERIOD_START,
      PERIOD_END,
    );
    expect(stats.qrUsers).toBe(1);
    expect(stats.returningUsers).toBe(0);
  });

  it("12시간 이후 재방문은 재방문자로 집계된다", () => {
    const first = new Date("2026-07-05T00:00:00.000Z");
    const thirteenHoursLater = new Date(first.getTime() + 13 * 60 * 60 * 1000);
    expect(isNewVisit(first, thirteenHoursLater)).toBe(true);

    const stats = computePeriodStats(
      [
        { userId: "u1", visitedAt: first, tasteScore: null },
        { userId: "u1", visitedAt: thirteenHoursLater, tasteScore: null },
      ],
      [],
      PERIOD_START,
      PERIOD_END,
    );
    expect(stats.qrUsers).toBe(1);
    expect(stats.returningUsers).toBe(1);
    expect(stats.revisitRate).toBe(1);
  });

  it("방명록 작성률 — 분모(QR 이용자) 0일 때 0으로 처리(에러 없음)", () => {
    const stats = computePeriodStats(
      [],
      [{ userId: "u1", createdAt: new Date("2026-07-10T00:00:00.000Z") }],
      PERIOD_START,
      PERIOD_END,
    );
    expect(stats.guestbookRate).toBe(0);
    expect(stats.guestbookWriters).toBe(1);
    expect(stats.guestbookPosts).toBe(1);
  });

  it("방명록 작성률 — 정상 케이스", () => {
    const stats = computePeriodStats(
      [
        { userId: "u1", visitedAt: new Date("2026-07-02T00:00:00.000Z"), tasteScore: null },
        { userId: "u2", visitedAt: new Date("2026-07-03T00:00:00.000Z"), tasteScore: null },
      ],
      [{ userId: "u1", createdAt: new Date("2026-07-04T00:00:00.000Z") }],
      PERIOD_START,
      PERIOD_END,
    );
    expect(stats.qrUsers).toBe(2);
    expect(stats.guestbookWriters).toBe(1);
    expect(stats.guestbookRate).toBe(0.5);
  });

  it("평균 취향 적합도 — null은 제외하고 평균낸다", () => {
    const stats = computePeriodStats(
      [
        { userId: "u1", visitedAt: new Date("2026-07-02T00:00:00.000Z"), tasteScore: 5 },
        { userId: "u2", visitedAt: new Date("2026-07-03T00:00:00.000Z"), tasteScore: 3 },
        { userId: "u3", visitedAt: new Date("2026-07-04T00:00:00.000Z"), tasteScore: null },
      ],
      [],
      PERIOD_START,
      PERIOD_END,
    );
    expect(stats.averageTasteScore).toBe(4);
  });

  it("기간 밖의 기록은 집계에서 제외된다", () => {
    const stats = computePeriodStats(
      [{ userId: "u1", visitedAt: new Date("2026-08-05T00:00:00.000Z"), tasteScore: 5 }],
      [],
      PERIOD_START,
      PERIOD_END,
    );
    expect(stats.qrUsers).toBe(0);
  });
});
