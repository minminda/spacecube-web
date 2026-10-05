/* ── 공개 취향 프로필 데이터(서버 전용) ─────────────────────────────────────────
   새 저장소를 만들지 않는다: 공간 목록은 내 아카이브(getLibrary), 관계는 SavedTaste, 공간은 canonical EditorialSpace.
   화면에는 사진과 공간만 — 취향 태그·가중치는 추천 엔진에서만 쓰고 여기서는 조회하지도 않는다.
   공개 응답에는 비공개 공간 · 공개를 허용하지 않은 사진/메모/방문 시기를 아예 담지 않는다(조회 단계에서 제외). ── */

import { prisma } from "@/lib/prisma";
import { getLibrary } from "@/lib/archive/library";
import { getSpacesByIds } from "@/lib/editorial/queries";
import type { SpaceView } from "@/lib/editorial/types";
import { isAdmin } from "@/lib/admin";
import { avatarSeed } from "@/lib/people/avatar";
import { cardPhoto, commonSpaceIds, publicSpaces, rankPeopleSearch, visitMonth, type PublicSpaceRow } from "./publicProfile";

const PICK_SELECT = { spaceId: true, hidden: true, showPhotos: true, showMemo: true, showVisitDate: true } as const;

/** 이 사용자가 지금 공개 프로필에 보여주는 공간 — 아카이브의 canonical 공간 전부(기본 공개), 숨긴 공간 제외. */
export async function publicSpaceRows(userId: string): Promise<PublicSpaceRow[]> {
  const [library, picks] = await Promise.all([
    getLibrary(userId, { includeDemo: false }),
    prisma.profileSpace.findMany({ where: { userId }, select: PICK_SELECT }),
  ]);
  const slugs = library.filter((i) => !i.personal && !i.demo && i.key.startsWith("s-")).map((i) => i.key.slice(2));
  const spaces = slugs.length
    ? await prisma.editorialSpace.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true, status: true, isDemo: true } })
    : [];
  return publicSpaces(library, spaces, picks);
}

/** 공개를 허용한 공간의 내 사진 — showPhotos인 공간만 조회한다. */
async function allowedPhotos(userId: string, rows: PublicSpaceRow[], take?: number): Promise<Map<string, string[]>> {
  const ids = rows.filter((r) => r.showPhotos).map((r) => r.spaceId);
  if (ids.length === 0) return new Map();
  const entries = await prisma.archiveEntry.findMany({
    where: { userId, spaceId: { in: ids } },
    select: { spaceId: true, photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], ...(take ? { take } : {}), select: { url: true } } },
  });
  return new Map(entries.map((e) => [e.spaceId!, e.photos.map((p) => p.url)]));
}

export interface PublicSpaceCard {
  space: SpaceView;
  visited: boolean;
  /** 이 사람의 공개 사진 우선, 없으면 공간 대표 사진 */
  photo: string | null;
  photoIsMine: boolean;
}

async function cardsFor(userId: string, rows: PublicSpaceRow[]): Promise<PublicSpaceCard[]> {
  const [views, photos] = await Promise.all([getSpacesByIds(rows.map((r) => r.spaceId)), allowedPhotos(userId, rows, 1)]);
  return rows.flatMap((r) => {
    const view = views.get(r.spaceId);
    if (!view) return [];
    const p = cardPhoto(r, photos.get(r.spaceId) ?? [], view.coverImage);
    return [{ space: view, visited: r.visited, photo: p.url, photoIsMine: p.mine }];
  });
}

const PROFILE_USER_SELECT = {
  id: true, nickname: true, image: true, isDemo: true, profilePublic: true, profileHandle: true, profileBio: true,
} as const;

type ProfileUser = { id: string; nickname: string | null; image: string | null; isDemo: boolean; profilePublic: boolean; profileHandle: string | null; profileBio: string | null };

