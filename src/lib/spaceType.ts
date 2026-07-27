/* ── "공간 유형" 실시간 라벨 조회 ──────────────────────────────────────────
   Space.type은 이제 "공간 유형" 카테고리에서 고른 태그 이름의 캐시일 뿐이다(관리자가
   태그 이름을 바꾸면 stale해질 수 있음). 표시 화면은 항상 SpaceTag 조인을 먼저 읽고,
   링크가 없을 때만(백필 이전 데이터 등) Space.type 캐시로 폴백한다. ── */

export const SPACE_TYPE_CATEGORY_NAME = "공간 유형";

export interface SpaceTypeLinkLike {
  tag: { name: string; categoryRef: { name: string } | null };
}

/** SpaceTag 링크 목록에서 "공간 유형" 카테고리의 태그 이름을 찾는다. 없으면 fallbackType(레거시 캐시)을 쓴다. */
export function resolveSpaceTypeLabel(
  spaceTagLinks: SpaceTypeLinkLike[] | undefined,
  fallbackType: string,
): string {
  const link = spaceTagLinks?.find((l) => l.tag.categoryRef?.name === SPACE_TYPE_CATEGORY_NAME);
  return link?.tag.name ?? fallbackType;
}
