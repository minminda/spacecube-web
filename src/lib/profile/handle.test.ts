import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { randomHandle } from "./handle";
import { HANDLE_RE, canFollow, handleError } from "./publicProfile";

describe("자동 발급 프로필 주소", () => {
  it("항상 주소 규칙(영문 소문자 · 숫자, 3~24자)에 맞고 예약어가 아니다", () => {
    for (let i = 0; i < 200; i++) {
      const h = randomHandle();
      expect(HANDLE_RE.test(h)).toBe(true);
      expect(handleError(h)).toBeNull();
    }
  });

  it("매번 다르다", () => {
    expect(new Set(Array.from({ length: 50 }, randomHandle)).size).toBe(50);
  });
});

describe("비공개 프로필", () => {
  it("비공개면 새로 따라갈 수 없다(기존 관계는 지우지 않는다 — 삭제 코드 없음)", () => {
    expect(canFollow("a", { id: "b", profilePublic: false, isDemo: false }).ok).toBe(false);
    expect(canFollow("a", { id: "b", profilePublic: true, isDemo: false }).ok).toBe(true);
  });
});
