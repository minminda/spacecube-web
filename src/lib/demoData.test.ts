import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => (where.isDemo ? [{ id: "demo1" }, { id: "demo2" }] : [{ id: "admin1" }])) } },
}));
vi.mock("@/lib/kpiEligibility", () => ({ getAdminUserIds: vi.fn(async () => new Set(["admin1"])) }));

import { LISTED_SPACE_WHERE, TASTE_SIGNAL_RECORD_WHERE, guestbookAuthorFilter, getKpiExcludedUserIds } from "./demoData";

describe("시연 데이터 제외 정책", () => {
  it("공개 목록은 공개 중이면서 시연 공간이 아닌 공간만", () => {
    expect(LISTED_SPACE_WHERE).toEqual({ isActive: true, isDemo: false });
  });

  it("취향 신호는 시연 공간 기록을 뺀다", () => {
    expect(TASTE_SIGNAL_RECORD_WHERE).toEqual({ space: { isDemo: false } });
  });

  it("시연 공간 방명록은 더미 흔적까지 그대로 보여준다", () => {
    expect(guestbookAuthorFilter(true)).toEqual({});
  });

  it("실제 공간 방명록은 더미 계정 글을 빼되 비로그인 글은 살린다", () => {
    expect(guestbookAuthorFilter(false)).toEqual({ OR: [{ userId: null }, { user: { isDemo: false } }] });
  });

  it("KPI 제외 대상은 관리자 ∪ 더미 계정", async () => {
    expect([...(await getKpiExcludedUserIds())].sort()).toEqual(["admin1", "demo1", "demo2"]);
  });
});
