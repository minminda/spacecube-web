import { describe, it, expect } from "vitest";
import { canChangeNickname, nextNicknameChangeAt, NICKNAME_COOLDOWN_DAYS } from "./nickname";

describe("nextNicknameChangeAt / canChangeNickname", () => {
  const NOW = new Date("2026-08-13T00:00:00Z");

  it("한 번도 변경한 적 없으면(null) 즉시 변경 가능", () => {
    expect(nextNicknameChangeAt(null)).toBeNull();
    expect(canChangeNickname(null, NOW)).toBe(true);
  });

  it("30일 이내 변경은 차단된다", () => {
    const changedYesterday = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    expect(canChangeNickname(changedYesterday, NOW)).toBe(false);
  });

  it("정확히 30일이 지나면 변경 가능(경계 포함)", () => {
    const changed30DaysAgo = new Date(NOW.getTime() - NICKNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    expect(canChangeNickname(changed30DaysAgo, NOW)).toBe(true);
  });

  it("29일 23시간 59분 전이면 아직 차단", () => {
    const almost30 = new Date(NOW.getTime() - (NICKNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - 60 * 1000));
    expect(canChangeNickname(almost30, NOW)).toBe(false);
  });

  it("31일 전이면 변경 가능", () => {
    const changed31DaysAgo = new Date(NOW.getTime() - 31 * 24 * 60 * 60 * 1000);
    expect(canChangeNickname(changed31DaysAgo, NOW)).toBe(true);
  });
});
