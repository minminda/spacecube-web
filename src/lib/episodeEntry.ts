import { prisma } from "@/lib/prisma";

export type EntryDestination =
  | { type: "episode"; episodeId: string }
  | { type: "space" };

/**
 * QR로 공간에 처음 진입했을 때 바로 보여줄 곳을 정한다(cube-entry 라우트 전용).
 * 1) 관리자가 대표 이야기로 지정한 공개 Episode가 있으면 그곳으로.
 * 2) 없으면 공개된 Episode 중 표시 순서(displayOrder)가 가장 빠른 것으로.
 * 3) 공개된 Episode가 하나도 없으면 공간 페이지로 폴백(공간 페이지가 "준비 중" 상태를 이미 처리한다).
 * 두 조회 모두 unlockVisitCount: 0(항상 공개)인 Episode만 후보로 삼는다 — 첫 방문자는 visitCount가
 * 항상 0이므로, 관리자가 실수로 잠금 조건이 있는 Episode를 대표로 지정해도 QR 진입 직후 잠긴
 * 화면을 보게 되는 일이 없도록 서버에서 한 번 더 막는다.
 */
export async function resolveEntryDestination(spaceId: string): Promise<EntryDestination> {
  const featured = await prisma.episode.findFirst({
    where: { spaceId, published: true, isFeatured: true, unlockVisitCount: 0 },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  if (featured) return { type: "episode", episodeId: featured.id };

  const first = await prisma.episode.findFirst({
    where: { spaceId, published: true, unlockVisitCount: 0 },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  if (first) return { type: "episode", episodeId: first.id };

  return { type: "space" };
}