/** 공개로 볼 수 있는 사용자인지(본인은 비공개여도 미리보기 가능). 더미 계정은 includeDemo(관리자 · 로컬 개발)일 때만. */
async function findViewable(handle: string, viewerId: string | null, includeDemo = false): Promise<ProfileUser | null> {
  const user = await prisma.user.findUnique({ where: { profileHandle: handle }, select: PROFILE_USER_SELECT });
  if (!user || (user.isDemo && !includeDemo) || !user.profileHandle) return null;
  if (!user.profilePublic && user.id !== viewerId) return null;
  return user;
}

const displayName = (u: { nickname: string | null; profileHandle: string | null }) => u.nickname || `@${u.profileHandle}`;

export interface PrivateProfileStub {
  handle: string;
  name: string;
  avatarSeed: string;
}

/**
 * 비공개 프로필의 최소 정보 — 주소(/@handle)는 비공개여도 열리고 "비공개 아카이브입니다."만 보인다.
 * 이름 · 아바타 seed만 돌려준다(공간 · 사진 · 소개 · 기록 · 관계 수는 조회하지도 않는다). 공개 프로필이면 null.
 */
export async function getPrivateProfileStub(handle: string, opts: { includeDemo?: boolean } = {}): Promise<PrivateProfileStub | null> {
  const user = await prisma.user.findUnique({ where: { profileHandle: handle }, select: { id: true, nickname: true, isDemo: true, profilePublic: true, profileHandle: true } });
  if (!user || !user.profileHandle || user.profilePublic || (user.isDemo && !opts.includeDemo)) return null;
  return { handle: user.profileHandle, name: displayName(user), avatarSeed: avatarSeed(user.id) };
}

export interface PublicProfile {
  userId: string;
  handle: string;
  name: string;
  image: string | null;
  bio: string | null;
  visited: PublicSpaceCard[];
  wantToGo: PublicSpaceCard[];
  /** 관계 수 — 작은 보조 문구로만 표시(인기 경쟁처럼 보이지 않게) */
  followingCount: number;
  followerCount: number;
  /** 공개된 큐레이터 프로필이 있으면 그 주소(큐레이터 = 같은 사용자의 추가 역할) */
  curatorSlug: string | null;
  isPublic: boolean;
}

/** handle로 공개 프로필 조회. 비공개면 null — 단 본인은 비공개 상태로도 미리 볼 수 있다. 시연 계정은 공개 화면에 없음(includeDemo 제외). */
export async function getPublicProfile(handle: string, viewerId: string | null, opts: { curators: boolean; includeDemo?: boolean }): Promise<PublicProfile | null> {
  const user = await findViewable(handle, viewerId, opts.includeDemo);
  if (!user) return null;
  const [rows, counts, cp] = await Promise.all([
    publicSpaceRows(user.id),
    relationCounts([user.id]),
    opts.curators ? prisma.curatorProfile.findUnique({ where: { userId: user.id }, select: { slug: true, status: true, isDemo: true } }) : Promise.resolve(null),
  ]);
  const cards = await cardsFor(user.id, rows);
  return {
    userId: user.id, handle: user.profileHandle!, name: displayName(user), image: user.image, bio: user.profileBio,
    visited: cards.filter((c) => c.visited), wantToGo: cards.filter((c) => !c.visited),
    followingCount: counts.get(user.id)!.following, followerCount: counts.get(user.id)!.followers,
    curatorSlug: cp && cp.status === "PUBLISHED" && !cp.isDemo ? cp.slug : null,
    isPublic: user.profilePublic,
  };
}

