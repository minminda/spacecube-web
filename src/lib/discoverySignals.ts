/* ── 발견 추천용 사용자 신호 수집(서버 전용) ─────────────────────────────────
   강한 신호: 실제 방문 Record(기존 buildWeightedTasteVector 재사용 — 공간당 최신 방문 1개, 취향 점수 반영).
   중간 신호: 저장(운영 공간 SavedSpace + 공개 공간 SavedEditorialSpace).
   시연 공간 기록·저장은 신호에서 뺀다(demoData.ts). 공간 상세 조회·지도 클릭 같은 약한 신호는
   아직 계측하지 않으므로 쓰지 않는다. ── */

import { prisma } from "@/lib/prisma";
import { buildWeightedTasteVector } from "@/lib/recommend";
import { LISTED_SPACE_WHERE, TASTE_SIGNAL_RECORD_WHERE } from "@/lib/demoData";
import type { TasteSignals } from "@/lib/discoveryRecommend";

const TAG_LINKS = { include: { tag: true } } as const;

export interface UserDiscoveryContext {
  signals: TasteSignals;
  /** 실제로 다녀온 운영 공간 slug(공개 공간과 slug가 같으면 이미 경험한 곳으로 본다) */
  visitedSlugs: Set<string>;
  /** 저장한 공개 공간 id + 저장한 운영 공간 slug */
  savedEditorialIds: Set<string>;
  savedSlugs: Set<string>;
}

export async function getUserDiscoveryContext(userId: string): Promise<UserDiscoveryContext> {
  const [records, savedOps, savedEds] = await Promise.all([
    prisma.record.findMany({
      where: { userId, ...TASTE_SIGNAL_RECORD_WHERE },
      select: { id: true, spaceId: true, visitedAt: true, tasteScore: true, space: { select: { slug: true, spaceTagLinks: TAG_LINKS } } },
    }),
    prisma.savedSpace.findMany({
      where: { userId, space: LISTED_SPACE_WHERE },
      select: { space: { select: { slug: true, spaceTagLinks: TAG_LINKS } } },
    }),
    prisma.savedEditorialSpace.findMany({
      where: { userId, space: { status: "PUBLISHED" } },
      select: { spaceId: true, space: { select: { slug: true, category: true, tags: true } } },
    }),
  ]);

  const vector = buildWeightedTasteVector(records);
  const tagName = new Map(records.flatMap((r) => r.space.spaceTagLinks.map((l) => [l.tag.id, l.tag.name] as const)));
  const visits = Object.entries(vector).flatMap(([id, weight]) => {
    const name = tagName.get(id);
    return name && weight ? [{ name, weight }] : [];
  });

  const recommendable = (links: { visibleToUsers: boolean; tag: { name: string; isActive: boolean; useForRecommendation: boolean } }[]) =>
    links.filter((l) => l.tag.isActive && l.tag.useForRecommendation).map((l) => l.tag.name);

  // 같은 공간을 운영 저장·공개 저장 양쪽에 저장했으면 한 번만 센다(slug 기준).
  const edSlugs = new Set(savedEds.map((s) => s.space.slug));
  const opsOnly = savedOps.filter((s) => !edSlugs.has(s.space.slug));

  return {
    signals: {
      visits,
      visitCount: new Set(records.map((r) => r.spaceId)).size,
      saves: [
        ...opsOnly.map((s) => recommendable(s.space.spaceTagLinks)),
        ...savedEds.map((s) => [s.space.category, ...s.space.tags]),
      ],
    },
    visitedSlugs: new Set(records.map((r) => r.space.slug)),
    savedEditorialIds: new Set(savedEds.map((s) => s.spaceId)),
    savedSlugs: new Set([...savedOps.map((s) => s.space.slug), ...savedEds.map((s) => s.space.slug)]),
  };
}
