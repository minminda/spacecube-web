import { describe, it, expect } from "vitest";
import { sanitizeRedirectPath } from "./safeRedirect";

describe("sanitizeRedirectPath", () => {
  it("정상 내부 경로는 그대로 반환한다", () => {
    expect(sanitizeRedirectPath("/space/buk/record")).toBe("/space/buk/record");
    expect(sanitizeRedirectPath("/archive")).toBe("/archive");
  });

  it("빈 값/undefined/null은 홈으로 보낸다", () => {
    expect(sanitizeRedirectPath("")).toBe("/");
    expect(sanitizeRedirectPath(undefined)).toBe("/");
    expect(sanitizeRedirectPath(null)).toBe("/");
  });

  it("절대 URL(외부 사이트)은 차단한다", () => {
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/");
    expect(sanitizeRedirectPath("http://evil.com/phish")).toBe("/");
  });

  it("프로토콜 상대 URL(//evil.com)은 차단한다", () => {
    expect(sanitizeRedirectPath("//evil.com")).toBe("/");
    expect(sanitizeRedirectPath("//evil.com/path")).toBe("/");
  });

  it("백슬래시로 시작하는 프로토콜 상대 URL(/\\evil.com)도 차단한다", () => {
    expect(sanitizeRedirectPath("/\\evil.com")).toBe("/");
  });

  it("슬래시로 시작하지 않는 상대 경로는 차단한다", () => {
    expect(sanitizeRedirectPath("evil.com")).toBe("/");
  });
});
