import { describe, it, expect } from "vitest";
import { canFollow, cardPhoto, commonSpaceIds, handleError, normalizeHandle, parseProfileSettings, peopleQuery, publicSpaces, visitMonth } from "./publicProfile";

const d = (s: string) => new Date(s);
const lib = (key: string, o: Partial<{ visited: boolean; saved: boolean; personal: boolean; demo: boolean; lastAt: Date }> = {}) => ({
  key, visited: false, saved: true, personal: false, demo: false, lastAt: d("2026-10-01"), ...o,
});
const pick = (spaceId: string, slug: string, o: Partial<{ status: string; isDemo: boolean; showPhotos: boolean; showMemo: boolean; showVisitDate: boolean }> = {}) => ({
  spaceId, showPhotos: o.showPhotos ?? false, showMemo: o.showMemo ?? false, showVisitDate: o.showVisitDate ?? false,
  space: { slug, status: o.status ?? "PUBLISHED", isDemo: o.isDemo ?? false },
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
  it("넘어온 필드만, 소개는 공백 정리·빈 값은 null, 취향 표시 설정은 더 받지 않는다", () => {
    const r = parseProfileSettings({ bio: "  조용한   공간  ", showTaste: false }, null);
    expect(r.ok && r.data).toEqual({ bio: "조용한 공간" });
    const empty = parseProfileSettings({ bio: "   " }, null);
    expect(empty.ok && empty.data.bio).toBeNull();
    expect(parseProfileSettings({ bio: "가".repeat(121) }, null).ok).toBe(false);
    expect(parseProfileSettings({ profilePublic: "yes" }, "a1b").ok).toBe(false);
  });
});

describe("공개 공간", () => {
  it("공개로 고른 공간 중 아카이브에 남아 있는 실공간만, 최근 순 — 공개 항목 플래그 유지", () => {
    const library = [
      lib("s-booknook", { visited: true, lastAt: d("2026-10-02") }),
      lib("s-samul", { saved: true, lastAt: d("2026-10-03") }),
      lib("s-private-only", { visited: true }),
      lib("e-personal", { personal: true }),
    ];
    const rows = publicSpaces(library, [
      pick("1", "booknook", { showPhotos: true, showMemo: true }),
      pick("2", "samul"),
      pick("3", "removed-from-archive"),
      pick("4", "demo-space", { isDemo: true }),
      pick("5", "draft-space", { status: "DRAFT" }),
    ]);
    expect(rows.map((r) => r.slug)).toEqual(["samul", "booknook"]);
    expect(rows.find((r) => r.slug === "booknook")).toMatchObject({ visited: true, showPhotos: true, showMemo: true, showVisitDate: false });
    expect(rows.some((r) => r.slug === "private-only")).toBe(false);
  });
});

describe("카드 사진", () => {
  it("사진 공개를 허용했을 때만 내 사진이 먼저, 아니면 공간 대표 사진", () => {
    expect(cardPhoto({ showPhotos: true }, ["mine.jpg"], "cover.jpg")).toEqual({ url: "mine.jpg", mine: true });
    expect(cardPhoto({ showPhotos: false }, ["mine.jpg"], "cover.jpg")).toEqual({ url: "cover.jpg", mine: false });
    expect(cardPhoto({ showPhotos: true }, [], "cover.jpg")).toEqual({ url: "cover.jpg", mine: false });
    expect(cardPhoto({ showPhotos: true }, [], null)).toEqual({ url: null, mine: false });
  });
  it("방문 시기는 KST 월까지만", () => {
    expect(visitMonth(d("2026-09-30T16:00:00Z"))).toBe("2026.10"); // KST 10/1 01:00
    expect(visitMonth(d("2026-09-12T00:00:00+09:00"))).toBe("2026.09");
    expect(visitMonth(null)).toBeNull();
  });
});

describe("관계 · 사람 찾기", () => {
  it("함께 좋아하는 공간은 상대가 공개한 공간 중 내 것만", () => {
    expect(commonSpaceIds(new Set(["booknook"]), [{ spaceId: "1", slug: "booknook" }, { spaceId: "2", slug: "samul" }])).toEqual(["1"]);
  });
  it("자기 자신·비공개·시연·없는 사용자는 따라갈 수 없다", () => {
    const target = { id: "b", profilePublic: true, isDemo: false };
    expect(canFollow("a", target).ok).toBe(true);
    expect(canFollow("b", target)).toMatchObject({ ok: false, status: 400 });
    expect(canFollow("a", { ...target, profilePublic: false })).toMatchObject({ ok: false, status: 404 });
    expect(canFollow("a", { ...target, isDemo: true }).ok).toBe(false);
    expect(canFollow("a", null).ok).toBe(false);
  });
  it("검색어는 2자 이상(빈 검색으로 사람 목록을 늘어놓지 않음)", () => {
    expect(peopleQuery(undefined)).toBeNull();
    expect(peopleQuery(" 동 ")).toBeNull();
    expect(peopleQuery("@dongmin")).toBe("dongmin");
  });
});
