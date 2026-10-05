/* ── 추천 > 사람(서버 전용) ────────────────────────────────────────────────────
   별도의 큐레이터 개념 없이, 공개 프로필을 켠 일반 사용자 누구나 대상이다 — 고른 공간이 곧 그 사람의 취향.
   비교에는 상대가 공개 프로필에 실제로 보여주는 공간만 쓴다(publicSpaceRows: ProfileSpace ∩ 현재 아카이브 ∩ 발행).
   비공개 공간 · 메모 · 개인 사진 · 방문 날짜는 조회하지도 않는다. 응답에는 이메일 · 역할 · 점수를 담지 않는다.
   제외: 나 자신 · 이미 따라가는 사람 · 비공개 프로필 · 관리자 계정 · 테스트 픽스처(@example.test) · 공개 공간 0곳 ·
   더미 계정(User.isDemo — 관리자 · 로컬 개발 미리보기에서만 포함). ── */

import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getLibrary } from "@/lib/archive/library";
import { publicSpaceRows } from "@/lib/profile/profileData";
import { PEOPLE_REASON_TEXT, rankPeople, type PersonCandidate, type SpaceFeatures, type ViewerTaste } from "./rankPeople";

/** 후보 상한 — 사람이 많아지면 최근 가입 순으로 자른다(V1). */
const CANDIDATE_LIMIT = 200;

export interface RecommendedPerson {
  userId: string;
  handle: string;
  name: string;
  image: string | null;
  /** "다녀온 공간이 비슷해요" 등 — 없으면 null. 점수 · 퍼센트는 내보내지 않는다. */
  reason: string | null;
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

export async function recommendPeople(viewerId: string | null, opts: { includeDemo: boolean; limit?: number }): Promise<RecommendedPerson[]> {
  const [users, follows, features, taste] = await Promise.all([
    prisma.user.findMany({
      where: {
        profilePublic: true,
        profileHandle: { not: null },
        ...(opts.includeDemo ? {} : { isDemo: false }),
        ...(viewerId ? { id: { not: viewerId } } : {}),
        // 이메일 없는 카카오 사용자는 남겨야 한다(NOT endsWith만 쓰면 NULL 행까지 빠진다)
        OR: [{ email: null }, { NOT: { email: { endsWith: "@example.test" } } }],
      },
      select: { id: true, email: true, nickname: true, image: true, profileHandle: true, isDemo: true },
      orderBy: { id: "desc" }, // cuid — 대략 최근 가입 순
      take: CANDIDATE_LIMIT,
    }),
    viewerId ? prisma.savedTaste.findMany({ where: { userId: viewerId }, select: { targetUserId: true } }) : Promise.resolve([]),
    spaceFeatures(),
    viewerTaste(viewerId),
  ]);
  const followed = new Set(follows.map((f) => f.targetUserId));
  const eligible = users.filter((u) => !followed.has(u.id) && !isAdmin(u.email));

  const candidates: PersonCandidate[] = await Promise.all(
    eligible.map(async (u) => ({
      userId: u.id,
      handle: u.profileHandle!,
      spaces: (await publicSpaceRows(u.id)).map((r) => ({ slug: r.slug, visited: r.visited })),
    })),
  );

  const byId = new Map(eligible.map((u) => [u.id, u]));
  return rankPeople(taste, candidates, features)
    .slice(0, opts.limit ?? 48)
    .map((r) => {
      const u = byId.get(r.userId)!;
      return {
        userId: u.id,
        handle: u.profileHandle!,
        name: u.nickname || `@${u.profileHandle}`,
        image: u.image,
        reason: r.reason ? PEOPLE_REASON_TEXT[r.reason] : null,
        demo: u.isDemo,
      };
    });
}
