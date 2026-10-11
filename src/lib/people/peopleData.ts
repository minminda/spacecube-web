/* ── 추천 > 사람(서버 전용) ────────────────────────────────────────────────────
   별도의 큐레이터 개념 없이, 공개 프로필을 켠 일반 사용자 누구나 대상이다 — 고른 공간이 곧 그 사람의 취향.
   비교에는 상대가 공개 프로필에 실제로 보여주는 공간만 쓴다(publicSpaceRows: 현재 아카이브 ∩ 발행 실공간 − 숨긴 공간).
   비공개 공간 · 메모 · 개인 사진 · 방문 날짜는 조회하지도 않는다. 응답에는 이메일 · 역할 · 점수를 담지 않는다.
   제외: 나 자신 · 이미 따라가는 사람 · 비공개 프로필 · 관리자 계정 · 테스트 픽스처(@example.test) · 공개 공간 0곳 ·
   더미 계정(User.isDemo — 관리자 · 로컬 개발 미리보기에서만 포함). ── */

import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getLibrary } from "@/lib/archive/library";
import { publicSpaceRowsMany, relationCounts, searchPeople } from "@/lib/profile/profileData";
import { peopleQuery } from "@/lib/profile/publicProfile";
import { avatarSeed } from "./avatar";
import { PEOPLE_REASON_TEXT, rankPeople, type PersonCandidate, type SpaceFeatures, type ViewerTaste } from "./rankPeople";

/** 후보 상한 — 사람이 많아지면 최근 가입 순으로 자른다(V1). */
const CANDIDATE_LIMIT = 200;

export interface RecommendedPerson {
  /** 아바타 seed(내부 사용자 id가 아니다 — lib/people/avatar.ts avatarSeed) */
  avatarSeed: string;
  handle: string;
  name: string;
  image: string | null;
  /** "다녀온 공간이 비슷해요" 등 — 없으면 null. 점수 · 퍼센트는 내보내지 않는다(카드에는 표시하지 않음 — 4열에서 복잡해서). */
  reason: string | null;
  /** 따라가는 취향 수 · 나를 따라가는 사람 수 — 공개 프로필과 같은 숫자 */
  followingCount: number;
  followerCount: number;
  /** 더미 계정(관리자 · 로컬 미리보기에서만 섞여 나온다 — 화면에 미리보기 안내를 띄우는 데만 쓴다) */
  demo: boolean;
}

async function viewerTaste(viewerId: string | null): Promise<ViewerTaste | null> {
  if (!viewerId) return null;
  const library = await getLibrary(viewerId, { includeDemo: false });
  const visited = new Set<string>(), saved = new Set<string>();
  for (const it of library) {
    if (it.personal || it.demo) continue;
    const slug = it.key.slice(2);
    if (it.visited) visited.add(slug);
    else if (it.saved) saved.add(slug);
  }
  return visited.size + saved.size > 0 ? { visited, saved } : null;
}

async function spaceFeatures(): Promise<SpaceFeatures> {
  const rows = await prisma.editorialSpace.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, category: true, tags: true } });
  return new Map(rows.map((r) => [r.slug, [r.category, ...r.tags].filter(Boolean)]));
}

interface LoadedPeople {
  ranked: ReturnType<typeof rankPeople>;
  byId: Map<string, { id: string; nickname: string | null; image: string | null; profileHandle: string | null; isDemo: boolean }>;
  spacesByUser: Map<string, PersonCandidate["spaces"]>;
  taste: ViewerTaste | null;
}

/**
 * 후보 사용자를 불러 취향 가까운 순으로 정렬한다(추천 > 사람 · HOME이 함께 쓴다 — 규칙은 rankPeople 하나).
 * activeOnly: 저장 · 아카이브 · 방문 기록이 하나라도 있는 사람만 후보로(공개 공간이 하나도 없는 사람을 하나씩 조회하지 않게 — HOME용).
 */
async function loadRankedPeople(viewerId: string | null, opts: { includeDemo: boolean; candidateLimit: number; activeOnly?: boolean }): Promise<LoadedPeople> {
  const [users, follows, features, taste] = await Promise.all([
    prisma.user.findMany({
      where: {
        profilePublic: true,
        profileHandle: { not: null },
        ...(opts.includeDemo ? {} : { isDemo: false }),
        ...(viewerId ? { id: { not: viewerId } } : {}),
        AND: [
          // 이메일 없는 카카오 사용자는 남겨야 한다(NOT endsWith만 쓰면 NULL 행까지 빠진다)
          { OR: [{ email: null }, { NOT: { email: { endsWith: "@example.test" } } }] },
          ...(opts.activeOnly ? [{ OR: [{ savedEditorialSpaces: { some: {} } }, { archiveEntries: { some: {} } }, { records: { some: {} } }] }] : []),
        ],
      },
      select: { id: true, email: true, nickname: true, image: true, profileHandle: true, isDemo: true },
      orderBy: { id: "desc" }, // cuid — 대략 최근 가입 순
      take: opts.candidateLimit,
    }),
    viewerId ? prisma.savedTaste.findMany({ where: { userId: viewerId }, select: { targetUserId: true } }) : Promise.resolve([]),
    spaceFeatures(),
    viewerTaste(viewerId),
  ]);
  const followed = new Set(follows.map((f) => f.targetUserId));
  const eligible = users.filter((u) => !followed.has(u.id) && !isAdmin(u.email));

  // 후보 전원의 공개 공간을 한 번에 가져온다(후보마다 조회하면 쿼리가 후보 수의 6배가 된다)
  const rowsByUser = await publicSpaceRowsMany(eligible.map((u) => u.id));
  const spacesByUser = new Map<string, PersonCandidate["spaces"]>();
  const candidates: PersonCandidate[] = eligible.map((u) => {
    const spaces = (rowsByUser.get(u.id) ?? []).map((r) => ({ slug: r.slug, visited: r.visited }));
    spacesByUser.set(u.id, spaces);
    return { userId: u.id, handle: u.profileHandle!, spaces };
  });

  return { ranked: rankPeople(taste, candidates, features), byId: new Map(eligible.map((u) => [u.id, u])), spacesByUser, taste };
}

