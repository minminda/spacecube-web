import { describe, it, expect } from "vitest";
import {
  formatKstDateParam,
  parseKstDateStart,
  toDotFormat,
  presetDateRange,
  detectActivePreset,
  resolveDateRange,
  buildDailyVisitTrend,
} from "./reportDateRange";

describe("formatKstDateParam / parseKstDateStart", () => {
  it("KST 자정을 그 날짜 문자열로 되돌린다(왕복)", () => {
    const iso = "2026-08-17";
    const parsed = parseKstDateStart(iso);
    expect(parsed).not.toBeNull();
    expect(formatKstDateParam(parsed as Date)).toBe(iso);
  });

  it("UTC 자정(=KST 09:00)도 KST 기준으로는 같은 날짜로 포맷된다 — 날짜가 하루 밀리지 않는다", () => {
    // 2026-08-17T00:00:00Z는 KST로 2026-08-17 09:00 — 같은 날짜여야 한다.
    expect(formatKstDateParam(new Date("2026-08-17T00:00:00.000Z"))).toBe("2026-08-17");
    // 2026-08-16T16:00:00Z는 KST로 2026-08-17 01:00 — UTC 기준 날짜(8/16)와 달라야 한다.
    expect(formatKstDateParam(new Date("2026-08-16T16:00:00.000Z"))).toBe("2026-08-17");
  });

  it("형식이 잘못된 문자열은 null", () => {
    expect(parseKstDateStart("2026/08/17")).toBeNull();
    expect(parseKstDateStart("not-a-date")).toBeNull();
    expect(parseKstDateStart("")).toBeNull();
    expect(parseKstDateStart(undefined)).toBeNull();
  });

  it("실존하지 않는 날짜(2/30, 13월)는 null", () => {
    expect(parseKstDateStart("2026-02-30")).toBeNull();
    expect(parseKstDateStart("2026-13-01")).toBeNull();
  });

  it("윤년 2/29는 유효하고, 평년 2/29는 무효", () => {
    expect(parseKstDateStart("2028-02-29")).not.toBeNull(); // 2028은 윤년
    expect(parseKstDateStart("2026-02-29")).toBeNull(); // 2026은 평년
  });
});

describe("toDotFormat", () => {
  it("YYYY-MM-DD를 YYYY.MM.DD로 바꾼다(Date 객체를 거치지 않아 타임존 영향이 없다)", () => {
    expect(toDotFormat("2026-08-17")).toBe("2026.08.17");
  });
});

describe("presetDateRange", () => {
  const allTimeStart = parseKstDateStart("2026-01-10") as Date;

  it("오늘 — from/to가 동일한 오늘 날짜", () => {
    const now = new Date("2026-08-17T05:00:00.000Z"); // KST 14:00
    const range = presetDateRange("today", now, allTimeStart);
    expect(range).toEqual({ from: "2026-08-17", to: "2026-08-17" });
  });

  it("최근 7일 — 오늘 포함 7일(오늘-6 ~ 오늘)", () => {
    const now = new Date("2026-08-17T05:00:00.000Z");
    const range = presetDateRange("7d", now, allTimeStart);
    expect(range).toEqual({ from: "2026-08-11", to: "2026-08-17" });
  });

  it("최근 30일 — 오늘 포함 30일(오늘-29 ~ 오늘)", () => {
    const now = new Date("2026-08-17T05:00:00.000Z");
    const range = presetDateRange("30d", now, allTimeStart);
    expect(range).toEqual({ from: "2026-07-19", to: "2026-08-17" });
  });

  it("전체 — 공간의 데이터 시작일부터 오늘까지", () => {
    const now = new Date("2026-08-17T05:00:00.000Z");
    const range = presetDateRange("all", now, allTimeStart);
    expect(range).toEqual({ from: "2026-01-10", to: "2026-08-17" });
  });

  it("연도 경계 — 최근 7일이 작년 12월에서 올해 1월로 걸쳐도 정상 계산된다", () => {
    const now = new Date("2026-01-02T05:00:00.000Z"); // KST 2026-01-02
    const range = presetDateRange("7d", now, allTimeStart);
    expect(range).toEqual({ from: "2025-12-27", to: "2026-01-02" });
  });

  it("월 경계 — 최근 7일이 8월에서 9월로 걸쳐도 정상 계산된다", () => {
    const now = new Date("2026-09-02T05:00:00.000Z");
    const range = presetDateRange("7d", now, allTimeStart);
    expect(range).toEqual({ from: "2026-08-27", to: "2026-09-02" });
  });

  it("Asia/Seoul 날짜 경계 — UTC로는 전날이어도 KST로는 오늘인 시각도 정확히 오늘로 계산된다", () => {
    // UTC 2026-01-01T15:30:00Z = KST 2026-01-02T00:30 — KST 기준 "오늘"은 1/2여야 한다.
    const now = new Date("2026-01-01T15:30:00.000Z");
    const range = presetDateRange("today", now, allTimeStart);
    expect(range.from).toBe("2026-01-02");
  });
});

describe("detectActivePreset", () => {
  const now = new Date("2026-08-17T05:00:00.000Z");
  const allTimeStart = parseKstDateStart("2026-01-10") as Date;

  it("현재 범위가 프리셋과 일치하면 그 프리셋을 반환한다", () => {
    expect(detectActivePreset("2026-08-17", "2026-08-17", now, allTimeStart)).toBe("today");
    expect(detectActivePreset("2026-07-19", "2026-08-17", now, allTimeStart)).toBe("30d");
    expect(detectActivePreset("2026-01-10", "2026-08-17", now, allTimeStart)).toBe("all");
  });

  it("직접 지정한 범위는 null", () => {
    expect(detectActivePreset("2026-08-01", "2026-08-05", now, allTimeStart)).toBeNull();
  });
});

