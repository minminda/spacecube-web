import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./time";

const NOW = new Date("2026-07-13T12:00:00.000Z");

describe("formatRelativeTime", () => {
  it("1분 미만이면 방금 전", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 30 * 1000), NOW)).toBe("방금 전");
  });
  it("1시간 미만이면 N분 전", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 5 * 60 * 1000), NOW)).toBe("5분 전");
  });
  it("24시간 미만이면 N시간 전", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 3 * 60 * 60 * 1000), NOW)).toBe("3시간 전");
  });
  it("7일 미만이면 N일 전", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 24 * 60 * 60 * 1000), NOW)).toBe("1일 전");
  });
  it("7일 이상이면 절대 날짜(YYYY.MM.DD)", () => {
    expect(formatRelativeTime(new Date("2026-07-01T12:00:00.000Z"), NOW)).toBe("2026.07.01");
  });
});
