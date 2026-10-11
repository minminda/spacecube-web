import { describe, expect, it } from "vitest";
import { diagnoseShelf, type ShelfStats } from "./shelfDiagnosis";
import { applyThemeRules, diagnoseThemes, parseKeywords, themeRuleKey } from "./themeRules";
import { HOME_THEMES } from "./shelves";

const stats: ShelfStats = { publicSpaces: 5, areaShelves: 1, curations: 2, stories: 0, partnerSpaces: 1, themeOk: 2, themeTotal: 9, editorialCounts: { "ed:a": 0, "ed:b": 3 } };
const item = (key: string, kind: "SYSTEM" | "PERSONALIZED" | "EDITORIAL" = "SYSTEM", visible = true) => ({ key, kind, visible });

describe("diagnoseShelf", () => {
  it("관리자 숨김이 가장 먼저", () => expect(diagnoseShelf(item("new", "SYSTEM", false), stats).label).toBe("관리자 숨김"));
  it("공간 수 부족 · 노출 중", () => {
    expect(diagnoseShelf(item("new"), { ...stats, publicSpaces: 2 })).toMatchObject({ tone: "warn", label: "공간 수 부족" });
    expect(diagnoseShelf(item("new"), stats).tone).toBe("ok");
  });
  it("콘텐츠 없음 · 개인화 · 로그인 전용", () => {
    expect(diagnoseShelf(item("story"), stats).label).toBe("해당 콘텐츠 없음");
    expect(diagnoseShelf(item("similar", "PERSONALIZED"), stats).label).toBe("개인화 데이터 필요");
    expect(diagnoseShelf(item("saved", "PERSONALIZED"), stats).label).toBe("로그인 사용자 전용");
  });
  it("EDITORIAL은 공개 공간 수로", () => {
    expect(diagnoseShelf(item("ed:a", "EDITORIAL"), stats).tone).toBe("warn");
    expect(diagnoseShelf(item("ed:b", "EDITORIAL"), stats).tone).toBe("ok");
  });
});

describe("theme rules", () => {
  it("키워드 정리: 쉼표 · 줄바꿈 · 중복(대소문자) 제거", () => expect(parseKeywords("LP, 음악\nlp,  레코드 ,")).toEqual(["LP", "음악", "레코드"]));
  it("저장된 규칙이 기본 키워드를 덮고, 비어 있으면 기본값", () => {
    const t = applyThemeRules(HOME_THEMES, [{ key: themeRuleKey("music"), description: "lp, 턴테이블" }, { key: themeRuleKey("book"), description: "" }]);
    expect(t.find((x) => x.key === "music")!.keywords).toEqual(["lp", "턴테이블"]);
    expect(t.find((x) => x.key === "book")!.keywords).toEqual(HOME_THEMES.find((x) => x.key === "book")!.keywords);
  });
  it("진단: 3곳 이상이면 ok, 1~2곳 short, 0곳 none", () => {
    const sp = (name: string, tags: string[]) => ({ name, category: "공간", tags });
    const d = diagnoseThemes(HOME_THEMES, HOME_THEMES, [sp("a", ["LP"]), sp("b", ["음악"]), sp("c", ["레코드"]), sp("d", ["책"])]);
    expect(d.find((x) => x.key === "music")).toMatchObject({ count: 3, status: "ok" });
    expect(d.find((x) => x.key === "book")).toMatchObject({ count: 1, status: "short" });
    expect(d.find((x) => x.key === "film")).toMatchObject({ count: 0, status: "none" });
  });
});