/** 보는 사람 기준 정보 — 따라가는 중인지 · 함께 좋아하는 공간 · 내 저장 상태. */
export async function viewerContext(viewerId: string | null, p: { userId: string; visited: PublicSpaceCard[]; wantToGo: PublicSpaceCard[] }) {
  if (!viewerId) return { following: false, common: [] as string[], savedIds: new Set<string>() };
  const [follow, library, saved] = await Promise.all([
    viewerId === p.userId ? Promise.resolve(null) : prisma.savedTaste.findUnique({ where: { userId_targetUserId: { userId: viewerId, targetUserId: p.userId } }, select: { id: true } }),
    viewerId === p.userId ? Promise.resolve([]) : getLibrary(viewerId, { includeDemo: false }),
    prisma.savedEditorialSpace.findMany({ where: { userId: viewerId }, select: { spaceId: true } }),
  ]);
  const mySlugs = new Set(library.filter((i) => !i.personal).map((i) => i.key.slice(2)));
  const targetPublic = [...p.visited, ...p.wantToGo].map((c) => ({ spaceId: c.space.id, slug: c.space.slug }));
  return { following: !!follow, common: commonSpaceIds(mySlugs, targetPublic), savedIds: new Set(saved.map((s) => s.spaceId)) };
}

export interface PublicRecord {
  profile: { userId: string; handle: string; name: string };
  space: SpaceView;
  visited: boolean;
  /** 공개를 허용한 경우에만 채워진다 */
  photos: string[];
  memo: string | null;
  month: string | null;
}

/** 공개 기록 상세(/@handle/s/[slug]) — 공간과 사진 중심, 메모·방문 시기는 각각 허용했을 때만. */
export async function getPublicRecord(handle: string, slug: string, viewerId: string | null, opts: { includeDemo?: boolean } = {}): Promise<PublicRecord | null> {
  const user = await findViewable(handle, viewerId, opts.includeDemo);
  if (!user) return null;
  const row = (await publicSpaceRows(user.id)).find((r) => r.slug === slug);
  if (!row) return null;
  const [views, photos, entry] = await Promise.all([
    getSpacesByIds([row.spaceId]),
    allowedPhotos(user.id, [row]),
    row.showMemo || row.showVisitDate
      ? prisma.archiveEntry.findFirst({
          where: { userId: user.id, spaceId: row.spaceId },
          select: { memo: true, visits: { where: { visitedOn: { not: null } }, orderBy: { visitedOn: "desc" }, take: 1, select: { visitedOn: true } } },
        })
      : Promise.resolve(null),
  ]);
  const space = views.get(row.spaceId);
  if (!space) return null;
  return {
    profile: { userId: user.id, handle: user.profileHandle!, name: displayName(user) },
    space,
    visited: row.visited,
    photos: photos.get(row.spaceId) ?? [],
    memo: row.showMemo ? entry?.memo ?? null : null,
    month: row.showVisitDate ? visitMonth(entry?.visits[0]?.visitedOn ?? null) : null,
  };
}

export interface PersonCard {
  userId: string;
  handle: string;
  name: string;
  image: string | null;
  bio: string | null;
  /** 최근 공개 공간 사진 몇 장(그 사람의 공개 사진 우선) — 태그 대신 사진으로 취향을 느끼게 */
  photos: { url: string | null; name: string }[];
  /** 더미 계정(관리자 · 로컬 미리보기에서만 섞인다) */
  demo: boolean;
}

async function personCards(users: ProfileUser[], photoCount = 3): Promise<PersonCard[]> {
  return Promise.all(
    users.map(async (u) => {
      const rows = photoCount > 0 ? (await publicSpaceRows(u.id)).slice(0, photoCount) : [];
      const cards = await cardsFor(u.id, rows);
      return {
        userId: u.id, handle: u.profileHandle!, name: displayName(u), image: u.image, bio: u.profileBio,
        photos: cards.map((c) => ({ url: c.photo, name: c.space.name })),
        demo: u.isDemo,
      };
    }),
  );
}

/**
 * 사람 찾기 — 공개 프로필만, 주소(@아이디) · 닉네임으로. 인기순·추천 없음.
 * 순서: 주소 정확히 → 닉네임 정확히 → 주소 일부 → 닉네임 일부(rankPeopleSearch). 넉넉히 찾은 뒤 순서를 매겨 자른다.
 * 추천 > 사람 탭의 검색이 이 함수를 그대로 쓴다(photos: 0 — 아바타 · 이름 카드라 사진 조회 생략).
 * 더미 계정은 includeDemo(관리자 · 로컬 개발)일 때만.
 */
