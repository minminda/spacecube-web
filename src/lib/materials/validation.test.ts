import { describe, expect, it } from "vitest";
import { formatFileSize, looksLikePdf, MAX_MATERIAL_FILE_SIZE } from "./validation";

describe("looksLikePdf", () => {
  it("PDF 매직 바이트로 시작하면 true", () => {
    expect(looksLikePdf(Buffer.from("%PDF-1.7\n..."))).toBe(true);
  });

  it("다른 파일 시그니처는 false", () => {
    expect(looksLikePdf(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false); // PNG
    expect(looksLikePdf(Buffer.from("not a pdf"))).toBe(false);
  });

  it("빈 버퍼는 false", () => {
    expect(looksLikePdf(Buffer.alloc(0))).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("바이트 단위", () => {
    expect(formatFileSize(500)).toBe("500B");
  });

  it("킬로바이트 단위", () => {
    expect(formatFileSize(2048)).toBe("2KB");
  });

  it("메가바이트 단위", () => {
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0MB");
  });
});

describe("MAX_MATERIAL_FILE_SIZE", () => {
  it("Vercel 서버리스 함수 요청 본문 한도(4.5MB)보다 작다", () => {
    expect(MAX_MATERIAL_FILE_SIZE).toBeLessThan(4.5 * 1024 * 1024);
  });
});
