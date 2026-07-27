import { describe, it, expect } from "vitest";
import { buildQrStickerPdf, buildGcCodeStickerPdf } from "./stickerPdf";
import { computeMaxFitGrid } from "./printSheet";

function makeCubes(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const code = `GC-${String(i + 1).padStart(3, "0")}`;
    return { code, url: `https://gonggancube.com/c/${code.toLowerCase()}` };
  });
}

describe("buildQrStickerPdf", () => {
  it("9개 이하면 1페이지에 담는다(3x3 고정)", () => {
    const doc = buildQrStickerPdf(makeCubes(9));
    expect(doc.internal.pages.length - 1).toBe(1);
  });

  it("10개면 2페이지(9개+1개)로 나뉜다", () => {
    const doc = buildQrStickerPdf(makeCubes(10));
    expect(doc.internal.pages.length - 1).toBe(2);
  });

  it("빈 목록이면 빈 문서를 만든다(에러 없이)", () => {
    expect(() => buildQrStickerPdf([])).not.toThrow();
  });
});

describe("buildGcCodeStickerPdf", () => {
  it("A4 최대 배치 개수(computeMaxFitGrid)만큼 1페이지에 담는다", () => {
    const perPage = computeMaxFitGrid({ cellWidthMm: 24, cellHeightMm: 14, gapMm: 3 }).perPage;
    const doc = buildGcCodeStickerPdf(makeCubes(perPage).map((c) => c.code));
    expect(doc.internal.pages.length - 1).toBe(1);
  });

  it("최대 배치 개수보다 1개 많으면 2페이지로 넘어간다", () => {
    const perPage = computeMaxFitGrid({ cellWidthMm: 24, cellHeightMm: 14, gapMm: 3 }).perPage;
    const doc = buildGcCodeStickerPdf(makeCubes(perPage + 1).map((c) => c.code));
    expect(doc.internal.pages.length - 1).toBe(2);
  });

  it("빈 목록이면 빈 문서를 만든다(에러 없이)", () => {
    expect(() => buildGcCodeStickerPdf([])).not.toThrow();
  });
});
