/* ── 보는 사람의 취향 × 큐레이터(서버 전용, 프로토타입) ──────────────────────────
   기존 발견 추천 신호(getUserDiscoveryContext — 방문 Record + 저장)를 그대로 쓰고, 큐레이터 컬렉션 키워드로
   보강한 별도 프로필을 만든다. 기존 /recommend 계산·결과에는 영향이 없다. 큐레이터도 User이므로
   큐레이터 본인이 보면 자기 자신은 "취향이 맞는 큐레이터" 목록에서 뺀다. ── */

import { getUserDiscoveryContext } from "@/lib/discoverySignals";
import { buildTasteProfile, isEmptyProfile, topAttributes, type TasteProfile } from "@/lib/discoveryRecommend";
import type { SpaceView } from "@/lib/editorial/types";
import type { CuratorAccess } from "./access";
import { computeAffinities, enrichProfileWithCollections, type CuratorAffinity } from "./affinity";
import { getCuratedUniverse, listCurators, type CuratorSummary } from "./queries";
import type { FinderPick } from "./finder";

export interface ViewerCuratorContext {
  profile: TasteProfile;
  empty: boolean;
  topTaste: string[];
  /** 내가 저장·방문한 공개 공간 id(가상 공간 포함 — 미리보기에서만) */
  mySpaceIds: Set<string>;
  affinities: CuratorAffinity[];
  curators: CuratorSummary[];
  picks: (FinderPick & { curatorIsOfficial: boolean })[];
  spaces: Map<string, SpaceView>;
}

export async function getViewerCuratorContext(userId: string, access: CuratorAccess): Promise<ViewerCuratorContext> {
  const [ctx, universe, curators] = await Promise.all([
    getUserDiscoveryContext(userId, { includeDemo: access.includeDemo }),
    getCuratedUniverse(access),
    listCurators(access),
  ]);
  const mySpaceIds = new Set<string>();
  for (const s of universe.spaces.values()) {
    if (ctx.savedEditorialIds.has(s.id) || ctx.savedSlugs.has(s.slug) || ctx.visitedSlugs.has(s.slug)) mySpaceIds.add(s.id);
  }
  const profile = enrichProfileWithCollections(buildTasteProfile(ctx.signals), mySpaceIds, universe.picks);
  const others = curators.filter((c) => c.userId !== userId);
  const affinities = computeAffinities(
    profile,
    mySpaceIds,
    others.map((c) => ({ slug: c.slug, name: c.name, isOfficial: c.isOfficial, tasteTags: c.tasteTags })),
    universe.picks,
    universe.spaces,
  );
  return {
    profile,
    empty: isEmptyProfile(profile),
    topTaste: topAttributes(profile, 3),
    mySpaceIds,
    affinities,
    curators,
    picks: universe.picks,
    spaces: universe.spaces,
  };
}
