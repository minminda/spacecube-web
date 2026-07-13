import { describe, it, expect } from "vitest";
import { getMonthlyUsageSummary, selectTopFeaturedPosts } from "./monthlyReport";
import type { PeriodKpiStats } from "./kpi";

function stats(overrides: Partial<PeriodKpiStats>): PeriodKpiStats {
  return {
    qrUsers: 20,
    returningUsers: 0,
    revisitRate: 0,
    guestbookWriters: 0,
    guestbookPosts: 0,
    guestbookRate: 0,
    averageTasteScore: null,
    ...overrides,
  };
}

describe("getMonthlyUsageSummary", () => {
  it("표본이 부족하면(QR 이용자 < 5) 다른 수치와 무관하게 데이터 부족 문구", () => {
    const summary = getMonthlyUsageSummary(stats({ qrUsers: 4, averageTasteScore: 5, revisitRate: 0.9, guestbookRate: 0.9 }));
    expect(summary).toBe("아직 공간을 해석하기 위한 기록이 충분하지 않습니다.");
  });

  it("평균 취향 적합도가 높으면 취향 적합도 문장", () => {
    const summary = getMonthlyUsageSummary(stats({ averageTasteScore: 4.2 }));
    expect(summary).toBe("방문자들이 이 공간과 높은 취향 적합도를 느끼고 있습니다.");
  });

  it("재방문율이 높으면 재방문 문장", () => {
    const summary = getMonthlyUsageSummary(stats({ averageTasteScore: 3, revisitRate: 0.3 }));
    expect(summary).toBe("한 번 방문한 뒤 다시 찾는 이용자가 많은 공간입니다.");
  });

  it("방명록 작성률이 높으면 작성률 문장", () => {
    const summary = getMonthlyUsageSummary(stats({ averageTasteScore: 3, revisitRate: 0.1, guestbookRate: 0.4 }));
    expect(summary).toBe("방문자들이 자신의 경험을 적극적으로 남기고 있습니다.");
  });

  it("어떤 임계값도 넘지 않으면 중립 기본 문장(데이터 부족 문구와는 다름)", () => {
    const summary = getMonthlyUsageSummary(stats({ averageTasteScore: 3, revisitRate: 0.1, guestbookRate: 0.1 }));
    expect(summary).toBe("방문자들이 저마다의 방식으로 이 공간을 경험하고 있습니다.");
  });
});

describe("selectTopFeaturedPosts", () => {
  it("공감이 0개인 포스트잇만 있으면 빈 배열(억지로 TOP3 만들지 않음)", () => {
    const result = selectTopFeaturedPosts([
      { id: "a", createdAt: new Date("2026-07-01T00:00:00Z"), reactionCount: 0 },
      { id: "b", createdAt: new Date("2026-07-02T00:00:00Z"), reactionCount: 0 },
    ]);
    expect(result).toEqual([]);
  });

  it("공감 수 내림차순, 동률이면 작성일 빠른 순으로 정렬해 최대 3개", () => {
    const result = selectTopFeaturedPosts([
      { id: "low", createdAt: new Date("2026-07-01T00:00:00Z"), reactionCount: 1 },
      { id: "tie-later", createdAt: new Date("2026-07-05T00:00:00Z"), reactionCount: 3 },
      { id: "tie-earlier", createdAt: new Date("2026-07-03T00:00:00Z"), reactionCount: 3 },
      { id: "high", createdAt: new Date("2026-07-02T00:00:00Z"), reactionCount: 5 },
      { id: "zero", createdAt: new Date("2026-07-04T00:00:00Z"), reactionCount: 0 },
    ]);
    expect(result.map((r) => r.id)).toEqual(["high", "tie-earlier", "tie-later"]);
  });
});
