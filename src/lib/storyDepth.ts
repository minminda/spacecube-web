import { prisma } from "@/lib/prisma";
import { distinctVisitorCount } from "@/lib/reportMetrics";

/* ── Story Depth 분석 — 관리자 "스토리 분석" 탭 전용 ─────────────────────────────
   목적은 숫자를 늘리는 게 아니라 "방문자가 Story의 어느 Scene에서 이탈하는지"를 보여주는
   것이다. 기존 핵심 퍼널(QR Entry~Experience Complete)은 건드리지 않고, 그 퍼널의
   "Story View → Story Complete" 구간만 Scene 단위로 확대해서 보는 별도 분석이다.

   집계 단위는 프로젝트 전역 원칙과 동일하게 "몇 명"(고유 방문자, 로그인 userId 또는
   sc_anon_id 기준 anonId로 중복 제거)이다 — reportMetrics.ts의 distinctVisitorCount를
   그대로 재사용하고 새로 정의하지 않는다. Scene 도달(SceneReach)은 API 라우트에서 이미
   (userId|anonId, sceneId) 유니크 upsert로 기록되므로 count() 자체가 곧 고유 인원이다
   (GuestbookFunnelEvent와 동일한 근사). 관리자 계정은 API 라우트가 애초에 행을 만들지
   않으므로(EpisodeRead와 동일 패턴) 여기서 별도로 걸러낼 필요가 없다. ──────────────── */

export interface SceneDepthStage {
  sceneId: string;
  sceneOrder: number; // 1-based, 방문자 화면의 data-scene-order와 동일한 기준(Scene.displayOrder 순서)
  title: string | null;
  reached: number;
}

export interface EpisodeStoryDepth {
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string;
  storyViews: number;
  storyCompletions: number;
  // Scene 1은 Story View와 사실상 동시에 발생해 별도로 추적하지 않으므로 2번째 Scene부터만 담는다.
  scenes: SceneDepthStage[];
}

/**
 * 공간의 공개된 Episode마다 Story Depth(Story View → Scene 2..N 도달 → Story Complete)를
 * 계산한다. EpisodeRead/SceneReach 원본을 그대로 집계할 뿐 새로운 정의를 만들지 않는다 —
 * storyCompletions는 기존 EpisodeRead.completedAt 기준(Story Complete)과 완전히 동일하다.
 */
export async function getStoryDepthForSpace(
  spaceId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<EpisodeStoryDepth[]> {
  const episodes = await prisma.episode.findMany({
    where: { spaceId, published: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      episodeNumber: true,
      title: true,
      scenes: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
        select: { id: true, title: true },
      },
    },
  });

  if (episodes.length === 0) return [];

  const trackedSceneIds = episodes.flatMap((ep) => ep.scenes.slice(1).map((s) => s.id));

  const [reads, reachGroups] = await Promise.all([
    prisma.episodeRead.findMany({
      where: { episodeId: { in: episodes.map((ep) => ep.id) }, openedAt: { gte: periodStart, lt: periodEnd } },
      select: { episodeId: true, userId: true, anonId: true, completedAt: true },
    }),
    trackedSceneIds.length > 0
      ? prisma.sceneReach.groupBy({
          by: ["sceneId"],
          where: { sceneId: { in: trackedSceneIds }, reachedAt: { gte: periodStart, lt: periodEnd } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const reachCountBySceneId = new Map(reachGroups.map((g) => [g.sceneId, g._count._all]));

  const readsByEpisodeId = new Map<string, typeof reads>();
  for (const r of reads) {
    const list = readsByEpisodeId.get(r.episodeId) ?? [];
    list.push(r);
    readsByEpisodeId.set(r.episodeId, list);
  }

  return episodes.map((ep) => {
    const epReads = readsByEpisodeId.get(ep.id) ?? [];
    const scenes: SceneDepthStage[] = ep.scenes.slice(1).map((scene, idx) => ({
      sceneId: scene.id,
      sceneOrder: idx + 2, // slice(1)의 첫 항목이 실제로는 2번째 Scene
      title: scene.title,
      reached: reachCountBySceneId.get(scene.id) ?? 0,
    }));
    return {
      episodeId: ep.id,
      episodeNumber: ep.episodeNumber,
      episodeTitle: ep.title,
      storyViews: distinctVisitorCount(epReads),
      storyCompletions: distinctVisitorCount(epReads.filter((r) => r.completedAt != null)),
      scenes,
    };
  });
}

export interface DropOffStage {
  key: string;
  value: number;
}

export interface DropOffResult {
  fromKey: string;
  toKey: string;
  dropCount: number;
  dropRate: number | null; // 분모(직전 단계 값)가 0이면 null
}

/**
 * 순수 함수 — 연속한 단계 사이에서 가장 크게 줄어든 구간을 찾는다("문제"라고 단정하지 않고
 * 중립적으로 "가장 큰 이탈 구간"만 표시하는 데 쓴다). 값이 늘어나는 구간(여러 진입 경로가
 * 있는 퍼널이라 구조적으로 가능)은 이탈이 아니므로 후보에서 제외한다. 동률이면 먼저 나온
 * 구간을 우선한다.
 */
export function findLargestDropOff(stages: DropOffStage[]): DropOffResult | null {
  let largest: DropOffResult | null = null;
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1];
    const curr = stages[i];
    const dropCount = prev.value - curr.value;
    if (dropCount <= 0) continue;
    if (!largest || dropCount > largest.dropCount) {
      largest = {
        fromKey: prev.key,
        toKey: curr.key,
        dropCount,
        dropRate: prev.value > 0 ? dropCount / prev.value : null,
      };
    }
  }
  return largest;
}
