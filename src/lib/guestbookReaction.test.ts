import { describe, it, expect } from "vitest";
import { canReact } from "./guestbookReaction";

describe("canReact", () => {
  it("자신의 글에는 공감할 수 없다(기본 정책, 로그인)", () => {
    expect(canReact({ userId: "user-1", anonId: null }, { userId: "user-1", anonId: null }, false)).toBe(false);
  });

  it("다른 사람의 글에는 공감할 수 있다(로그인)", () => {
    expect(canReact({ userId: "user-1", anonId: null }, { userId: "user-2", anonId: null }, false)).toBe(true);
  });

  it("정책 상수가 허용으로 바뀌면 자신의 글에도 공감할 수 있다", () => {
    expect(canReact({ userId: "user-1", anonId: null }, { userId: "user-1", anonId: null }, true)).toBe(true);
  });

  it("자신의 글에는 공감할 수 없다(비로그인, anonId 기준)", () => {
    expect(canReact({ userId: null, anonId: "anon-1" }, { userId: null, anonId: "anon-1" }, false)).toBe(false);
  });

  it("다른 익명 방문자의 글에는 공감할 수 있다", () => {
    expect(canReact({ userId: null, anonId: "anon-1" }, { userId: null, anonId: "anon-2" }, false)).toBe(true);
  });

  it("작성자와 반응자가 둘 다 익명이어도 서로 다른 방문자면 같은 사람으로 오판하지 않는다", () => {
    expect(canReact({ userId: null, anonId: null }, { userId: null, anonId: null }, false)).toBe(true);
  });
});
