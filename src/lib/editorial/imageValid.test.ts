import { describe, expect, it } from "vitest";
import { hasValidImageSrc } from "./imageValid";

describe("hasValidImageSrc", () => {
  it("사이트 경로와 http(s) 주소만 유효하다", () => {
    expect(hasValidImageSrc("/demo/green-shelf.jpg")).toBe(true);
    expect(hasValidImageSrc("https://res.cloudinary.com/x/image/upload/a.jpg")).toBe(true);
    expect(hasValidImageSrc("http://example.com/a.jpg")).toBe(true);
  });
  it("비어 있거나 형태가 틀린 값은 유효하지 않다", () => {
    for (const v of [null, undefined, "", "   ", "null", "undefined", "/", "//cdn.x/a.jpg", "photo.jpg", "data:image/png;base64,AAA", "javascript:alert(1)", "https://"]) {
      expect(hasValidImageSrc(v as string | null | undefined)).toBe(false);
    }
  });
});
