/* ── 발견 추천용 사용자 신호 수집(서버 전용) ─────────────────────────────────
   강한 신호: 실제 방문 Record(기존 buildWeightedTasteVector 재사용 — 공간당 최신 방문 1개, 취향 점수 반영).
   중간 신호: 저장(운영 공간 SavedSpace + 공개 공간 SavedEditorialSpace).
   개인 아카이브(ArchiveEntry): 직접 추가 2.5 · 다녀왔어요 3 · 사용자가 고른 태그 +1(discoveryRecommend.ts의 상수).
   연결된 공개 공간이 있으면 그 공간의 유형·태그를, 없으면 사용자가 고른 태그만 쓴다(추측하지 않음).
   시연 공간 기록·저장은 신호에서 뺀다(demoData.ts). 공간 상세 조회·지도 클릭 같은 약한 신호는
   아직 계측하지 않으므로 쓰지 않는다. ── */

import { prisma } from "@/lib/prisma";
import { buildWeightedTasteVector } from "@/lib/recommend";
import { LISTED_SPACE_WHERE, TASTE_SIGNAL_RECORD_WHERE } from "@/lib/demoData";
import { ARCHIVE_SAVED_WEIGHT, ARCHIVE_VISITED_WEIGHT, EXPLICIT_TAG_BONUS, type TasteSignals } from "@/lib/discoveryRecommend";

const TAG_LINKS = { include: { tag: true } } as const;

export interface UserDiscoveryContext {
  signals: TasteSignals;
  /** 실제로 다녀온 운영 공간 slug(공개 공간과 slug가 같으면 이미 경험한 곳으로 본다) */
  visitedSlugs: Set<string>;
  /** 저장한 공개 공간 id + 저장한 운영 공간 slug */
  savedEditorialIds: Set<string>;
  savedSlugs: Set<string>;
}

/** includeDemo: 큐레이터 프로토타입 미리보기에서 가상 공간 저장도 취향 신호로 쓴다(일반 화면은 항상 false). */
export async function getUserDiscoveryContext(userId: string, opts: { includeDemo?: boolean } = {}): Promise<UserDiscoveryContext> {
  const [records, savedOps, savedEds, archive] = await Promise.all([
    prisma.record.findMany({
      where: { userId, ...TASTE_SIGNAL_RECORD_WHERE },
      select: { id: true, spaceId: true, visitedAt: true, tasteScore: true, space: { select: { slug: true, spaceTagLinks: TAG_LINKS } } },
    }),
    prisma.savedSpace.findMany({
      where: { userId, space: LISTED_SPACE_WHERE },
      select: { space: { select: { slug: true, spaceTagLinks: TAG_LINKS } } },
    }),
    prisma.savedEditorialSpace.findMany({
      where: { userId, space: { status: "PUBLISHED", ...(opts.includeDemo ? {} : { isDemo: false }) } },
      select: { spaceId: true, space: { select: { slug: true, category: true, tags: true } } },
    }),
    prisma.archiveEntry.findMany({
      where: { userId },
      select: { spaceId: true, status: true, tags: true, space: { select: { slug: true, category: true, tags: true, status: true, isDemo: true } } },
    }),
  ]);
  // 연결 공간이 보이지 않는 기록(보관된 공간·미리보기 아닌데 가상 공간)은 공간 특징 없이 내 태그만 쓴다.
  const usableSpace = (sp: { status: string; isDemo: boolean } | null) => !!sp && sp.status === "PUBLISHED" && (opts.includeDemo || !sp.isDemo);
  const archiveSpaceIds = new Set(archive.flatMap((a) => (a.spaceId && usableSpace(a.space) ? [a.spaceId] : [])));

  const vector = buildWeightedTasteVector(records);
  const tagName = new Map(records.flatMap((r) => r.space.spaceTagLinks.map((l) => [l.tag.id, l.tag.name] as const)));
  const visits = Object.entries(vector).flatMap(([id, weight]) => {
    const name = tagName.get(id);
    return name && weight ? [{ name, weight }] : [];
  });

  const recommendable = (links: { visibleToUsers: boolean; tag: { name: string; isActive: boolean; useForRecommendation: boolean } }[]) =>
    links.filter((l) => l.tag.isActive && l.tag.useForRecommendation).map((l) => l.tag.name);

  // 같은 공간을 운영 저장·공개 저장·아카이브 기록에 겹쳐 남겼으면 한 번만 센다 — 아카이브 기록이 가장 강한 신호라 우선.
  const archivedSlugs = new Set(archive.flatMap((a) => (a.space && usableSpace(a.space) ? [a.space.slug] : [])));
  const edsOnly = savedEds.filter((s) => !archiveSpaceIds.has(s.spaceId));
  const edSlugs = new Set([...savedEds.map((s) => s.space.slug), ...archivedSlugs]);
  const opsOnly = savedOps.filter((s) => !edSlugs.has(s.space.slug));
  const weighted: NonNullable<TasteSignals["weighted"]> = [];
  for (const a of archive) {
    const own = a.space && usableSpace(a.space) ? [a.space.category, ...a.space.tags] : [];
    const kind = a.status === "VISITED" ? "visit" : "save";
    const names = [...own, ...a.tags];
    if (names.length) weighted.push({ names, weight: kind === "visit" ? ARCHIVE_VISITED_WEIGHT : ARCHIVE_SAVED_WEIGHT, kind });
    if (a.tags.length) weighted.push({ names: a.tags, weight: EXPLICIT_TAG_BONUS, kind: "bonus" });
  }

  return {
    signals: {
      visits,
      visitCount: new Set(records.map((r) => r.spaceId)).size,
      saves: [
        ...opsOnly.map((s) => recommendable(s.space.spaceTagLinks)),
        ...edsOnly.map((s) => [s.space.category, ...s.space.tags]),
      ],
      weighted,
    },
    visitedSlugs: new Set([
      ...records.map((r) => r.space.slug),
      ...archive.flatMap((a) => (a.status === "VISITED" && a.space ? [a.space.slug] : [])),
    ]),
    // 아카이브에 이미 넣은 공간도 "이미 아는 곳"이라 추천에서 뺀다
    savedEditorialIds: new Set([...savedEds.map((s) => s.spaceId), ...archive.flatMap((a) => (a.spaceId ? [a.spaceId] : []))]),
    savedSlugs: new Set([...savedOps.map((s) => s.space.slug), ...savedEds.map((s) => s.space.slug)]),
  };
}
