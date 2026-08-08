import { describe, it, expect } from "vitest";
import {
  getMonthlyUsageSummary,
  selectTopFeaturedPosts,
  buildHeadline,
  buildKpiCards,
  buildChangeInsights,
  buildSuggestions,
  formatPeriodLabel,
} from "./monthlyReport";
import type { PeriodKpiStats } from "./kpi";
import type { ExtendedPeriodStats } from "./reportMetrics";
import type { ReportQuestionParticipation } from "./monthlyReport";

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

describe("formatPeriodLabel", () => {
  it("KST 기준 월을 'N월'로 표시한다", () => {
    expect(formatPeriodLabel(new Date("2026-06-30T15:00:00.000Z"))).toBe("7월"); // KST 7/1
  });
});

describe("buildHeadline", () => {
  it("방문자가 있으면 방문/재방문 수 문장 + 요약 문장을 이어붙인다", () => {
    const headline = buildHeadline(stats({ qrUsers: 48, returningUsers: 14 }), "조용히 오래 머무는 공간으로 경험되고 있습니다.");
    expect(headline).toBe("이번 기간 48명이 공간을 방문했고, 14명이 다시 찾아왔습니다. 방문자들은 조용히 오래 머무는 공간으로 경험되고 있습니다.");
  });

  it("방문자가 없으면 데이터 부족 문장으로 시작한다", () => {
    const headline = buildHeadline(stats({ qrUsers: 0 }), "아직 공간을 해석하기 위한 기록이 충분하지 않습니다.");
    expect(headline.startsWith("이번 기간은 아직 방문 기록이 충분하지 않습니다.")).toBe(true);
  });
});

describe("buildKpiCards", () => {
  it("이전 기간이 없으면 change가 전부 null", () => {
    const cards = buildKpiCards(stats({ qrUsers: 10 }), null);
    expect(cards.every((c) => c.change === null)).toBe(true);
  });

  it("6개 카드를 반환한다(QR이용자/재방문자/재방문율/방명록포스트잇/방명록작성률/평균취향적합도)", () => {
    const cards = buildKpiCards(stats({ qrUsers: 10 }), null);
    expect(cards.map((c) => c.key)).toEqual([
      "qrUsers",
      "returningUsers",
      "revisitRate",
      "guestbookPosts",
      "guestbookRate",
      "averageTasteScore",
    ]);
  });

  it("QR 이용자 증가를 %로, 재방문율/작성률은 %p로, 취향점수는 점수 차이로 표시한다", () => {
    const cards = buildKpiCards(
      stats({ qrUsers: 20, revisitRate: 0.3, guestbookRate: 0.4, averageTasteScore: 4.5 }),
      stats({ qrUsers: 10, revisitRate: 0.2, guestbookRate: 0.3, averageTasteScore: 4.0 }),
    );
    const qr = cards.find((c) => c.key === "qrUsers")!;
    expect(qr.change?.direction).toBe("up");
    expect(qr.change?.deltaLabel).toContain("%");

    const revisit = cards.find((c) => c.key === "revisitRate")!;
    expect(revisit.change?.deltaLabel).toContain("%p");

    const taste = cards.find((c) => c.key === "averageTasteScore")!;
    expect(taste.change?.deltaLabel).toContain("점");
  });

  it("재방문자 수·방명록 포스트잇 수는 절대 값(명/개)으로 표시한다", () => {
    const cards = buildKpiCards(stats({ qrUsers: 10, returningUsers: 3, guestbookPosts: 7 }), null);
    expect(cards.find((c) => c.key === "returningUsers")!.value).toBe("3명");
    expect(cards.find((c) => c.key === "guestbookPosts")!.value).toBe("7개");
  });
});

describe("buildChangeInsights", () => {
  it("이전 기간이 없으면 빈 배열", () => {
    expect(buildChangeInsights(stats({ qrUsers: 10 }), null)).toEqual([]);
  });

  it("재방문율이 5%p 이상 늘면 증가 문장을 포함한다", () => {
    const insights = buildChangeInsights(
      stats({ qrUsers: 20, revisitRate: 0.3 }),
      stats({ qrUsers: 20, revisitRate: 0.1 }),
    );
    expect(insights.some((t) => t.includes("재방문율이 지난달보다 늘었습니다"))).toBe(true);
  });

  it("최대 2개까지만, 변화 폭이 큰 순으로 반환한다", () => {
    const insights = buildChangeInsights(
      stats({ qrUsers: 100, revisitRate: 0.4, guestbookRate: 0.5, averageTasteScore: 4.8 }),
      stats({ qrUsers: 20, revisitRate: 0.1, guestbookRate: 0.1, averageTasteScore: 3.0 }),
    );
    expect(insights.length).toBeLessThanOrEqual(2);
  });

  it("변화가 임계값 미만이면 후보에서 제외한다", () => {
    const insights = buildChangeInsights(
      stats({ qrUsers: 20, revisitRate: 0.2, guestbookRate: 0.2, averageTasteScore: 4.0 }),
      stats({ qrUsers: 20, revisitRate: 0.2, guestbookRate: 0.2, averageTasteScore: 4.0 }),
    );
    expect(insights).toEqual([]);
  });
});

function extended(overrides: Partial<ExtendedPeriodStats>): ExtendedPeriodStats {
  return {
    qrScans: 0,
    episodeViews: 0,
    episodeCompletions: 0,
    avgReadDurationMs: null,
    newlyUnlockedEpisodes: 0,
    reactionsTotal: 0,
    tasteScoreDistribution: [],
    ...overrides,
  };
}

describe("buildSuggestions", () => {
  it("데이터가 평범하면 제안이 없을 수 있다", () => {
    const suggestions = buildSuggestions(stats({ qrUsers: 20, guestbookRate: 0.5 }), extended({}), []);
    expect(suggestions).toEqual([]);
  });

  it("질문 참여율이 25% 미만이면 그 질문을 짧게 하라는 제안을 만든다", () => {
    const q: ReportQuestionParticipation[] = [{ type: "QUESTION_2", label: "질문2", count: 2, percent: 10 }];
    const suggestions = buildSuggestions(stats({ qrUsers: 20, guestbookRate: 0.5 }), extended({}), q);
    expect(suggestions.some((s) => s.includes("질문2") && s.includes("참여율이 낮았습니다"))).toBe(true);
  });

  it("새 Episode 해제는 많지만 조회가 적으면 안내 강조 제안을 만든다", () => {
    const suggestions = buildSuggestions(
      stats({ qrUsers: 20, guestbookRate: 0.5 }),
      extended({ newlyUnlockedEpisodes: 5, episodeViews: 1 }),
      [],
    );
    expect(suggestions.some((s) => s.includes("새 Episode 해제는 많았지만 조회는 적었습니다"))).toBe(true);
  });

  it("최대 2개까지만 반환한다", () => {
    const q: ReportQuestionParticipation[] = [
      { type: "QUESTION_1", label: "질문1", count: 1, percent: 5 },
      { type: "QUESTION_2", label: "질문2", count: 1, percent: 5 },
    ];
    const suggestions = buildSuggestions(
      stats({ qrUsers: 20, guestbookRate: 0.05 }),
      extended({ newlyUnlockedEpisodes: 5, episodeViews: 0 }),
      q,
    );
    expect(suggestions.length).toBeLessThanOrEqual(2);
  });
});
