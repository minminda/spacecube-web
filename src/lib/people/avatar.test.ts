import { describe, expect, it } from "vitest";
import { avatarSpec, hashSeed } from "./avatar";

describe("avatarSpec", () => {
  it("같은 seed는 항상 같은 조합", () => {
    expect(avatarSpec("user-abc")).toEqual(avatarSpec("user-abc"));
    expect(hashSeed("user-abc")).toBe(hashSeed("user-abc"));
  });

  it("다른 사람들은 대부분 서로 다른 조합", () => {
    const keys = new Set(
      Array.from({ length: 40 }, (_, i) => {
        const a = avatarSpec(`cuid-${i}-x`);
        return `${a.palette.bg}|${a.head}|${a.body}|${a.mark}|${a.headAccent}|${a.shift}`;
      }),
    );
    expect(keys.size).toBeGreaterThan(30);
  });

  it("무채색 · 따뜻한 회색만 쓴다", () => {
    for (let i = 0; i < 50; i++) {
      const { bg, main, accent } = avatarSpec(String(i)).palette;
      for (const c of [bg, main, accent]) {
        const [r, g, b] = [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
        expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(24);
      }
    }
  });

  it("빈 seed도 안전하게", () => {
    expect(() => avatarSpec("")).not.toThrow();
  });
});
