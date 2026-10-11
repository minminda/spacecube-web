import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/demoData", () => ({ getKpiExcludedUserIds: async () => new Set<string>() }));

import { countMapClickConversions, MAP_TO_SCAN_WINDOW_MS } from "@/lib/discoveryKpi";

const D = (day: number, hour = 0) => new Date(Date.UTC(2026, 9, day, hour));
const click = (o: Partial<{ userId: string | null; anonId: string | null; at: Date; spaceKey: string }>) => ({ userId: null, anonId: null, at: D(1), spaceKey: "a", ...o });

describe("countMapClickConversions", () => {
  it("비로그인: 같은 anonId가 7일 안에 같은 공간을 스캔하면 전환", () => {
    const r = countMapClickConversions([click({ anonId: "x" })], [{ userId: null, anonId: "x", at: D(7), spaceKey: "a" }]);
    expect(r).toEqual({ clickers: 1, converted: 1 });
  });
  it("7일을 넘기거나 클릭보다 이전이거나 다른 공간이면 전환 아님", () => {
    const c = [click({ anonId: "x" })];
    expect(countMapClickConversions(c, [{ userId: null, anonId: "x", at: D(9), spaceKey: "a" }]).converted).toBe(0);
    expect(countMapClickConversions(c, [{ userId: null, anonId: "x", at: new Date(D(1).getTime() - 1), spaceKey: "a" }]).converted).toBe(0);
    expect(countMapClickConversions(c, [{ userId: null, anonId: "x", at: D(2), spaceKey: "b" }]).converted).toBe(0);
    expect(countMapClickConversions(c, [{ userId: null, anonId: "x", at: new Date(D(1).getTime() + MAP_TO_SCAN_WINDOW_MS), spaceKey: "a" }]).converted).toBe(1);
  });
  it("같은 방문자가 여러 번 클릭해도 (방문자×공간) 1명으로 센다", () => {
    const r = countMapClickConversions([click({ anonId: "x" }), click({ anonId: "x", at: D(3) })], []);
    expect(r).toEqual({ clickers: 1, converted: 0 });
  });
  it("로그인 후 스캔(userId만)도 클릭이 userId를 가졌으면 연결된다", () => {
    const r = countMapClickConversions([click({ userId: "u", anonId: "x" })], [{ userId: "u", anonId: null, at: D(2), spaceKey: "a" }]);
    expect(r.converted).toBe(1);
  });
  it("식별자가 없는 클릭은 무시", () => {
    expect(countMapClickConversions([click({})], []).clickers).toBe(0);
  });
});
