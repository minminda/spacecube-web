/* ── Discovery KPI (공간 발견 → 방문 의도 → 실제 방문) ───────────────────
   공개 /spaces/[slug]의 상세 조회 · 저장 · 지도 클릭을 "명"(고유 방문자) 기준으로 집계하고,
   지도 클릭 → 7일 안 같은 공간 QR 스캔 전환을 계산한다. 방문자 식별은 기존 KPI와 같은
   visitorIdentity(userId 우선, 없으면 sc_anon_id)를 재사용한다.
   - 상세 조회 · 지도 클릭: DiscoveryEvent (쓰기 시점에 30분 안 중복 제거, 집계에서 다시 고유 방문자로 센다)
   - 저장: 기존 SavedEditorialSpace(+운영 공간 SavedSpace) createdAt — 새 이벤트 없음. 저장 후 취소한 건은 남지 않는다.
   - QR 스캔: 기존 SpaceScan — 공개 공간(EditorialSpace)과 운영 공간(Space)은 slug로 잇는다. ── */

import { prisma } from "@/lib/prisma";
import { getKpiExcludedUserIds } from "@/lib/demoData";
import { distinctVisitorCount, visitorIdentity } from "@/lib/reportMetrics";

export const DISCOVERY_DEDUPE_WINDOW_MS = 30 * 60 * 1000;
export const MAP_TO_SCAN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface Who {
  userId: string | null;
  anonId: string | null;
}

/**
 * 순수 함수 — 지도 클릭한 (방문자 × 공간) 중 클릭 후 windowMs 안에 같은 공간의 QR 스캔이 있었던 수.
 * 스캔은 로그인이면 userId만, 비로그인이면 anonId만 기록되고 클릭은 둘 다 가질 수 있으므로,
 * userId 또는 anonId 중 하나라도 같으면 같은 방문자로 본다.
 */
export function countMapClickConversions(
  clicks: (Who & { spaceKey: string; at: Date })[],
  scans: (Who & { spaceKey: string; at: Date })[],
  windowMs: number = MAP_TO_SCAN_WINDOW_MS,
): { clickers: number; converted: number } {
  const pairs = new Map<string, (typeof clicks)[number][]>();
  for (const c of clicks) {
    const id = visitorIdentity(c);
    if (!id) continue;
    const key = `${c.spaceKey}|${id}`;
    pairs.set(key, [...(pairs.get(key) ?? []), c]);
  }
  let converted = 0;
  for (const group of pairs.values()) {
    const hit = group.some((c) =>
      scans.some(
        (s) =>
          s.spaceKey === c.spaceKey &&
          s.at.getTime() >= c.at.getTime() &&
          s.at.getTime() <= c.at.getTime() + windowMs &&
          ((c.userId != null && s.userId === c.userId) || (c.anonId != null && s.anonId === c.anonId)),
      ),
    );
    if (hit) converted += 1;
  }
  return { clickers: pairs.size, converted };
}

export interface DiscoveryStats {
  viewVisitors: number; // 상세 조회 고유 방문자(명)
  viewEvents: number; // 30분 중복 제거 후 기록된 조회 수(회)
  saveUsers: number; // 기간 내 저장한 로그인 사용자(명)
  mapClickVisitors: number; // 지도 클릭 고유 방문자(명, 서비스 전체는 방문자×공간)
  mapClickEvents: number;
  mapToScanConverted: number; // 위 중 클릭 후 7일 안 같은 공간 QR 스캔
}

const EMPTY: DiscoveryStats = { viewVisitors: 0, viewEvents: 0, saveUsers: 0, mapClickVisitors: 0, mapClickEvents: 0, mapToScanConverted: 0 };

/**
 * scope: 운영 공간 하나(slug로 공개 공간을 찾는다) 또는 서비스 전체(발행된 실제 공개 공간 전부).
 * 관리자 · 더미 계정 행동은 제외한다(익명 행은 그대로 둔다 — NULL NOT IN 함정 때문에 JS에서 거른다).
 */
