/* ── 아카이브 "저장한 공간" — 두 저장 테이블을 하나의 목록으로 ─────────────────
   공개 공간 저장(SavedEditorialSpace)과 Cube 상세에서의 운영 공간 저장(SavedSpace)을 slug 기준으로
   합친다(같은 공간이면 공개 공간 쪽을 우선). 저장 기록 자체는 어느 쪽도 지우지 않는다.
   - 공개 공간: 발행(PUBLISHED)된 것만 — 보관된 공간은 목록에서 빠질 뿐 저장 행은 남는다.
   - 운영 공간: 공개 중이고 시연 공간이 아닌 것만(demoData.ts의 LISTED_SPACE_WHERE). ── */

import { prisma } from "@/lib/prisma";
import { LISTED_SPACE_WHERE } from "@/lib/demoData";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import { formatDotDate } from "@/lib/time";
import type { ArchiveTileData } from "@/components/archive/ArchiveTile";

export async function getArchiveSavedTiles(userId: string, opts: { visitedSpaceIds: Set<string>; editorial: boolean }): Promise<ArchiveTileData[]> {
  const [eds, ops] = await Promise.all([
    prisma.savedEditorialSpace.findMany({
      where: { userId, space: { status: "PUBLISHED" } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, space: { select: { slug: true, name: true, area: true, category: true, coverImage: true, cubeAvailable: true } } },
    }),
    prisma.savedSpace.findMany({
      where: { userId, space: LISTED_SPACE_WHERE },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        space: {
          select: {
            id: true, slug: true, name: true, district: true, imageUrl: true, type: true,
            spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
          },
        },
      },
    }),
  ]);

  // 운영 공간과 같은 slug의 발행 공개 공간이 있을 때만 공개 상세로 보낸다(없으면 깨진 링크가 되므로).
  const publicSlugs = opts.editorial && ops.length > 0
    ? new Set((await prisma.editorialSpace.findMany({
        where: { status: "PUBLISHED", slug: { in: ops.map((o) => o.space.slug) } },
        select: { slug: true },
      })).map((r) => r.slug))
    : new Set<string>();

  const tiles: (ArchiveTileData & { at: number })[] = [];
  const seen = new Set<string>();
  for (const s of eds) {
    seen.add(s.space.slug);
    tiles.push({
      key: `ed-${s.space.slug}`,
      href: `/spaces/${s.space.slug}`,
      name: s.space.name,
      imageUrl: s.space.coverImage,
      meta: [s.space.area, s.space.category].filter(Boolean).join(" · "),
      note: `${formatDotDate(s.createdAt)} 저장`,
      partner: s.space.cubeAvailable,
      at: s.createdAt.getTime(),
    });
  }
  for (const s of ops) {
    if (seen.has(s.space.slug)) continue;
    seen.add(s.space.slug);
    // 다녀온 곳이면 내 기록(자세히 보기)으로, 아니면 공개 공간 상세(새 정보 구조) 또는 기존 Cube 상세로.
    const href = opts.visitedSpaceIds.has(s.space.id)
      ? `/archive/space/${s.space.id}`
      : publicSlugs.has(s.space.slug) ? `/spaces/${s.space.slug}` : `/space/${s.space.slug}`;
    tiles.push({
      key: `op-${s.space.id}`,
      href,
      name: s.space.name,
      imageUrl: s.space.imageUrl,
      meta: [s.space.district, resolveSpaceTypeLabel(s.space.spaceTagLinks, s.space.type)].filter(Boolean).join(" · "),
      note: `${formatDotDate(s.createdAt)} 저장`,
      partner: true,
      at: s.createdAt.getTime(),
    });
  }
  tiles.sort((a, b) => b.at - a.at);
  return tiles.map((t) => ({ key: t.key, href: t.href, name: t.name, imageUrl: t.imageUrl, meta: t.meta, note: t.note, partner: t.partner }));
}
