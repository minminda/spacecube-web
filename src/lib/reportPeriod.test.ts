import { describe, it, expect } from "vitest";
import { computeReportPeriod, getPeriodBounds, getCurrentPeriodOffset } from "./reportPeriod";

describe("reportPeriod", () => {
  it("매월 1일 시작 — 첫 구간은 7/1~8/1", () => {
    const start = new Date("2026-07-01T00:00:00.000Z");
    const now = new Date("2026-07-15T00:00:00.000Z");
    const period = computeReportPeriod(start, now);
    expect(period.currentOffset).toBe(0);
    expect(period.currentPeriodStart.toISOString()).toBe("2026-06-30T15:00:00.000Z"); // KST 7/1 00:00
    expect(period.currentPeriodEnd.toISOString()).toBe("2026-07-31T15:00:00.000Z"); // KST 8/1 00:00
    expect(period.nextReportDate.getTime()).toBe(period.currentPeriodEnd.getTime());
  });

  it("매월 15일 시작 — 두 번째 구간은 2/15~3/15", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const bounds = getPeriodBounds(start, 1);
    expect(bounds.start.toISOString()).toBe("2026-02-14T15:00:00.000Z"); // KST 2/15 00:00
    expect(bounds.end.toISOString()).toBe("2026-03-14T15:00:00.000Z"); // KST 3/15 00:00
  });

  it("월말 시작일(1/31) — 2월은 28일로 클램프되고, 날짜가 있는 달엔 31일로 복귀", () => {
    const start = new Date("2026-01-31T00:00:00.000Z");
    const period0 = getPeriodBounds(start, 0); // 1/31 ~ 2/28
    const period1 = getPeriodBounds(start, 1); // 2/28 ~ 3/31
    const period2 = getPeriodBounds(start, 2); // 3/31 ~ 4/30

    expect(period0.end.toISOString()).toBe("2026-02-27T15:00:00.000Z"); // KST 2/28 00:00
    expect(period1.start.getTime()).toBe(period0.end.getTime()); // 구간이 끊기지 않고 이어짐
    expect(period1.end.toISOString()).toBe("2026-03-30T15:00:00.000Z"); // KST 3/31 00:00 — 31일로 복귀
    expect(period2.end.toISOString()).toBe("2026-04-29T15:00:00.000Z"); // KST 4/30 00:00 — 30일로 클램프
  });

  it("윤년 — 2028년 2월은 29일로 클램프", () => {
    const start = new Date("2028-01-31T00:00:00.000Z");
    const period0 = getPeriodBounds(start, 0);
    expect(period0.end.toISOString()).toBe("2028-02-28T15:00:00.000Z"); // KST 2/29 00:00
  });

  it("Asia/Seoul 날짜 경계 — 구간 끝 시각 정확히는 다음 구간으로 넘어간다(exclusive)", () => {
    const start = new Date("2026-07-01T00:00:00.000Z");
    const boundary = getPeriodBounds(start, 0).end;

    const justBefore = new Date(boundary.getTime() - 1);
    expect(getCurrentPeriodOffset(start, justBefore)).toBe(0);

    expect(getCurrentPeriodOffset(start, boundary)).toBe(1);
  });
});
