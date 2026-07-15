import { describe, it, expect } from "vitest";
import { isNewVisit, resolveCurrentVisitRecord, REVISIT_INTERVAL_HOURS } from "./visit";

describe("resolveCurrentVisitRecord — 취향 점수 저장 상태 복원", () => {
  const NOW = new Date("2026-07-15T12:00:00Z");

  it("재방문 인정 간격 안에 저장된 Record가 있으면 그대로 반환한다(이번 방문의 점수)", () => {
    const oneHourAgo = new Date(NOW.getTime() - 60 * 60 * 1000);
    const record = { id: "r1", visitedAt: oneHourAgo, tasteScore: 4 };
    expect(resolveCurrentVisitRecord(record, NOW)).toEqual({ id: "r1", tasteScore: 4 });
  });

  it("재방문 인정 간격이 지난 Record는 이번 방문의 것으로 보지 않는다(null)", () => {
    const longAgo = new Date(NOW.getTime() - (REVISIT_INTERVAL_HOURS + 1) * 60 * 60 * 1000);
    const record = { id: "r1", visitedAt: longAgo, tasteScore: 5 };
    expect(resolveCurrentVisitRecord(record, NOW)).toBeNull();
  });

  it("lastRecord가 없으면(첫 방문) null을 반환한다", () => {
    expect(resolveCurrentVisitRecord(null, NOW)).toBeNull();
  });

  it("경계 시각(정확히 REVISIT_INTERVAL_HOURS 지남)은 새 방문으로 간주해 null", () => {
    const exactBoundary = new Date(NOW.getTime() - REVISIT_INTERVAL_HOURS * 60 * 60 * 1000);
    const record = { id: "r1", visitedAt: exactBoundary, tasteScore: 3 };
    expect(resolveCurrentVisitRecord(record, NOW)).toBeNull();
  });

  it("isNewVisit과 동일한 기준을 공유한다(/api/records의 create-vs-update 분기와 일치)", () => {
    const fiveHoursAgo = new Date(NOW.getTime() - 5 * 60 * 60 * 1000);
    const record = { id: "r1", visitedAt: fiveHoursAgo, tasteScore: 2 };
    expect(isNewVisit(record.visitedAt, NOW)).toBe(false);
    expect(resolveCurrentVisitRecord(record, NOW)).toEqual({ id: "r1", tasteScore: 2 });
  });

  it("tasteScore가 null이어도(저장 실패/레거시 데이터) id와 함께 그대로 반환한다", () => {
    const oneHourAgo = new Date(NOW.getTime() - 60 * 60 * 1000);
    const record = { id: "r1", visitedAt: oneHourAgo, tasteScore: null };
    expect(resolveCurrentVisitRecord(record, NOW)).toEqual({ id: "r1", tasteScore: null });
  });
});
