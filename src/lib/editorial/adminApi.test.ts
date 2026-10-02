import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { statusUpdate } = await import("./adminApi");

describe("statusUpdate — publishedAt 정책", () => {
  it("처음 발행할 때만 publishedAt을 기록한다", () => {
    const u = statusUpdate("PUBLISHED", null);
    expect(u.status).toBe("PUBLISHED");
    expect("publishedAt" in u && u.publishedAt).toBeInstanceOf(Date);
  });
  it("재발행해도 최초 발행일을 덮어쓰지 않는다", () => {
    expect(statusUpdate("PUBLISHED", new Date("2026-09-01"))).toEqual({ status: "PUBLISHED" });
  });
  it("발행 취소·보관은 publishedAt을 건드리지 않는다", () => {
    expect(statusUpdate("DRAFT", new Date("2026-09-01"))).toEqual({ status: "DRAFT" });
    expect(statusUpdate("ARCHIVED", null)).toEqual({ status: "ARCHIVED" });
  });
});
