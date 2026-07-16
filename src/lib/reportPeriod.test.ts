import { describe, it, expect } from "vitest";
import {
  computeReportPeriod,
  getPeriodBounds,
  getCurrentPeriodOffset,
  computeReportStartDateForPreset,
  inferReportDayPreset,
  resolvePreviewPeriods,
} from "./reportPeriod";

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

describe("computeReportStartDateForPreset", () => {
  it("1일 프리셋 — 이번 달(KST) 1일 00:00", () => {
    const now = new Date("2026-07-15T03:00:00.000Z"); // KST 7/15 12:00
    const d = computeReportStartDateForPreset(1, now);
    expect(d.toISOString()).toBe("2026-06-30T15:00:00.000Z"); // KST 7/1 00:00
  });

  it("15일 프리셋 — 이번 달(KST) 15일 00:00", () => {
    const now = new Date("2026-07-15T03:00:00.000Z");
    const d = computeReportStartDateForPreset(15, now);
    expect(d.toISOString()).toBe("2026-07-14T15:00:00.000Z"); // KST 7/15 00:00
  });

  it('"last" 프리셋 — 그 달의 실제 마지막 날(2월은 28/29일로 클램프)', () => {
    const now = new Date("2026-02-10T03:00:00.000Z"); // KST 2월
    const d = computeReportStartDateForPreset("last", now);
    expect(d.toISOString()).toBe("2026-02-27T15:00:00.000Z"); // KST 2/28 00:00(2026은 평년)
  });
});

describe("inferReportDayPreset", () => {
  it("1일이면 1", () => {
    expect(inferReportDayPreset(new Date("2026-06-30T15:00:00.000Z"))).toBe(1); // KST 7/1
  });
  it("15일이면 15", () => {
    expect(inferReportDayPreset(new Date("2026-07-14T15:00:00.000Z"))).toBe(15); // KST 7/15
  });
  it("그 달의 마지막 날이면 last", () => {
    expect(inferReportDayPreset(new Date("2026-02-27T15:00:00.000Z"))).toBe("last"); // KST 2/28(평년 마지막 날)
  });
});

describe("resolvePreviewPeriods", () => {
  it("reportStartDate가 없으면 KST 달력 기준 이번 달/지난달로 대체한다", () => {
    const now = new Date("2026-07-15T03:00:00.000Z"); // KST 7/15
    const { current, previous } = resolvePreviewPeriods(null, now);
    expect(current.start.toISOString()).toBe("2026-06-30T15:00:00.000Z"); // KST 7/1
    expect(current.end.getTime()).toBe(now.getTime());
    expect(previous?.start.toISOString()).toBe("2026-05-31T15:00:00.000Z"); // KST 6/1
    expect(previous?.end.getTime()).toBe(current.start.getTime());
  });

  it("reportStartDate가 미래(아직 시작 전)이면 달력 기준으로 대체한다", () => {
    const now = new Date("2026-07-15T03:00:00.000Z");
    const future = new Date("2026-08-01T00:00:00.000Z");
    const { current } = resolvePreviewPeriods(future, now);
    expect(current.start.toISOString()).toBe("2026-06-30T15:00:00.000Z"); // KST 7/1 — 달력 기준
  });

  it("reportStartDate가 있고 이미 시작됐으면 그 구간을 그대로 쓰고, 첫 구간이면 이전 구간은 null", () => {
    const start = new Date("2026-06-30T15:00:00.000Z"); // KST 7/1 00:00(정규화된 형태로 직접 지정)
    const now = new Date("2026-07-15T03:00:00.000Z");
    const { current, previous } = resolvePreviewPeriods(start, now);
    expect(current.start.getTime()).toBe(start.getTime());
    expect(previous).toBeNull();
  });

  it("두 번째 구간이면 이전 구간이 채워진다", () => {
    const start = new Date("2026-06-01T00:00:00.000Z"); // KST 6/1
    const now = new Date("2026-07-15T03:00:00.000Z"); // 두 번째 구간(7/1~) 안
    const { current, previous } = resolvePreviewPeriods(start, now);
    expect(current.start.toISOString()).toBe("2026-06-30T15:00:00.000Z"); // KST 7/1
    expect(previous?.start.toISOString()).toBe("2026-05-31T15:00:00.000Z"); // KST 6/1
    expect(previous?.end.getTime()).toBe(current.start.getTime());
  });
});
