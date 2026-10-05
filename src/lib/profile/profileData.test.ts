import { beforeEach, describe, expect, it, vi } from "vitest";

/* 공개 프로필 조회 — prisma · 아카이브 · 공간 조회를 가짜로 바꿔 "기본 공개" 규칙을 확인한다. */
const db = vi.hoisted(() => ({
  users: [] as { id: string; nickname: string | null; image: null; isDemo: boolean; profilePublic: boolean; profileHandle: string | null; profileBio: null; email?: string | null }[],
  picks: [] as { userId: string; spaceId: string; hidden: boolean; showPhotos: boolean; showMemo: boolean; showVisitDate: boolean }[],
  follows: [] as { userId: string; targetUserId: string }[],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { profileHandle: string } }) => db.users.find((u) => u.profileHandle === where.profileHandle) ?? null,
      findMany: async () => db.users.filter((u) => u.profilePublic && u.profileHandle && !u.isDemo),
    },
    profileSpace: { findMany: async ({ where }: { where: { userId: string } }) => db.picks.filter((p) => p.userId === where.userId) },
    editorialSpace: {
      findMany: async ({ where }: { where: { slug: { in: string[] } } }) =>
        where.slug.in.map((slug) => ({ id: `id-${slug}`, slug, status: slug.startsWith("draft") ? "DRAFT" : "PUBLISHED", isDemo: false })),
    },
    archiveEntry: { findMany: async () => [] },
    savedTaste: {
      groupBy: async ({ by, where }: { by: string[]; where: Record<string, { in: string[] }> }) => {
        const key = by[0] as "userId" | "targetUserId";
        const ids = where[key].in;
        return ids
          .map((id) => ({ [key]: id, _count: { _all: db.follows.filter((f) => f[key] === id).length } }))
          .filter((r) => r._count._all > 0);
      },
      findMany: async () => [],
    },
    curatorProfile: { findUnique: async () => null },
  },
}));

vi.mock("@/lib/archive/library", () => ({
  getLibrary: async (userId: string) =>
    userId === "u1"
      ? [
          { key: "s-booknook", visited: true, saved: false, personal: false, demo: false, lastAt: new Date("2026-10-02") },
          { key: "s-samul", visited: false, saved: true, personal: false, demo: false, lastAt: new Date("2026-10-03") },
          { key: "e-mine", visited: true, saved: false, personal: true, demo: false, lastAt: new Date("2026-10-04") },
        ]
      : [],
}));

vi.mock("@/lib/editorial/queries", () => ({
  getSpacesByIds: async (ids: string[]) => new Map(ids.map((id) => [id, { id, slug: id.slice(3), name: id.slice(3), coverImage: `${id}.jpg` }])),
}));

import { getPrivateProfileStub, getPublicProfile, searchPeople } from "./profileData";

beforeEach(() => {
  db.users = [
    { id: "u1", nickname: "동민", image: null, isDemo: false, profilePublic: true, profileHandle: "unq66c6i", profileBio: null },
    { id: "u2", nickname: "하린", image: null, isDemo: false, profilePublic: false, profileHandle: "harin", profileBio: null },
  ];
  db.picks = [];
  db.follows = [{ userId: "u2", targetUserId: "u1" }];
});

describe("공개 프로필 아카이브", () => {
  it("공개 프로필은 공간 설정이 하나도 없어도 아카이브 공간이 보인다(비로그인)", async () => {
    const p = await getPublicProfile("unq66c6i", null, { curators: false });
    expect(p?.visited.map((c) => c.space.slug)).toEqual(["booknook"]);
    expect(p?.wantToGo.map((c) => c.space.slug)).toEqual(["samul"]);
    // 개인 기록은 공개 프로필에 나오지 않는다
    expect([...p!.visited, ...p!.wantToGo].some((c) => c.space.slug === "mine")).toBe(false);
  });

  it("본인으로 봐도 같은 공간이 보인다", async () => {
    const anon = await getPublicProfile("unq66c6i", null, { curators: false });
    const self = await getPublicProfile("unq66c6i", "u1", { curators: false });
    expect(self?.visited.map((c) => c.space.id)).toEqual(anon?.visited.map((c) => c.space.id));
    expect(self?.wantToGo.map((c) => c.space.id)).toEqual(anon?.wantToGo.map((c) => c.space.id));
  });

  it("숨긴 공간만 빠진다", async () => {
    db.picks = [{ userId: "u1", spaceId: "id-samul", hidden: true, showPhotos: false, showMemo: false, showVisitDate: false }];
    const p = await getPublicProfile("unq66c6i", null, { curators: false });
    expect(p?.wantToGo).toEqual([]);
    expect(p?.visited.length).toBe(1);
  });

  it("비공개 프로필은 다른 사람에게 내용 없이 이름만(stub)", async () => {
    db.users[0].profilePublic = false;
    expect(await getPublicProfile("unq66c6i", null, { curators: false })).toBeNull();
    expect(await getPublicProfile("unq66c6i", "u2", { curators: false })).toBeNull();
    const stub = await getPrivateProfileStub("unq66c6i");
    expect(stub).toEqual({ handle: "unq66c6i", name: "동민", avatarSeed: expect.any(String) });
    expect(Object.keys(stub!)).not.toContain("visited");
  });

  it("관계 수는 실제 따라가기 관계와 같다", async () => {
    const p = await getPublicProfile("unq66c6i", null, { curators: false });
    expect(p).toMatchObject({ followingCount: 0, followerCount: 1 });
  });
});

describe("사람 검색", () => {
  beforeEach(() => {
    db.users.push(
      { id: "u3", nickname: "unq66c6i 팬", image: null, isDemo: false, profilePublic: true, profileHandle: "fanclub", profileBio: null },
      { id: "u4", nickname: "동민이", image: null, isDemo: false, profilePublic: true, profileHandle: "aaa", profileBio: null },
    );
  });
  it("@아이디 · 아이디 · 닉네임 모두 찾고, 정확히 일치하는 사람이 먼저", async () => {
    expect((await searchPeople("unq66c6i", null, { photos: 0 })).people.map((p) => p.handle)).toEqual(["unq66c6i", "fanclub"]);
    expect((await searchPeople("동민", null, { photos: 0 })).people.map((p) => p.handle)).toEqual(["unq66c6i", "aaa"]);
  });
  it("비공개 프로필은 검색에 나오지 않는다", async () => {
    expect((await searchPeople("하린", null, { photos: 0 })).people).toEqual([]);
  });
});
