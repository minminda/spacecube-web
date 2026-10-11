import { describe, expect, it } from "vitest";
import { THEME_ATTRIBUTE, THEME_INIT_SCRIPT, THEME_STORAGE_KEY, parseTheme } from "./theme";

describe("화면 테마", () => {
  it("저장값이 dark일 때만 다크, 그 밖(비어 있음 · 엉뚱한 값)은 라이트", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme(null)).toBe("light");
    expect(parseTheme("system")).toBe("light");
  });

  it("초기 스크립트는 저장된 다크를 html에 붙이고, 저장소 오류를 삼킨다", () => {
    const attrs: Record<string, string> = {};
    const doc = { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } };
    const run = (stored: string | null | "throw") =>
      new Function("localStorage", "document", THEME_INIT_SCRIPT)(
        { getItem: (k: string) => { if (stored === "throw") throw new Error("denied"); return k === THEME_STORAGE_KEY ? stored : null; } },
        doc,
      );
    run("dark");
    expect(attrs[THEME_ATTRIBUTE]).toBe("dark");
    for (const k of Object.keys(attrs)) delete attrs[k];
    run("light");
    run(null);
    expect(attrs[THEME_ATTRIBUTE]).toBeUndefined(); // 라이트는 속성 없음이 기본
    expect(() => run("throw")).not.toThrow();
  });
});
