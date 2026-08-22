import { describe, it, expect } from "vitest";
import { normalizeSlug, isValidSlug } from "./slug";

describe("normalizeSlug", () => {
  it("이미 올바른 slug는 그대로 둔다", () => {
    expect(normalizeSlug("inner-discovery")).toBe("inner-discovery");
    expect(normalizeSlug("space-01")).toBe("space-01");
  });

  it("대문자를 소문자로 바꾼다", () => {
    expect(normalizeSlug("Inner Discovery")).toBe("inner-discovery");
  });

  it("공백을 하이픈으로 바꾼다", () => {
    expect(normalizeSlug("inner discovery")).toBe("inner-discovery");
  });

  it("한글/언더스코어 등 허용되지 않는 문자를 제거한다", () => {
    expect(normalizeSlug("내면의발견")).toBe("");
    expect(normalizeSlug("inner_discovery")).toBe("innerdiscovery");
  });

  it("/space/ 접두사가 섞여 들어와도 slug만 남긴다", () => {
    expect(normalizeSlug("/space/inner-discovery")).toBe("spaceinner-discovery");
  });

  it("연속된 하이픈을 하나로 정리한다", () => {
    expect(normalizeSlug("inner--discovery")).toBe("inner-discovery");
  });

  it("앞뒤 하이픈을 제거한다", () => {
    expect(normalizeSlug("-inner-discovery-")).toBe("inner-discovery");
  });
});

describe("isValidSlug", () => {
  it("영문 소문자/숫자/하이픈만 허용한다", () => {
    expect(isValidSlug("inner-discovery")).toBe(true);
    expect(isValidSlug("turndown-service")).toBe(true);
    expect(isValidSlug("space-01")).toBe(true);
  });

  it("빈 문자열, 앞뒤/연속 하이픈, 대문자, 슬래시는 거부한다", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("-inner-discovery")).toBe(false);
    expect(isValidSlug("inner-discovery-")).toBe(false);
    expect(isValidSlug("inner--discovery")).toBe(false);
    expect(isValidSlug("Inner-Discovery")).toBe(false);
    expect(isValidSlug("/space/inner-discovery")).toBe(false);
  });
});
