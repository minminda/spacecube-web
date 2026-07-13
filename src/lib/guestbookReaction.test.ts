import { describe, it, expect } from "vitest";
import { canReact } from "./guestbookReaction";

describe("canReact", () => {
  it("자신의 글에는 공감할 수 없다(기본 정책)", () => {
    expect(canReact("user-1", "user-1", false)).toBe(false);
  });

  it("다른 사람의 글에는 공감할 수 있다", () => {
    expect(canReact("user-1", "user-2", false)).toBe(true);
  });

  it("정책 상수가 허용으로 바뀌면 자신의 글에도 공감할 수 있다", () => {
    expect(canReact("user-1", "user-1", true)).toBe(true);
  });
});
