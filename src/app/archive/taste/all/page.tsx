import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { buildWeightedTasteVector, rankSpacesByVector, getVectorReason, getMatchPercent } from "@/lib/recommend";
import { getUserUnlockSets } from "@/lib/spaceUnlock";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import SpaceDiscoveryCard from "@/app/discover/SpaceDiscoveryCard";

/* ── /archive/taste "내 취향과 비슷한 공간 TOP 3"의 전체 보기 ─────────────
   TOP3와 완전히 같은 계산(buildWeightedTasteVector → rankSpacesByVector → getVectorReason/
   getMatchPercent)을 재사용하되, limit만 늘려 가중치 순 전체 목록을 보여준다. 새 추천
   알고리즘 없음 — 지역 제한도 없이 /archive/taste가 쓰는 후보 조건(전체 활성 공간, 미방문)을
   그대로 따른다. 카드도 discover의 SpaceDiscoveryCard를 그대로 재사용한다. ── */

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

export default async function ArchiveTasteAllPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

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

  if (records.length < 3) {
    redirect("/archive/taste");
  }

  const tasteVector = buildWeightedTasteVector(records);
  const visitedIds = new Set(records.map((r) => r.spaceId));

  const [candidates, unlockSets] = await Promise.all([
    prisma.space.findMany({
      where: { isActive: true, id: { notIn: [...visitedIds] } },
      select: CANDIDATE_SELECT,
      take: 100,
    }),
    getUserUnlockSets(user.id),
  ]);
  const ranked = rankSpacesByVector(candidates, tasteVector, candidates.length);

  return (
    <main className="flex flex-col min-h-screen px-6 pt-8 pb-16">
      {header}
      <section className="space-y-1 mb-8">
        <h1 className="text-xl font-bold">전체 추천 공간</h1>
        <p className="text-sm" style={{ color: "var(--dim)" }}>취향 적합도가 높은 순으로 모두 보여드려요</p>
      </section>

      {ranked.length === 0 ? (
        <section className="flex-1 flex flex-col justify-center items-center gap-4 text-center py-16">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            아직 취향에 꼭 맞는 공간을 찾지 못했어요<br />
            새로운 공간이 열리면 알려드릴게요
          </p>
          <Link href="/archive/taste" className="text-sm" style={{ color: "var(--fg)" }}>내 취향으로 돌아가기</Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {ranked.map((s, i) => (
            <SpaceDiscoveryCard
              key={s.id}
              rank={i + 1}
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
              isUnlocked={unlockSets.unlocked.has(s.id)}
              variant="recommended"
              matchPercent={getMatchPercent(s, tasteVector)}
              recommendationReason={getVectorReason(s, tasteVector)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
