import { describe, it, expect } from "vitest";
import { shouldNotify } from "./notification";

describe("shouldNotify", () => {
  it("자신의 포스트잇에 스스로 반응하면 알림을 만들지 않는다", () => {
    expect(shouldNotify("user-1", "user-1")).toBe(false);
  });

  it("다른 사람의 포스트잇에 반응하면 알림을 만든다", () => {
    expect(shouldNotify("user-1", "user-2")).toBe(true);
  });
});
