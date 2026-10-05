import { describe, expect, it } from "vitest";
import { readingProgress } from "./readingProgress";

const base = { viewportHeight: 800, articleTop: 56, articleBottom: 4056, topOffset: 56 };

describe("readingProgress", () => {
  it("상세 진입 직후는 0", () => {
    expect(readingProgress({ ...base, scrollY: 0 })).toBe(0);
  });

  it("글 영역 중간이면 비율대로", () => {
    // start 0, end 4056 - 800 = 3256
    expect(readingProgress({ ...base, scrollY: 1628 })).toBeCloseTo(0.5);
  });

  it("마지막 본문이 화면 아래에 닿으면 정확히 1", () => {
    expect(readingProgress({ ...base, scrollY: 3256 })).toBe(1);
  });

  it("글 아래(관련 공간 · 푸터)로 더 내려가도 1에 머문다", () => {
    expect(readingProgress({ ...base, scrollY: 6000 })).toBe(1);
  });

  it("글이 아래쪽에서 시작하면 그 전까지는 0", () => {
    expect(readingProgress({ ...base, articleTop: 600, articleBottom: 5000, scrollY: 300 })).toBe(0);
  });

  it("글이 화면보다 짧으면(스크롤할 것이 없으면) 1", () => {
    expect(readingProgress({ ...base, articleBottom: 700, scrollY: 0 })).toBe(1);
  });

  it("측정값이 이상하면 NaN 대신 0", () => {
    expect(readingProgress({ ...base, scrollY: Number.NaN })).toBe(0);
    expect(readingProgress({ ...base, articleBottom: Number.POSITIVE_INFINITY, scrollY: 10 })).toBe(0);
  });

  it("음수 스크롤(iOS 바운스)도 0으로", () => {
    expect(readingProgress({ ...base, scrollY: -40 })).toBe(0);
  });
});
