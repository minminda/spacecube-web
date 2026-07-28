import { describe, it, expect } from "vitest";
import { formatFetchException } from "./formatFetchError";

describe("formatFetchException", () => {
  it("AbortError(타임아웃)는 타임아웃 안내를 반환한다", () => {
    const err = new DOMException("aborted", "AbortError");
    expect(formatFetchException(err)).toBe("연결이 너무 느려요. 다시 시도해주세요.");
  });

  it("그 외 네트워크 예외(TypeError 등)는 연결 확인 안내를 반환한다", () => {
    expect(formatFetchException(new TypeError("Failed to fetch"))).toBe(
      "네트워크 연결을 확인하고 다시 시도해주세요.",
    );
  });

  it("알 수 없는 값이 와도 안전하게 기본 안내를 반환한다", () => {
    expect(formatFetchException("weird")).toBe("네트워크 연결을 확인하고 다시 시도해주세요.");
    expect(formatFetchException(null)).toBe("네트워크 연결을 확인하고 다시 시도해주세요.");
  });

  it("이름이 AbortError가 아닌 DOMException은 일반 안내를 반환한다", () => {
    const err = new DOMException("some other error", "NetworkError");
    expect(formatFetchException(err)).toBe("네트워크 연결을 확인하고 다시 시도해주세요.");
  });
});
