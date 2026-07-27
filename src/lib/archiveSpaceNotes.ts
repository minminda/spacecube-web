/* ── 아카이브 "공간 노트" 그룹화 ────────────────────────────────────────────
   방문 기록(Record)을 공간 단위로 묶어 노트 한 장(SpaceNoteEntry)으로 만든다.
   같은 공간을 여러 번 방문했어도 카드는 하나 — 재방문 판정은 기존 취향 계산이
   쓰는 getLatestRecordPerSpace(taste.ts)를 그대로 재사용한다(새로 구현하지 않음).
   Prisma에 의존하지 않는 순수 함수 모듈 — recommend.ts/taste.ts와 같은 층위.
   Date는 그대로 유지하고 포맷은 하지 않는다(직렬화 경계는 components/archive/SpaceNoteCard.tsx). ── */

import { getLatestRecordPerSpace, type SpaceVisitRecord } from "@/lib/taste";
import { resolveSpaceTypeLabel, SPACE_TYPE_CATEGORY_NAME, type SpaceTypeLinkLike } from "@/lib/spaceType";

export const SPACE_NOTE_MAX_CORE_TAGS = 3;

export interface ArchiveSpaceTagLink extends SpaceTypeLinkLike {
  visibleToUsers: boolean;
  weight: number;
  isPrimary: boolean;
  tag: SpaceTypeLinkLike["tag"] & { id: string; isActive: boolean; categoryId: string | null };
}

export interface ArchiveRecordInput extends SpaceVisitRecord {
  tasteScore: number | null;
  space: {
    id: string;
    name: string;
    slug: string;
    type: string;
    district: string | null;
    imageUrl: string | null;
    spaceTagLinks: ArchiveSpaceTagLink[];
  };
}

export type GuestbookSessionStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface ArchiveGuestbookNoteInput {
  id: string;
  spaceId: string;
  content: string;
  color: string;
  imageUrl: string | null;
  createdAt: Date;
  spaceSlug: string;
  sessionId: string;
  sessionStatus: GuestbookSessionStatus;
}

export interface SpaceNoteEntry {
  spaceId: string;
  spaceName: string;
  spaceSlug: string;
  spaceTypeLabel: string;
  district: string | null;
  imageUrl: string | null;
  representativeRecordId: string;
  visitedAt: Date;
  tasteScore: number | null;
  visitCount: number;
  coreTags: string[];
  latestGuestbookNote: ArchiveGuestbookNoteInput | null;
}

/**
 * 공간을 한눈에 설명할 핵심 태그 2~3개를 결정적으로 고른다.
 * - "공간 유형"은 이미 별도 필드(spaceTypeLabel)로 표시되므로 후보에서 제외한다(중복 방지).
 * - 방문자 화면에 노출 가능하고(visibleToUsers) 활성 상태인 태그만 후보로 삼는다.
 * - isPrimary desc → weight desc → tagId asc 순으로 정렬한 뒤, 같은 카테고리(categoryId)에서는
 *   1개만 남긴다(미분류 태그(categoryId=null)는 서로 다른 태그로 취급 — 그룹 대상 아님).
 * 실제 DB엔 아직 "공간 유형" 외 카테고리가 만들어지지 않아 대부분 태그가 미분류 상태다 —
 * 카테고리명을 하드코딩하지 않고 이 규칙만으로 동작하도록 설계했다(카테고리가 늘어나도 그대로 동작).
 */
export function getCoreTags(links: ArchiveSpaceTagLink[]): { id: string; name: string }[] {
  const candidates = links.filter(
    (l) => l.visibleToUsers && l.tag.isActive && l.tag.categoryRef?.name !== SPACE_TYPE_CATEGORY_NAME,
  );
  const sorted = [...candidates].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    if (b.weight !== a.weight) return b.weight - a.weight;
    return a.tag.id < b.tag.id ? -1 : a.tag.id > b.tag.id ? 1 : 0;
  });

  const seenCategories = new Set<string>();
  const picked: { id: string; name: string }[] = [];
  for (const link of sorted) {
    if (link.tag.categoryId !== null) {
      if (seenCategories.has(link.tag.categoryId)) continue;
      seenCategories.add(link.tag.categoryId);
    }
    picked.push({ id: link.tag.id, name: link.tag.name });
    if (picked.length >= SPACE_NOTE_MAX_CORE_TAGS) break;
  }
  return picked;
}

/**
 * 방문 기록 + 방명록을 공간 단위로 묶어 노트 목록을 만든다.
 * guestbookNotes는 호출부가 이미 createdAt desc로 정렬해서 넘겨야 한다(공간별 최신 1건만 취함).
 */
export function buildSpaceNoteEntries(
  records: ArchiveRecordInput[],
  guestbookNotes: ArchiveGuestbookNoteInput[],
): SpaceNoteEntry[] {
  const latestPerSpace = getLatestRecordPerSpace(records);

  const visitCounts = new Map<string, number>();
  for (const r of records) {
    visitCounts.set(r.spaceId, (visitCounts.get(r.spaceId) ?? 0) + 1);
  }

  const latestNoteBySpace = new Map<string, ArchiveGuestbookNoteInput>();
  for (const note of guestbookNotes) {
    if (!latestNoteBySpace.has(note.spaceId)) latestNoteBySpace.set(note.spaceId, note);
  }

  const entries: SpaceNoteEntry[] = latestPerSpace.map((r) => ({
    spaceId: r.space.id,
    spaceName: r.space.name,
    spaceSlug: r.space.slug,
    spaceTypeLabel: resolveSpaceTypeLabel(r.space.spaceTagLinks, r.space.type),
    district: r.space.district,
    imageUrl: r.space.imageUrl,
    representativeRecordId: r.id,
    visitedAt: r.visitedAt,
    tasteScore: r.tasteScore,
    visitCount: visitCounts.get(r.spaceId) ?? 1,
    coreTags: getCoreTags(r.space.spaceTagLinks).map((t) => t.name),
    latestGuestbookNote: latestNoteBySpace.get(r.space.id) ?? null,
  }));

  return entries.sort((a, b) => {
    const diff = b.visitedAt.getTime() - a.visitedAt.getTime();
    if (diff !== 0) return diff;
    return a.spaceId < b.spaceId ? -1 : a.spaceId > b.spaceId ? 1 : 0;
  });
}

/** "전체 기록"/외부에서 특정 공간으로 들어왔을 때(?space=) 페이저의 시작 인덱스를 찾는다. */
export function resolveInitialIndex(entries: SpaceNoteEntry[], spaceId: string | undefined): number {
  if (!spaceId) return 0;
  const i = entries.findIndex((e) => e.spaceId === spaceId);
  return i === -1 ? 0 : i;
}

/** 방명록 흔적으로 이동할 링크 — 진행 중(ACTIVE) 세션은 캔버스 포커스, 종료된 세션은 아카이브 하이라이트. */
export function guestbookNoteHref(
  note: Pick<ArchiveGuestbookNoteInput, "id" | "spaceSlug" | "sessionId" | "sessionStatus">,
): string {
  return note.sessionStatus === "ACTIVE"
    ? `/space/${note.spaceSlug}/guestbook?focus=${note.id}`
    : `/space/${note.spaceSlug}/guestbook/archive/${note.sessionId}?highlight=${note.id}`;
}
