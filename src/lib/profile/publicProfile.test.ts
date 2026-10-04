import { describe, it, expect } from "vitest";
import { canFollow, compareTaste, frequentAreas, handleError, normalizeHandle, parseProfileSettings, publicSpaces, publicTasteWords } from "./publicProfile";
import { attrKey } from "@/lib/discoveryRecommend";

const d = (s: string) => new Date(s);
const lib = (key: string, o: Partial<{ visited: boolean; saved: boolean; personal: boolean; demo: boolean; lastAt: Date }> = {}) => ({
  key, visited: false, saved: true, personal: false, demo: false, lastAt: d("2026-10-01"), ...o,
});
const pick = (spaceId: string, slug: string, o: Partial<{ status: string; isDemo: boolean; area: string; showPhotos: boolean }> = {}) => ({
  spaceId, showPhotos: o.showPhotos ?? false, space: { slug, area: o.area ?? "연남동", status: o.status ?? "PUBLISHED", isDemo: o.isDemo ?? false },
});

describe("프로필 주소(handle)", () => {
  it("영문 소문자·숫자·._- 3~24자, 예약어 금지", () => {
    expect(normalizeHandle(" @DongMin ")).toBe("dongmin");
    expect(handleError("dongmin")).toBeNull();
    expect(handleError("dong.min_01")).toBeNull();
    expect(handleError("동민")).not.toBeNull();
    expect(handleError("ab")).not.toBeNull();
    expect(handleError("-dongmin")).not.toBeNull();
    expect(handleError("admin")).not.toBeNull();
  });
});

describe("설정 입력", () => {
  it("공개하려면 주소가 있어야 한다", () => {
    expect(parseProfileSettings({ profilePublic: true }, null).ok).toBe(false);
    expect(parseProfileSettings({ profilePublic: true, handle: "dongmin" }, null).ok).toBe(true);
    expect(parseProfileSettings({ profilePublic: true }, "dongmin").ok).toBe(true);
  });
  it("넘어온 필드만 바꾸고, 소개는 공백 정리·빈 값은 null", () => {
    const r = parseProfileSettings({ bio: "  조용한   공간  ", showTaste: false }, null);
    expect(r.ok && r.data).toEqual({ bio: "조용한 공간", showTaste: false });
    const empty = parseProfileSettings({ bio: "   " }, null);
    expect(empty.ok && empty.data.bio).toBeNull();
    expect(parseProfileSettings({ bio: "가".repeat(121) }, null).ok).toBe(false);
    expect(parseProfileSettings({ profilePublic: "yes" }, "a1b").ok).toBe(false);
  });
});

describe("공개 공간", () => {
  it("공개로 고른 공간 중 아카이브에 남아 있는 실공간만, 최근 순", () => {
    const library = [
      lib("s-booknook", { visited: true, lastAt: d("2026-10-02") }),
      lib("s-samul", { saved: true, lastAt: d("2026-10-03") }),
      lib("s-private-only", { visited: true }),
      lib("e-personal", { personal: true }),
    ];
    const rows = publicSpaces(library, [
      pick("1", "booknook", { showPhotos: true }),
      pick("2", "samul"),
      pick("3", "removed-from-archive"),
      pick("4", "demo-space", { isDemo: true }),
      pick("5", "draft-space", { status: "DRAFT" }),
    ]);
    expect(rows.map((r) => r.slug)).toEqual(["samul", "booknook"]);
    expect(rows.find((r) => r.slug === "booknook")).toMatchObject({ visited: true, showPhotos: true });
    // 공개로 고르지 않은 공간은 아카이브에 있어도 나오지 않는다
    expect(rows.some((r) => r.slug === "private-only")).toBe(false);
  });
  it("자주 찾는 지역은 정규화해 빈도순", () => {
    expect(frequentAreas([{ area: "연남동" }, { area: "망원동" }, { area: "연남" }, { area: null }])).toEqual(["연남", "망원"]);
  });
});

describe("취향 비교(퍼센트 없음)", () => {
  const weights = new Map([[attrKey("조용한"), 3], [attrKey("책"), 2]]);
  it("겹치는 단어와 공통 공간으로 단계만", () => {
    const c = compareTaste(weights, ["조용한", "책", "감각적인"], new Set(["booknook"]), [{ spaceId: "1", slug: "booknook" }, { spaceId: "2", slug: "samul" }], attrKey);
    expect(c.sharedWords).toEqual(["조용한", "책"]);
    expect(c.commonSpaceIds).toEqual(["1"]);
    expect(c.level).toBe("very");
    expect(c.label).not.toMatch(/%/);
  });
  it("겹침이 없으면 new", () => {
    expect(compareTaste(new Map(), ["조용한"], new Set(), [], attrKey).level).toBe("new");
  });
});

describe("취향 따라가기 조건", () => {
  const target = { id: "b", profilePublic: true, isDemo: false };
  it("자기 자신·비공개·시연·없는 사용자 불가", () => {
    expect(canFollow("a", target).ok).toBe(true);
    expect(canFollow("b", target)).toMatchObject({ ok: false, status: 400 });
    expect(canFollow("a", { ...target, profilePublic: false })).toMatchObject({ ok: false, status: 404 });
    expect(canFollow("a", { ...target, isDemo: true }).ok).toBe(false);
    expect(canFollow("a", null).ok).toBe(false);
  });
});

describe("공개 대표 취향", () => {
  it("기존 순위를 따르되 공개한 공간에서 확인되는 단어만(숨긴 공간의 취향은 새지 않음)", () => {
    const ranked = [{ key: "lp카페", label: "LP카페" }, { key: "독립서점", label: "독립서점" }, { key: "조용한", label: "조용한" }];
    expect(publicTasteWords(ranked, ["독립서점", "조용한", "책"], attrKey)).toEqual(["독립서점", "조용한"]);
    expect(publicTasteWords(ranked, [], attrKey)).toEqual([]);
  });
});
