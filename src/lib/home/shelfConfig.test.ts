import { describe, expect, it } from "vitest";
import { BUILTIN_SHELVES, buildShelfPlan, nextShelfOrder, parseEditorialShelf, parseShelfSettings, type ShelfRow } from "./shelfConfig";

const row = (p: Partial<ShelfRow> & { key: string }): ShelfRow => ({ id: p.key, kind: "SYSTEM", title: null, description: null, visible: true, order: 0, ...p });

describe("buildShelfPlan", () => {
  it("설정이 없으면 레지스트리 기본 순서 · 노출", () => {
    const plan = buildShelfPlan([]);
    expect(plan.map((p) => p.key)).toEqual(BUILTIN_SHELVES.map((b) => b.key));
    expect(plan.every((p) => p.visible && p.titleOverride === null)).toBe(true);
  });
  it("순서 · 숨김 · 제목 재정의를 반영한다", () => {
    const plan = buildShelfPlan([row({ key: "story", order: 5 }), row({ key: "saved", visible: false, order: 40, kind: "PERSONALIZED", title: " 내 서랍 " })]);
    expect(plan[0].key).toBe("story");
    const saved = plan.find((p) => p.key === "saved")!;
    expect(saved.visible).toBe(false);
    expect(saved.titleOverride).toBe("내 서랍");
  });
  it("제목 고정 선반(area · theme)은 제목 재정의를 무시한다", () => {
    expect(buildShelfPlan([row({ key: "area", title: "x", order: 60 })]).find((p) => p.key === "area")!.titleOverride).toBeNull();
  });
  it("EDITORIAL 선반이 order에 맞게 끼어들고, 알 수 없는 SYSTEM 행은 무시한다", () => {
    const plan = buildShelfPlan([row({ key: "ed:1", kind: "EDITORIAL", title: "음악 공간", order: 55 }), row({ key: "ghost", order: 1 })]);
    expect(plan.map((p) => p.key)).not.toContain("ghost");
    const i = plan.findIndex((p) => p.key === "ed:1");
    expect(plan[i - 1].key).toBe("new");
    expect(plan[i].editorialId).toBe("ed:1");
  });
  it("nextShelfOrder는 가장 뒤", () => {
    expect(nextShelfOrder([])).toBeGreaterThan(BUILTIN_SHELVES.length * 10);
    expect(nextShelfOrder([{ order: 500 }])).toBe(510);
  });
});

describe("parseShelfSettings", () => {
  const ed = new Set(["ed:1"]);
  it("정상 / 알 수 없는 키 / 중복 / 편집 선반 빈 제목", () => {
    expect(parseShelfSettings({ items: [{ key: "new", visible: true, title: null }, { key: "ed:1", visible: false, title: "A" }] }, ed).ok).toBe(true);
    expect(parseShelfSettings({ items: [{ key: "zzz", visible: true, title: null }] }, ed).ok).toBe(false);
    expect(parseShelfSettings({ items: [{ key: "new", visible: true }, { key: "new", visible: true }] }, ed).ok).toBe(false);
    expect(parseShelfSettings({ items: [{ key: "ed:1", visible: true, title: "  " }] }, ed).ok).toBe(false);
    expect(parseShelfSettings({}, ed).ok).toBe(false);
  });
});

describe("parseEditorialShelf", () => {
  it("제목 필수 · 공간 중복 제거 · 상한", () => {
    expect(parseEditorialShelf({ title: " " }).ok).toBe(false);
    const r = parseEditorialShelf({ title: "A", spaces: [{ spaceId: "a", note: " x " }, { spaceId: "a" }, { spaceId: "b", note: "" }] });
    expect(r.ok && r.data.spaces).toEqual([{ spaceId: "a", note: "x" }, { spaceId: "b", note: null }]);
    expect(parseEditorialShelf({ title: "A", spaces: Array.from({ length: 31 }, (_, i) => ({ spaceId: String(i) })) }).ok).toBe(false);
  });
});