export async function searchPeople(q: string, viewerId: string | null, opts: { includeDemo?: boolean; photos?: number } = {}): Promise<{ people: PersonCard[]; following: Set<string> }> {
  const users = await prisma.user.findMany({
    where: {
      profilePublic: true, profileHandle: { not: null },
      ...(opts.includeDemo ? {} : { isDemo: false }),
      // 추천 > 사람과 같은 기준: 테스트 픽스처 제외(이메일 없는 카카오 사용자는 남긴다). 관리자는 아래에서 뺀다.
      AND: [{ OR: [{ email: null }, { NOT: { email: { endsWith: "@example.test" } } }] }],
      OR: [{ nickname: { contains: q, mode: "insensitive" } }, { profileHandle: { contains: q.toLowerCase() } }],
    },
    select: { ...PROFILE_USER_SELECT, email: true },
    orderBy: [{ nickname: "asc" }, { profileHandle: "asc" }],
    take: 100,
  }).then((rows) => rankPeopleSearch(q, rows.filter((u) => !isAdmin(u.email))).slice(0, 20)); // 이메일은 판별에만 — personCards가 새 객체를 만들어 밖으로 나가지 않는다
  const [people, follows] = await Promise.all([
    personCards(users, opts.photos ?? 3),
    viewerId ? prisma.savedTaste.findMany({ where: { userId: viewerId, targetUserId: { in: users.map((u) => u.id) } }, select: { targetUserId: true } }) : Promise.resolve([]),
  ]);
  return { people, following: new Set(follows.map((f) => f.targetUserId)) };
}

/**
 * 관계 목록 — following: 이 사람이 따라가는 취향 / followers: 이 사람을 따라가는 사람.
 * 공개 프로필인 사람만 카드로 보여주고, 나머지는 수만(비공개 사용자를 드러내지 않음).
 */
export async function relationList(userId: string, kind: "following" | "followers", viewerId: string | null) {
  const rows = await prisma.savedTaste.findMany({
    where: kind === "following" ? { userId } : { targetUserId: userId },
    orderBy: { savedAt: "desc" },
    select: { user: { select: PROFILE_USER_SELECT }, target: { select: PROFILE_USER_SELECT } },
  });
  const users = rows.map((r) => (kind === "following" ? r.target : r.user));
  const visible = users.filter((u) => u.profilePublic && !!u.profileHandle && !u.isDemo);
  const [people, follows] = await Promise.all([
    personCards(visible),
    viewerId ? prisma.savedTaste.findMany({ where: { userId: viewerId, targetUserId: { in: visible.map((u) => u.id) } }, select: { targetUserId: true } }) : Promise.resolve([]),
  ]);
  return { people, hidden: users.length - visible.length, following: new Set(follows.map((f) => f.targetUserId)) };
}

/**
 * 관계 수 — 따라가는 취향(내가 따라가는 사람 수) · 나를 따라가는 사람(나를 따라가는 사람 수). 공개 프로필 숫자와 같은 기준(SavedTaste 그대로).
 * 자기 자신 따라가기는 API가 막고(canFollow), 중복은 (userId, targetUserId) unique라 생기지 않는다.
 */
export async function relationCounts(userIds: string[]): Promise<Map<string, { following: number; followers: number }>> {
  const out = new Map(userIds.map((id) => [id, { following: 0, followers: 0 }]));
  if (userIds.length === 0) return out;
  const [following, followers] = await Promise.all([
    prisma.savedTaste.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _count: { _all: true } }),
    prisma.savedTaste.groupBy({ by: ["targetUserId"], where: { targetUserId: { in: userIds } }, _count: { _all: true } }),
  ]);
  for (const r of following) out.get(r.userId)!.following = r._count._all;
  for (const r of followers) out.get(r.targetUserId)!.followers = r._count._all;
  return out;
}
