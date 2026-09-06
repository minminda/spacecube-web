import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { buildWeightedTasteVector, rankSpacesByVector, getVectorReason, getMatchPercent } from "@/lib/recommend";
import { getUserUnlockSets } from "@/lib/spaceUnlock";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import SpaceDiscoveryCard from "@/app/discover/SpaceDiscoveryCard";
import Divider from "@/components/Divider";
import { isAdminDemoSession } from "@/lib/adminDemo";

/* ── /archive/taste "내 취향과 비슷한 공간 TOP 3"의 전체 보기 ─────────────
   TOP3와 완전히 같은 계산(buildWeightedTasteVector → rankSpacesByVector → getVectorReason/
   getMatchPercent)을 재사용하되, limit만 늘려 가중치 순 전체 목록을 보여준다. 새 추천
   알고리즘 없음 — 지역 제한도 없이 /archive/taste가 쓰는 후보 조건(전체 활성 공간, 미방문)을
   그대로 따른다. 카드도 discover의 SpaceDiscoveryCard를 그대로 재사용한다.

   추천 점수(score>0)가 있는 공간만 보여주면 파일럿 초기(등록 공간 자체가 적음)엔 목록이
   지나치게 빈약해 보인다. rankSpacesByVector는 원래 score>0인 공간만 남기고 나머지를
   버리므로(추천 랭킹 전용 설계, 그대로 재사용), 여기서는 그 결과에 없는 "점수 없는" 공간을
   별도로 집계해 뒤에 이어붙인다 — 개인화 추천이 아니라 순수 탐색용 fallback이라는 걸
   구분하기 위해 순위 배지·매치율·추천 이유는 절대 붙이지 않는다(실제 없는 적합도를
   만들지 않는다는 원칙). fallback 순서는 요청마다 한 번만 셔플해 같은 페이지 로드 안에서는
   흔들리지 않고, 새로고침/재방문 시에는 달라지도록 한다. ── */

const CANDIDATE_SELECT = {
  id: true,
  name: true,
  slug: true,
  imageUrl: true,
  type: true,
  district: true,
  tagline: true,
  openingHours: true,
  naverMapUrl: true,
  spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
} as const;

