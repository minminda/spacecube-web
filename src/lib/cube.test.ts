import { describe, it, expect } from "vitest";
import { normalizeCubeCode, buildCubeUrl, resolveCubeDestination, type CubeWithSpace } from "./cube";

describe("normalizeCubeCode", () => {
  it("소문자를 대문자로 바꾼다", () => {
    expect(normalizeCubeCode("gc-001")).toBe("GC-001");
  });

  it("이미 대문자면 그대로 둔다", () => {
    expect(normalizeCubeCode("GC-001")).toBe("GC-001");
  });

  it("대소문자가 섞여 있어도 통일한다", () => {
    expect(normalizeCubeCode("Gc-001")).toBe("GC-001");
  });

  it("앞뒤 공백을 제거한다", () => {
    expect(normalizeCubeCode("  gc-001  ")).toBe("GC-001");
  });
});

describe("buildCubeUrl", () => {
  it("baseUrl과 소문자 코드로 큐브 URL을 만든다", () => {
    expect(buildCubeUrl("https://gonggancube.com", "GC-001")).toBe("https://gonggancube.com/c/gc-001");
  });

  it("입력 코드가 소문자/혼합이어도 URL은 항상 소문자", () => {
    expect(buildCubeUrl("https://gonggancube.com", "gc-002")).toBe("https://gonggancube.com/c/gc-002");
  });
});

describe("resolveCubeDestination", () => {
  it("큐브가 없으면 not_found", () => {
    expect(resolveCubeDestination(null)).toEqual({ type: "not_found" });
  });

  it("DISABLED면 disabled", () => {
    const cube: CubeWithSpace = { id: "1", status: "DISABLED", spaceId: null, space: null };
    expect(resolveCubeDestination(cube)).toEqual({ type: "disabled" });
  });

  it("UNASSIGNED면 unassigned", () => {
    const cube: CubeWithSpace = { id: "1", status: "UNASSIGNED", spaceId: null, space: null };
    expect(resolveCubeDestination(cube)).toEqual({ type: "unassigned" });
  });

  it("ASSIGNED + space 있으면 redirect", () => {
    const cube: CubeWithSpace = { id: "1", status: "ASSIGNED", spaceId: "s1", space: { id: "s1", slug: "nonon" } };
    expect(resolveCubeDestination(cube)).toEqual({ type: "redirect", slug: "nonon" });
  });

  it("ASSIGNED인데 space가 없는 데이터 정합성 예외는 unassigned로 안전하게 처리", () => {
    const cube: CubeWithSpace = { id: "1", status: "ASSIGNED", spaceId: null, space: null };
    expect(resolveCubeDestination(cube)).toEqual({ type: "unassigned" });
  });
});
