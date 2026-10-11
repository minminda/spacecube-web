import { beforeEach, describe, expect, it, vi } from "vitest";

/* HOME의 "나와 비슷한 사람들이 좋아한 공간" — DB · 아카이브 조회를 가짜로 바꿔 규칙만 확인한다. */
const db = vi.hoisted(() => ({
  users: [] as { id: string; email: string | null; nickname: string | null; image: null; profileHandle: string | null; isDemo: boolean }[],
  follows: [] as { targetUserId: string }[],
  mine: [] as { key: string; visited: boolean; saved: boolean }[],
  theirs: {} as Record<string, { slug: string; visited: boolean }[]>,
  fail: false,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: async () => { if (db.fail) throw new Error("db down"); return db.users; } },
    savedTaste: { findMany: async () => db.follows },
    editorialSpace: { findMany: async () => [] },
  },
}));
vi.mock("@/lib/admin", () => ({ isAdmin: (email?: string | null) => email === "admin@x.test" }));
vi.mock("@/lib/archive/library", () => ({
  getLibrary: async () => db.mine.map((m) => ({ ...m, personal: false, demo: false })),
}));
vi.mock("@/lib/profile/profileData", () => ({
  publicSpaceRows: async (userId: string) => db.theirs[userId] ?? [],
  relationCounts: async () => new Map(),
  searchPeople: async () => ({ people: [] }),
}));

import { similarPeopleForHome } from "./peopleData";

const user = (id: string, extra: Partial<(typeof db.users)[number]> = {}) => ({ id, email: null, nickname: `닉${id}`, image: null, profileHandle: `h-${id}`, isDemo: false, ...extra });

beforeEach(() => {
  db.fail = false;
  db.follows = [];
  // 나: a를 다녀왔고 b를 저장
  db.mine = [{ key: "s-a", visited: true, saved: false }, { key: "s-b", visited: false, saved: true }];
  db.users = [user("p1"), user("p2"), user("p3"), user("adm", { email: "admin@x.test" })];
  db.theirs = {
    p1: [{ slug: "a", visited: true }, { slug: "c", visited: true }, { slug: "d", visited: false }], // a를 같이 다녀옴 → 비슷한 사람
    p2: [{ slug: "e", visited: true }], // 겹치는 공간 없음 → 비슷하지 않음
    p3: [{ slug: "a", visited: false }, { slug: "b", visited: false }, { slug: "d", visited: false }, { slug: "f", visited: true }], // a · b 둘 다 나와 겹침(2곳 이상) → 비슷한 사람
    adm: [{ slug: "a", visited: true }, { slug: "z", visited: true }], // 관리자 — 제외
  };
});

describe("similarPeopleForHome", () => {
  it("비슷한 사람이 고른 공간 중 내가 이미 저장 · 다녀온 곳은 빼고 보여준다", async () => {
    const r = await similarPeopleForHome("me", { includeDemo: false });
    const slugs = r.spaces.map((s) => s.slug);
    expect(slugs).not.toContain("a"); // 내가 다녀온 곳
    expect(slugs).not.toContain("b"); // 내가 저장한 곳
    expect(slugs).toEqual(expect.arrayContaining(["c", "d", "f"]));
    expect(slugs).not.toContain("z"); // 관리자 계정이 고른 공간은 쓰지 않는다
  });

  it("누군가 직접 다녀온 공간은 visited, 저장만 한 공간은 아니다", async () => {
    const r = await similarPeopleForHome("me", { includeDemo: false });
    expect(r.spaces.find((s) => s.slug === "c")?.visited).toBe(true);
    expect(r.spaces.find((s) => s.slug === "d")?.visited).toBe(false);
  });

  it("겹치는 공간이 없는 사람 · 관리자는 사람 목록에도 없다 (이름 · 아바타 seed만 내보낸다)", async () => {
    const r = await similarPeopleForHome("me", { includeDemo: false });
    expect(r.people.map((p) => p.handle).sort()).toEqual(["h-p1", "h-p3"]);
    expect(Object.keys(r.people[0]).sort()).toEqual(["avatarSeed", "handle", "image", "name"]);
    expect(r.people.every((p) => p.avatarSeed !== "p1" && p.avatarSeed !== "p3")).toBe(true); // 내부 사용자 id가 아니라 해시
  });

  it("비로그인 · 취향 기록이 없는 사용자는 빈 결과", async () => {
    expect(await similarPeopleForHome(null, { includeDemo: false })).toEqual({ people: [], spaces: [] });
    db.mine = [];
    expect(await similarPeopleForHome("me", { includeDemo: false })).toEqual({ people: [], spaces: [] });
  });

  it("조회가 실패해도 던지지 않고 빈 결과(HOME을 막지 않는다)", async () => {
    db.fail = true;
    await expect(similarPeopleForHome("me", { includeDemo: false })).resolves.toEqual({ people: [], spaces: [] });
  });
});
