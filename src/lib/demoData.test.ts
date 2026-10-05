import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => (where.isDemo ? [{ id: "demo1" }, { id: "demo2" }] : [{ id: "admin1" }])) } },
}));
vi.mock("@/lib/kpiEligibility", () => ({ getAdminUserIds: vi.fn(async () => new Set(["admin1"])) }));

import { LISTED_SPACE_WHERE, REAL_GUESTBOOK_NOTE_WHERE, TASTE_SIGNAL_RECORD_WHERE, guestbookAuthorFilter, getKpiExcludedUserIds, previewGuestbookSamples } from "./demoData";

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

  it("방명록 샘플(더미 계정 글)은 운영의 일반 방문자에게 안 보이고 관리자 · 로컬 개발 미리보기에서만", () => {
    const env = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string>).NODE_ENV = "production";
      expect(previewGuestbookSamples(false)).toBe(false);
      expect(previewGuestbookSamples(true)).toBe(true);
      // 운영 방문자 화면 필터 = guestbookAuthorFilter(space.isDemo || 미리보기) → 실제 공간에서는 샘플 제외
      expect(guestbookAuthorFilter(false || previewGuestbookSamples(false))).toEqual({ OR: [{ userId: null }, { user: { isDemo: false } }] });
      (process.env as Record<string, string>).NODE_ENV = "development";
      expect(previewGuestbookSamples(false)).toBe(true);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = env as string;
    }
  });

  it("운영자 화면 · 포스트잇 수 · 보상 화면은 실제 글만(실제 공간의 샘플 제외, 시연 공간은 그대로)", () => {
    expect(REAL_GUESTBOOK_NOTE_WHERE).toEqual({ OR: [{ userId: null }, { user: { isDemo: false } }, { space: { isDemo: true } }] });
  });
});