export async function getDiscoveryStats(
  scope: { operationalSpaceId: string; slug: string } | "all",
  start: Date,
  end: Date,
): Promise<DiscoveryStats> {
  const excluded = await getKpiExcludedUserIds();
  const allowed = <T extends { userId: string | null }>(rows: T[]) => rows.filter((r) => !(r.userId && excluded.has(r.userId)));

  const editorial = await prisma.editorialSpace.findMany({
    where: scope === "all" ? { status: "PUBLISHED", isDemo: false } : { slug: scope.slug, isDemo: false },
    select: { id: true, slug: true },
  });
  const editorialIds = editorial.map((e) => e.id);
  const range = { gte: start, lt: end };

  const [events, savedEd, savedOps] = await Promise.all([
    editorialIds.length
      ? prisma.discoveryEvent.findMany({
          where: { spaceId: { in: editorialIds }, createdAt: range },
          select: { spaceId: true, type: true, userId: true, anonId: true, createdAt: true },
        })
      : Promise.resolve([]),
    editorialIds.length
      ? prisma.savedEditorialSpace.findMany({ where: { spaceId: { in: editorialIds }, createdAt: range }, select: { userId: true } })
      : Promise.resolve([]),
    prisma.savedSpace.findMany({
      where: { createdAt: range, space: scope === "all" ? { isDemo: false, slug: { in: editorial.map((e) => e.slug) } } : { id: scope.operationalSpaceId, isDemo: false } },
      select: { userId: true },
    }),
  ]);

  const views = allowed(events.filter((e) => e.type === "SPACE_VIEW"));
  const clicks = allowed(events.filter((e) => e.type === "MAP_CLICK"));
  const saveUsers = new Set([...allowed(savedEd), ...allowed(savedOps)].map((r) => r.userId)).size;

  // 지도 클릭 → 7일 안 QR 스캔: 공개 공간 id → slug → 운영 공간 id로 이어 같은 공간의 스캔만 본다.
  let mapToScanConverted = 0;
  let mapClickVisitors = distinctVisitorCount(clicks);
  if (clicks.length > 0) {
    const slugById = new Map(editorial.map((e) => [e.id, e.slug]));
    const ops = await prisma.space.findMany({ where: { slug: { in: editorial.map((e) => e.slug) } }, select: { id: true, slug: true } });
    const slugByOpId = new Map(ops.map((o) => [o.id, o.slug]));
    const scans = ops.length
      ? await prisma.spaceScan.findMany({
          where: { spaceId: { in: ops.map((o) => o.id) }, scannedAt: { gte: start, lt: new Date(Math.min(end.getTime() + MAP_TO_SCAN_WINDOW_MS, Date.now() + 1)) } },
          select: { spaceId: true, userId: true, anonId: true, scannedAt: true },
        })
      : [];
    const result = countMapClickConversions(
      clicks.map((c) => ({ userId: c.userId, anonId: c.anonId, at: c.createdAt, spaceKey: slugById.get(c.spaceId) ?? c.spaceId })),
      allowed(scans).map((s) => ({ userId: s.userId, anonId: s.anonId, at: s.scannedAt, spaceKey: slugByOpId.get(s.spaceId) ?? s.spaceId })),
    );
    mapToScanConverted = result.converted;
    mapClickVisitors = result.clickers;
  }

  if (editorialIds.length === 0 && savedOps.length === 0) return { ...EMPTY };
  return {
    viewVisitors: distinctVisitorCount(views),
    viewEvents: views.length,
    saveUsers,
    mapClickVisitors,
    mapClickEvents: clicks.length,
    mapToScanConverted,
  };
}

export interface ServiceOnsiteStats {
  qrVisitors: number;
  storyViewers: number;
  storyCompleters: number;
  recordUsers: number;
}

/** 서비스 전체 현장 경험 퍼널(명) — 실제(비시연) 운영 공간 전체에서 고유 방문자 기준. 공간별 화면과 같은 정의를 쓴다. */
export async function getServiceOnsiteStats(start: Date, end: Date): Promise<ServiceOnsiteStats> {
  const excluded = await getKpiExcludedUserIds();
  const allowed = <T extends { userId: string | null }>(rows: T[]) => rows.filter((r) => !(r.userId && excluded.has(r.userId)));
  const [scans, reads, records] = await Promise.all([
    prisma.spaceScan.findMany({ where: { scannedAt: { gte: start, lt: end }, space: { isDemo: false } }, select: { userId: true, anonId: true } }),
    prisma.episodeRead.findMany({
      where: { openedAt: { gte: start, lt: end }, episode: { space: { isDemo: false } } },
      select: { userId: true, anonId: true, completedAt: true },
    }),
    prisma.record.findMany({ where: { visitedAt: { gte: start, lt: end }, space: { isDemo: false } }, select: { userId: true } }),
  ]);
  const r = allowed(reads);
  return {
    qrVisitors: distinctVisitorCount(allowed(scans)),
    storyViewers: distinctVisitorCount(r),
    storyCompleters: distinctVisitorCount(r.filter((x) => x.completedAt != null)),
    recordUsers: new Set(allowed(records).map((x) => x.userId)).size,
  };
}
