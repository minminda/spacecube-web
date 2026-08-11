import { prisma } from "@/lib/prisma";

export type EntryDestination =
  | { type: "episode"; episodeId: string }
  | { type: "space" };

/**
 * QR로 공간에 처음 진입했을 때 바로 보여줄 곳을 정한다(cube-entry 라우트 전용).
 * 1) 관리자가 대표 이야기로 지정한 공개 Episode가 있으면 그곳으로.
 * 2) 없으면 공개된 Episode 중 표시 순서(displayOrder)가 가장 빠른 것으로.
 * 3) 공개된 Episode가 하나도 없으면 공간 페이지로 폴백(공간 페이지가 "준비 중" 상태를 이미 처리한다).
 */
export async function resolveEntryDestination(spaceId: string): Promise<EntryDestination> {
  const featured = await prisma.episode.findFirst({
    where: { spaceId, published: true, isFeatured: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  if (featured) return { type: "episode", episodeId: featured.id };

  const first = await prisma.episode.findFirst({
    where: { spaceId, published: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  if (first) return { type: "episode", episodeId: first.id };

  return { type: "space" };
}

/**
 * resolveEntryDestination과 동일한 규칙(대표 지정 우선, 없으면 표시순 1번)을
 * 이미 불러온 Episode 목록(displayOrder asc로 정렬된)에 대해 순수 계산한다.
 * 관리자 화면에서 "이 에피소드가 QR 진입 지점인가"를 판단할 때 쓴다.
 */
export function resolveEntryEpisodeId<
  T extends { id: string; published: boolean; isFeatured: boolean }
>(episodesByDisplayOrder: T[]): string | null {
  const featured = episodesByDisplayOrder.find((e) => e.published && e.isFeatured);
  if (featured) return featured.id;

  const first = episodesByDisplayOrder.find((e) => e.published);
  return first?.id ?? null;
}
