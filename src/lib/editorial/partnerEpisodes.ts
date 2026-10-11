/* ── 함께한 공간의 Episode 목록(공개 SPACE 상세용, 읽기 전용) ───────────────
   공개 계층(EditorialSpace)과 운영 계층(Space)은 같은 slug로만 이어진다(partnerTrace.ts와 동일).
   QR 방문 전에는 EP.1 제목까지만 내보내고(본문 · 다른 Episode는 내려보내지 않는다),
   열림 판정은 기존 resolveSpaceAccess(12시간 QR 접근) + computeEpisodeState(방문 횟수)를 그대로 쓴다. ── */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LISTED_SPACE_WHERE } from "@/lib/demoData";
import { canBypassSpaceLock, resolveSpaceAccess } from "@/lib/spaceUnlock";
import { computeEpisodeState, type EpisodeState } from "@/lib/episodeState";

export interface PartnerEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  state: EpisodeState;
}

export interface PartnerEpisodes {
  /** QR 스캔(또는 관리자 · 운영자)으로 이 공간의 이야기가 열려 있는가 */
  unlocked: boolean;
  /** unlocked=false면 EP.1 하나만 들어 있다 */
  episodes: PartnerEpisode[];
}

export async function getPartnerEpisodes(slug: string): Promise<PartnerEpisodes | null> {
  const space = await prisma.space.findFirst({
    where: { slug, ...LISTED_SPACE_WHERE },
    select: { id: true, ownerId: true },
  });
  if (!space) return null;

  const [episodes, session] = await Promise.all([
    prisma.episode.findMany({
      where: { spaceId: space.id, published: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, episodeNumber: true, title: true, unlockVisitCount: true },
    }),
    auth(),
  ]);
  if (episodes.length === 0) return null;

  const userId = session?.user?.id ?? null;
  const bypass = !!userId && canBypassSpaceLock(session?.user?.email, space, userId);
  const unlocked = await resolveSpaceAccess({ userId, spaceId: space.id, isBypass: bypass });

  if (!unlocked) {
    const first = episodes[0];
    return { unlocked: false, episodes: [{ id: first.id, episodeNumber: first.episodeNumber, title: first.title, state: "LOCKED" }] };
  }

  const visitCount = userId ? await prisma.record.count({ where: { userId, spaceId: space.id } }) : 0;
  return {
    unlocked: true,
    episodes: episodes.map((e) => ({
      id: e.id, episodeNumber: e.episodeNumber, title: e.title,
      state: computeEpisodeState(e.unlockVisitCount, visitCount),
    })),
  };
}