describe("resolveDateRange", () => {
  const now = new Date("2026-08-17T05:00:00.000Z"); // KST 2026-08-17
  const allTimeStart = parseKstDateStart("2026-01-10") as Date;

  it("파라미터가 둘 다 없으면 최근 30일을 기본값으로 쓴다(정상적인 최초 진입, fallback 아님)", () => {
    const range = resolveDateRange(undefined, undefined, allTimeStart, now);
    expect(range).toMatchObject({ from: "2026-07-19", to: "2026-08-17", usedFallback: false });
  });

  it("사용자 지정 기간 — 유효한 from/to는 그대로 [start, end) 반개방 구간이 된다", () => {
    const range = resolveDateRange("2026-08-01", "2026-08-05", allTimeStart, now);
    expect(range.from).toBe("2026-08-01");
    expect(range.to).toBe("2026-08-05");
    expect(range.usedFallback).toBe(false);
    expect(range.start.getTime()).toBe((parseKstDateStart("2026-08-01") as Date).getTime());
    // end는 "종료일 다음날 KST 00:00" — 8/5 23:59:59.999가 아니라 8/6 00:00(배타)
    expect(range.end.getTime()).toBe((parseKstDateStart("2026-08-06") as Date).getTime());
  });

  it("start > end면 최근 30일로 폴백한다", () => {
    const range = resolveDateRange("2026-08-10", "2026-08-01", allTimeStart, now);
    expect(range.usedFallback).toBe(true);
    expect(range.from).toBe("2026-07-19");
    expect(range.to).toBe("2026-08-17");
  });

  it("잘못된 날짜 문자열(형식 오류)이면 최근 30일로 폴백한다 — 화면이 깨지지 않는다", () => {
    const range = resolveDateRange("not-a-date", "2026-08-17", allTimeStart, now);
    expect(range.usedFallback).toBe(true);
    expect(range.from).toBe("2026-07-19");
  });

  it("존재하지 않는 날짜(2/30)도 폴백한다", () => {
    const range = resolveDateRange("2026-02-30", "2026-08-17", allTimeStart, now);
    expect(range.usedFallback).toBe(true);
  });

  it("한 날짜만 선택하면(from만) 그 하루짜리 구간으로 해석한다", () => {
    const range = resolveDateRange("2026-08-05", undefined, allTimeStart, now);
    expect(range.from).toBe("2026-08-05");
    expect(range.to).toBe("2026-08-05");
    expect(range.usedFallback).toBe(false);
  });

  it("한 날짜만 선택하면(to만) 그 하루짜리 구간으로 해석한다", () => {
    const range = resolveDateRange(undefined, "2026-08-05", allTimeStart, now);
    expect(range.from).toBe("2026-08-05");
    expect(range.to).toBe("2026-08-05");
  });

  it("지나치게 먼 미래 날짜도 파싱만 되면 에러 없이 그대로 반영된다(데이터가 없을 뿐)", () => {
    const range = resolveDateRange("2026-08-01", "9999-12-31", allTimeStart, now);
    expect(range.usedFallback).toBe(false);
    expect(range.to).toBe("9999-12-31");
  });
});

describe("buildDailyVisitTrend", () => {
  it("방문 기록이 없는 기간도 0건으로 채워 정상 반환한다(에러 없음)", () => {
    const start = parseKstDateStart("2026-08-01") as Date;
    const end = parseKstDateStart("2026-08-04") as Date; // [8/1, 8/4) = 3일
    const trend = buildDailyVisitTrend([], start, end);
    expect(trend).toEqual([
      { date: "2026-08-01", count: 0 },
      { date: "2026-08-02", count: 0 },
      { date: "2026-08-03", count: 0 },
    ]);
  });

  it("방문을 KST 달력일 기준으로 정확히 집계한다", () => {
    const start = parseKstDateStart("2026-08-01") as Date;
    const end = parseKstDateStart("2026-08-04") as Date;
    const visits = [
      new Date("2026-08-01T10:00:00.000Z"), // KST 8/1 19:00
      new Date("2026-08-01T20:00:00.000Z"), // KST 8/2 05:00
      new Date("2026-08-02T10:00:00.000Z"), // KST 8/2 19:00
    ];
    const trend = buildDailyVisitTrend(visits, start, end);
    expect(trend).toEqual([
      { date: "2026-08-01", count: 1 },
      { date: "2026-08-02", count: 2 },
      { date: "2026-08-03", count: 0 },
    ]);
  });

  it("구간 밖의 방문은 집계하지 않는다", () => {
    const start = parseKstDateStart("2026-08-01") as Date;
    const end = parseKstDateStart("2026-08-02") as Date; // [8/1, 8/2) = 1일
    const visits = [new Date("2026-08-05T00:00:00.000Z")];
    const trend = buildDailyVisitTrend(visits, start, end);
    expect(trend).toEqual([{ date: "2026-08-01", count: 0 }]);
  });

  it("62일을 초과하는 기간은 빈 배열(추이 생략 신호)을 반환한다", () => {
    const start = parseKstDateStart("2026-01-01") as Date;
    const end = parseKstDateStart("2026-06-01") as Date; // 150일 이상
    expect(buildDailyVisitTrend([], start, end)).toEqual([]);
  });
});
