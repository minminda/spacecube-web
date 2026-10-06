import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => (where.isDemo ? [{ id: "demo1" }, { id: "demo2" }] : [{ id: "admin1" }])) } },
}));
vi.mock("@/lib/kpiEligibility", () => ({ getAdminUserIds: vi.fn(async () => new Set(["admin1"])) }));

import { LISTED_SPACE_WHERE, REAL_GUESTBOOK_NOTE_WHERE, SAMPLE_GUESTBOOK_AUTHOR_EMAIL, TASTE_SIGNAL_RECORD_WHERE, guestbookAuthorFilter, guestbookVisibleAuthorFilter, getKpiExcludedUserIds, previewGuestbookSamples } from "./demoData";

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

  it("일반 방문자 방명록 화면: 실제 공간에서 실제 글 + 방명록 샘플 계정 글만 보이고, 다른 더미 계정 글은 빠진다", () => {
    const env = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string>).NODE_ENV = "production";
      expect(previewGuestbookSamples(false)).toBe(false);
      expect(previewGuestbookSamples(true)).toBe(true);
      // 운영 방문자 화면 필터 = guestbookVisibleAuthorFilter(space.isDemo || 미리보기)
      expect(guestbookVisibleAuthorFilter(false || previewGuestbookSamples(false))).toEqual({
        OR: [{ userId: null }, { user: { isDemo: false } }, { user: { isDemo: true, email: SAMPLE_GUESTBOOK_AUTHOR_EMAIL } }],
      });
      // 관리자 · 시연 공간은 모든 더미 흔적까지
      expect(guestbookVisibleAuthorFilter(true)).toEqual({});
      (process.env as Record<string, string>).NODE_ENV = "development";
      expect(previewGuestbookSamples(false)).toBe(true);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = env as string;
    }
  });

  it("방명록 샘플 계정도 더미(isDemo)라 집계 · 운영자 화면 필터에서는 그대로 빠진다", () => {
    // 집계 · 운영자 화면은 isDemo로만 거른다 — 샘플 계정 이메일 예외가 섞이면 안 된다
    expect(JSON.stringify(REAL_GUESTBOOK_NOTE_WHERE)).not.toContain(SAMPLE_GUESTBOOK_AUTHOR_EMAIL);
    expect(JSON.stringify(guestbookAuthorFilter(false))).not.toContain(SAMPLE_GUESTBOOK_AUTHOR_EMAIL);
    // 방문자 화면 필터의 샘플 예외도 isDemo 계정으로만 한정된다(실제 사용자가 같은 이메일을 가질 수 없게)
    expect(guestbookVisibleAuthorFilter(false).OR).toContainEqual({ user: { isDemo: true, email: SAMPLE_GUESTBOOK_AUTHOR_EMAIL } });
  });

  it("운영자 화면 · 포스트잇 수 · 보상 화면은 실제 글만(실제 공간의 샘플 제외, 시연 공간은 그대로)", () => {
    expect(REAL_GUESTBOOK_NOTE_WHERE).toEqual({ OR: [{ userId: null }, { user: { isDemo: false } }, { space: { isDemo: true } }] });
  });
});
