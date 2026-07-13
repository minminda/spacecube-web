import { describe, it, expect } from "vitest";
import { canAccessSpace } from "./operatorAuth";

describe("canAccessSpace", () => {
  it("운영자 본인 공간 — 접근 허용", () => {
    expect(canAccessSpace("user-1", "user-1", false)).toBe(true);
  });

  it("다른 운영자의 공간 — 접근 차단", () => {
    expect(canAccessSpace("user-1", "user-2", false)).toBe(false);
  });

  it("일반 사용자(담당 공간 없음, ownerId=null) — 접근 차단", () => {
    expect(canAccessSpace("user-1", null, false)).toBe(false);
  });

  it("관리자 — 소유 여부와 무관하게 전체 접근 허용", () => {
    expect(canAccessSpace("admin-1", "user-2", true)).toBe(true);
    expect(canAccessSpace("admin-1", null, true)).toBe(true);
  });
});