/** Fisher-Yates — 매 렌더가 아니라 이 함수 호출 시점(요청당 1회) 기준으로만 순서를 고정한다. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default async function ArchiveTasteAllPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  // 한이음 시연 영상용 관리자 데모 — 일반 사용자 정렬(점수순+탐색 fallback)은 그대로 두고,
  // 관리자만 "미방문" 제한 없이 전체 활성 공간을 랜덤 순서로 보여준다(§adminDemo.ts).
  // 이 계정은 이미 전체 활성 공간을 방문한 상태라 기존 notIn(visitedIds) 조건대로면
  // 후보가 0개가 되어 이 페이지 자체가 비어 보이는 문제가 있었다.
  const demo = isAdminDemoSession(session.user.email);

  const records = await prisma.record.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      spaceId: true,
      visitedAt: true,
      tasteScore: true,
      space: { select: { spaceTagLinks: { include: { tag: true } } } },
    },
  });

  const header = (
    <nav className="flex justify-between items-center mb-10">
      <Link href="/archive/taste" className="text-xs" style={{ color: "var(--dim)" }}>← 내 취향</Link>
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>전체 추천 공간</p>
    </nav>
  );

  if (records.length < 3 && !demo) {
    redirect("/archive/taste");
  }

  const tasteVector = buildWeightedTasteVector(records);
  const visitedIds = new Set(records.map((r) => r.spaceId));

  const [candidates, unlockSets] = await Promise.all([
    prisma.space.findMany({
      where: demo ? { isActive: true } : { isActive: true, id: { notIn: [...visitedIds] } },
      select: CANDIDATE_SELECT,
      take: 500,
    }),
    getUserUnlockSets(user.id),
  ]);

  // 1) 추천 점수(score>0)가 있는 공간 — 점수 높은 순. 2) 점수를 계산할 수 없는 나머지 공간 —
  // 탐색용 fallback, 요청당 한 번만 섞어 뒤에 이어붙인다(가짜 적합도 부여하지 않음).
  // 관리자 데모에서는 순위/매치율을 아예 계산하지 않고 전체를 fallback 취급해 랜덤 순서로만 보여준다.
  const ranked = demo ? [] : rankSpacesByVector(candidates, tasteVector, candidates.length);
  const rankedIds = new Set(ranked.map((s) => s.id));
  const fallback = demo ? shuffle(candidates) : shuffle(candidates.filter((s) => !rankedIds.has(s.id)));

  // 관리자는 테스트 편의를 위해 모든 공간을 해제된 것으로 본다(discover/page.tsx와 동일한 기존 패턴 재사용).
  // 이게 없으면 QR로 최근에 열지 않은 공간의 카드가 "잠긴 공간"으로 표시돼 클릭해도 이동하지 않는다.
  const unlockedIds = demo ? new Set(candidates.map((s) => s.id)) : unlockSets.unlocked;

  return (
    <main className="flex flex-col min-h-screen px-6 pt-8 pb-16">
      {header}
      <section className="space-y-1 mb-8">
        <h1 className="text-xl font-bold">전체 추천 공간</h1>
        <p className="text-sm" style={{ color: "var(--dim)" }}>취향 적합도가 높은 순으로 모두 보여드려요</p>
      </section>

      {ranked.length === 0 && fallback.length === 0 ? (
        <section className="flex-1 flex flex-col justify-center items-center gap-4 text-center py-16">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            아직 둘러볼 수 있는 공간이 없어요<br />
            새로운 공간이 열리면 알려드릴게요
          </p>
          <Link href="/archive/taste" className="text-sm" style={{ color: "var(--fg)" }}>내 취향으로 돌아가기</Link>
        </section>
      ) : (
        <>
          {ranked.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {ranked.map((s, i) => (
                <SpaceCard
                  key={s.id}
                  space={s}
                  isUnlocked={unlockedIds.has(s.id)}
                  rank={i + 1}
                  matchPercent={getMatchPercent(s, tasteVector)}
                  recommendationReason={getVectorReason(s, tasteVector)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--dim)" }}>
              아직 취향에 꼭 맞는 공간을 찾지 못했어요<br />
              대신 둘러볼 수 있는 공간들을 보여드려요
            </p>
          )}

          {fallback.length > 0 && (
            <>
              {ranked.length > 0 && <Divider className="my-10" />}
              <p className="text-xs uppercase tracking-widest mb-5" style={{ color: "var(--dim)" }}>
                그 외 둘러볼 수 있는 공간
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {fallback.map((s) => (
                  <SpaceCard
                    key={s.id}
                    space={s}
                    isUnlocked={unlockedIds.has(s.id)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}

interface SpaceCardProps {
  space: {
    id: string; slug: string; name: string; type: string; district: string | null;
    tagline: string | null; openingHours: string | null; imageUrl: string | null; naverMapUrl: string | null;
    spaceTagLinks: Parameters<typeof resolveSpaceTypeLabel>[0];
  };
  isUnlocked: boolean;
  /** 아래 세 값이 전부 없으면 순수 탐색용 fallback 카드 — 순위·매치율·추천 이유를 절대 지어내지 않는다. */
  rank?: number;
  matchPercent?: number;
  recommendationReason?: string;
}

function SpaceCard({ space: s, isUnlocked, rank, matchPercent, recommendationReason }: SpaceCardProps) {
  return (
    <SpaceDiscoveryCard
      rank={rank}
      space={{
        id: s.id,
        slug: s.slug,
        name: s.name,
        type: resolveSpaceTypeLabel(s.spaceTagLinks, s.type),
        district: s.district,
        tagline: s.tagline,
        openingHours: s.openingHours,
        imageUrl: s.imageUrl,
        naverMapUrl: s.naverMapUrl,
      }}
      isUnlocked={isUnlocked}
      variant="recommended"
      matchPercent={matchPercent}
      recommendationReason={recommendationReason}
    />
  );
}
