/* ── 공간 태그 연결 입력 정규화 + SINGLE 카테고리 서버단 강제 ──────────────────
   SpaceForm(라디오)이 클라이언트에서 "공간 유형은 1개만" 강제하긴 하지만, 서버는 클라이언트를
   신뢰하지 않고 한 번 더 강제한다. api/spaces(POST), api/spaces/[id](PATCH),
   api/spaces/[id]/space-tags(PUT) 세 곳이 같은 로직을 쓰므로 여기 하나로 모았다. ── */

import { prisma } from "@/lib/prisma";

export const SPACE_TYPE_CATEGORY_NAME = "공간 유형";

export interface TagLinkInput {
  tagId: string;
  weight?: number;
  isPrimary?: boolean;
  visibleToUsers?: boolean;
}

export interface NormalizedTagLink {
  tagId: string;
  weight: number;
  isPrimary: boolean;
  visibleToUsers: boolean;
}

/**
 * SINGLE 선택 카테고리(예: 공간 유형)에 링크가 여러 개 들어오면 하나만 남긴다.
 * isPrimary가 표시된 링크가 있으면 그것을, 없으면 그룹의 첫 번째 값을 남긴다.
 * MULTI 카테고리나 미분류 태그는 그대로 통과시킨다.
 */
export async function enforceSingleSelectCategories(links: TagLinkInput[]): Promise<NormalizedTagLink[]> {
  const normalized: NormalizedTagLink[] = links.map((l) => ({
    tagId: l.tagId,
    weight: typeof l.weight === "number" ? l.weight : 1,
    isPrimary: l.isPrimary === true,
    visibleToUsers: l.visibleToUsers !== false,
  }));
  if (normalized.length === 0) return normalized;

  const tags = await prisma.tag.findMany({
    where: { id: { in: normalized.map((l) => l.tagId) } },
    select: { id: true, categoryId: true, categoryRef: { select: { selectionType: true } } },
  });
  const tagById = new Map(tags.map((t) => [t.id, t]));

  const singleGroups = new Map<string, NormalizedTagLink[]>();
  const result: NormalizedTagLink[] = [];
  for (const link of normalized) {
    const tag = tagById.get(link.tagId);
    if (!tag?.categoryId || tag.categoryRef?.selectionType !== "SINGLE") {
      result.push(link);
      continue;
    }
    const group = singleGroups.get(tag.categoryId);
    if (group) group.push(link);
    else singleGroups.set(tag.categoryId, [link]);
  }
  for (const group of singleGroups.values()) {
    result.push(group.find((l) => l.isPrimary) ?? group[0]);
  }
  return result;
}

/** 정규화된 링크 중 "공간 유형" 카테고리에 속한 태그의 이름을 찾는다 — Space.type 파생 캐시용. */
export async function resolveSpaceTypeName(links: NormalizedTagLink[]): Promise<string | null> {
  if (links.length === 0) return null;
  const tag = await prisma.tag.findFirst({
    where: { id: { in: links.map((l) => l.tagId) }, categoryRef: { name: SPACE_TYPE_CATEGORY_NAME } },
    select: { name: true },
  });
  return tag?.name ?? null;
}
