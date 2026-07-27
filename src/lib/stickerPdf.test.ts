import { describe, it, expect } from "vitest";
import { buildQrStickerPdf, buildNumberStickerPdf } from "./stickerPdf";

function makeCubes(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const code = `GC-${String(i + 1).padStart(3, "0")}`;
    return { code, url: `https://gonggancube.com/c/${code.toLowerCase()}` };
  });
}

describe("buildQrStickerPdf", () => {
  it("9개 이하면 1페이지에 담는다", () => {
    const doc = buildQrStickerPdf(makeCubes(9));
    expect(doc.internal.pages.length - 1).toBe(1);
  });

  it("10개면 2페이지(9개+1개)로 나뉜다", () => {
    const doc = buildQrStickerPdf(makeCubes(10));
    expect(doc.internal.pages.length - 1).toBe(2);
  });

  it("18개면 정확히 2페이지", () => {
    const doc = buildQrStickerPdf(makeCubes(18));
    expect(doc.internal.pages.length - 1).toBe(2);
  });

  it("빈 목록이면 빈 문서를 만든다(에러 없이)", () => {
    expect(() => buildQrStickerPdf([])).not.toThrow();
  });
});

describe("buildNumberStickerPdf", () => {
  it("코드 목록만으로 QR 없이 생성되고 페이지 수가 동일한 규칙을 따른다", () => {
    const codes = makeCubes(10).map((c) => c.code);
    const doc = buildNumberStickerPdf(codes);
    expect(doc.internal.pages.length - 1).toBe(2);
  });
});
