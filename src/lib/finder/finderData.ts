/* ── 공간 찾기 데이터 조립(서버 전용) ─────────────────────────────────────────
   후보 Pool = 발행된 공개 공간 전부(가상 공간은 큐레이터 미리보기에서만). 각 공간에 공식 큐레이션·큐레이터 컬렉션 관계를 붙이고,
   보는 사람의 취향 프로필(기존 발견 추천 신호 — 방문·저장·아카이브·직접 고른 태그)을 만든다. 새 추천 알고리즘은 없다. ── */

import { prisma } from "@/lib/prisma";
import { toSpaceView } from "@/lib/editorial/queries";
import type { SpaceView } from "@/lib/editorial/types";
import { getUserDiscoveryContext } from "@/lib/discoverySignals";
import { buildTasteProfile, isEmptyProfile, type TasteProfile } from "@/lib/discoveryRecommend";
import type { CuratorAccess } from "@/lib/curators/access";
import { getCuratedUniverse } from "@/lib/curators/queries";
import { getViewerCuratorContext } from "@/lib/curators/viewerTaste";
import type { AffinityLevel, CuratorAffinity } from "@/lib/curators/affinity";
import type { FinderCandidate, FinderCollectionRef } from "./spaceFinder";

export type FinderSpace = FinderCandidate & { view: SpaceView };

/** 취향 겹침 단계 → 정렬 가산점(작게 — 내 취향 겹침이 언제나 먼저) */
const BOOST: Record<AffinityLevel, number> = { very: 1.5, many: 1, some: 0.5, new: 0 };

export async function getFinderPool(access: CuratorAccess): Promise<FinderSpace[]> {
  const includeDemo = access.enabled && access.includeDemo;
  const [rows, universe] = await Promise.all([
    prisma.editorialSpace.findMany({
      where: { status: "PUBLISHED", ...(includeDemo ? {} : { isDemo: false }) },
      orderBy: [{ createdAt: "asc" }],
      include: { curationLinks: { where: { curation: { status: "PUBLISHED" } }, include: { curation: { select: { title: true, slug: true } } } } },
    }),
    access.enabled ? getCuratedUniverse(access) : Promise.resolve(null),
  ]);
  const collectionsBySpace = new Map<string, FinderCollectionRef[]>();
  for (const p of universe?.picks ?? []) {
    const list = collectionsBySpace.get(p.spaceId) ?? [];
    list.push({ title: p.collectionTitle, slug: p.collectionSlug, curatorSlug: p.curatorSlug, curatorName: p.curatorName, curatorIsOfficial: p.curatorIsOfficial, keywords: p.keywords });
    collectionsBySpace.set(p.spaceId, list);
  }
  return rows.map((r, i) => ({
    id: r.id,
    name: r.name,
    area: r.area,
    category: r.category,
    tags: r.tags,
    order: i,
    collections: collectionsBySpace.get(r.id) ?? [],
    curations: r.curationLinks.map((l) => ({ title: l.curation.title, slug: l.curation.slug })),
    view: toSpaceView(r),
  }));
}

export interface FinderViewer {
  profile: TasteProfile | null;
  personalized: boolean;
  curatorBoost: Map<string, number>;
  affinities: CuratorAffinity[];
  visitedSlugs: Set<string>;
  savedIds: Set<string>;
}

export async function getFinderViewer(userId: string | null, access: CuratorAccess): Promise<FinderViewer> {
  if (!userId) return { profile: null, personalized: false, curatorBoost: new Map(), affinities: [], visitedSlugs: new Set(), savedIds: new Set() };
  const [ctx, curatorCtx] = await Promise.all([
    getUserDiscoveryContext(userId, { includeDemo: access.enabled && access.includeDemo }),
    access.enabled ? getViewerCuratorContext(userId, access) : Promise.resolve(null),
  ]);
  // 큐레이터 미리보기에서는 컬렉션 키워드로 보강한 프로필(같은 신호, 더 많은 어휘), 아니면 기존 발견 추천 프로필 그대로.
  const profile = curatorCtx?.profile ?? buildTasteProfile(ctx.signals);
  const affinities = curatorCtx?.affinities ?? [];
  return {
    profile,
    personalized: !isEmptyProfile(profile),
    curatorBoost: new Map(affinities.map((a) => [a.curator.slug, BOOST[a.level]])),
    affinities,
    visitedSlugs: ctx.visitedSlugs,
    savedIds: ctx.savedEditorialIds,
  };
}
