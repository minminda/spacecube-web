import { describe, it, expect } from "vitest";
import { validateSceneFields } from "./sceneInput";

describe("validateSceneFields", () => {
  it("빈 제목을 거부한다", () => {
    expect(validateSceneFields("", "본문 내용")).toEqual({ ok: false, error: "제목을 입력해주세요." });
  });

  it("공백만 있는 제목을 거부한다", () => {
    expect(validateSceneFields("   ", "본문 내용")).toEqual({ ok: false, error: "제목을 입력해주세요." });
  });

  it("빈 본문을 거부한다", () => {
    expect(validateSceneFields("제목", "")).toEqual({ ok: false, error: "본문을 입력해주세요." });
  });

  it("공백만 있는 본문을 거부한다", () => {
    expect(validateSceneFields("제목", "   \n  ")).toEqual({ ok: false, error: "본문을 입력해주세요." });
  });

  it("제목과 본문이 모두 있으면 통과한다(요약 없이도)", () => {
    expect(validateSceneFields("제목", "본문 내용")).toEqual({ ok: true });
  });

  it("제목·본문·요약이 모두 있어도 요약은 검증하지 않고 통과한다", () => {
    expect(validateSceneFields("제목", "본문 내용")).toEqual({ ok: true });
  });
});