export async function recommendPeople(viewerId: string | null, opts: { includeDemo: boolean; limit?: number }): Promise<RecommendedPerson[]> {
  const { ranked: all, byId } = await loadRankedPeople(viewerId, { includeDemo: opts.includeDemo, candidateLimit: CANDIDATE_LIMIT });
  const ranked = all.slice(0, opts.limit ?? 48);
  const counts = await relationCounts(ranked.map((r) => r.userId));
  return ranked.map((r) => {
    const u = byId.get(r.userId)!;
    const c = counts.get(r.userId)!;
    return {
      avatarSeed: avatarSeed(u.id),
      handle: u.profileHandle!,
      name: u.nickname || `@${u.profileHandle}`,
      image: u.image,
      reason: r.reason ? PEOPLE_REASON_TEXT[r.reason] : null,
      followingCount: c.following,
      followerCount: c.followers,
      demo: u.isDemo,
    };
  });
}

/** HOME에서 쓰는 "취향이 비슷한 사람" 한 명 — 이름 · 아바타만(관계 수 · 소개는 내보내지 않는다) */
export interface SimilarPerson {
  avatarSeed: string;
  handle: string;
  name: string;
  image: string | null;
}

/** 비슷한 취향의 사람들이 고른 공간 — 내가 이미 저장 · 다녀온 곳은 뺀다 */
export interface SimilarSpace {
  slug: string;
  /** 비슷한 취향의 사람 중 누군가 직접 다녀온 곳(아니면 저장해 둔 곳) */
  visited: boolean;
}

const HOME_CANDIDATE_LIMIT = 40;
const SIMILAR_SOURCE_PEOPLE = 8;

/**
 * HOME용 — 나와 취향이 비슷한 사람(rankPeople에서 이유가 있는 사람만)과, 그 사람들이 공개한 공간 중 내가 아직 안 가본 곳.
 * 사람 자체보다 "그 사람들이 좋아한 공간"을 먼저 보여주려는 것 — 공간 선반은 누구의 선택인지 드러내지 않는다.
 * 취향 기록이 없는 사용자 · 비로그인 · 후보가 없을 때는 빈 결과. 어떤 오류도 HOME을 막지 않는다(빈 결과로 돌아간다).
 * 공개 프로필 · 공개 공간만 쓰고 관리자 · 테스트 계정 · (운영의) 더미 계정은 제외 — 추천 > 사람과 같은 기준.
 */
export async function similarPeopleForHome(viewerId: string | null, opts: { includeDemo: boolean; peopleLimit?: number; spaceLimit?: number }): Promise<{ people: SimilarPerson[]; spaces: SimilarSpace[] }> {
  const empty = { people: [], spaces: [] };
  if (!viewerId) return empty;
  try {
    const { ranked, byId, spacesByUser, taste } = await loadRankedPeople(viewerId, { includeDemo: opts.includeDemo, candidateLimit: HOME_CANDIDATE_LIMIT, activeOnly: true });
    if (!taste) return empty;
    const similar = ranked.filter((r) => r.reason !== null).slice(0, SIMILAR_SOURCE_PEOPLE);
    if (similar.length === 0) return empty;

    const mine = new Set([...taste.visited, ...taste.saved]);
    const bySlug = new Map<string, { score: number; visited: boolean }>();
    for (const r of similar) {
      for (const sp of spacesByUser.get(r.userId) ?? []) {
        if (mine.has(sp.slug)) continue;
        const cur = bySlug.get(sp.slug) ?? { score: 0, visited: false };
        cur.score += r.score;
        cur.visited = cur.visited || sp.visited;
        bySlug.set(sp.slug, cur);
      }
    }
    const spaces = [...bySlug]
      .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))
      .slice(0, opts.spaceLimit ?? 12)
      .map(([slug, v]) => ({ slug, visited: v.visited }));

    const people = similar.slice(0, opts.peopleLimit ?? 6).map((r) => {
      const u = byId.get(r.userId)!;
      return { avatarSeed: avatarSeed(u.id), handle: u.profileHandle!, name: u.nickname || `@${u.profileHandle}`, image: u.image };
    });
    return { people, spaces };
  } catch {
    return empty;
  }
}

/**
 * 추천 > 사람 탭의 검색(@아이디 · 닉네임) — 기존 사람 찾기(searchPeople)를 그대로 쓰고 같은 카드 모양으로만 바꾼다.
 * 검색어가 2자 미만이면 null(= 추천을 보여준다).
 */
export async function searchPeopleTiles(raw: string | undefined, viewerId: string | null, opts: { includeDemo: boolean }): Promise<RecommendedPerson[] | null> {
  const q = peopleQuery(raw);
  if (!q) return null;
  const { people } = await searchPeople(q, viewerId, { includeDemo: opts.includeDemo, photos: 0 });
  const counts = await relationCounts(people.map((p) => p.userId));
  return people.map((p) => {
    const c = counts.get(p.userId)!;
    return { avatarSeed: avatarSeed(p.userId), handle: p.handle, name: p.name, image: p.image, reason: null, followingCount: c.following, followerCount: c.followers, demo: p.demo };
  });
}
