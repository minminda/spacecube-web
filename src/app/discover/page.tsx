import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { aggregateTags } from "@/lib/taste";
import { scoreSpace } from "@/lib/recommend";
import SpaceCards from "./SpaceCards";

interface Props {
  searchParams: Promise<{ district?: string }>;
}

export default async function DiscoverPage({ searchParams }: Props) {
  const { district } = await searchParams;
  if (!district) redirect("/");

  // 공간 목록 조회 (취향 점수 계산용 spaceTags 포함)
  const spacesRaw = await prisma.space.findMany({
    where: { district, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, name: true, tagline: true,
      type: true, openingHours: true, imageUrl: true,
      district: true, spaceTags: true,
    },
  });

  // 기본: 등록 순 정렬
  let tasteSort = false;
  let spaces = spacesRaw.map(({ spaceTags: _t, district: _d, ...rest }) => rest);

  // 로그인 사용자 기록이 3개 이상이면 취향 기반 정렬
  const session = await auth();
  if (session?.user?.email && spacesRaw.length > 0) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (user) {
      const userRecords = await prisma.record.findMany({
        where: { userId: user.id },
        include: { tags: true },
      });
      if (userRecords.length >= 3) {
        const userTopTags = aggregateTags(userRecords).slice(0, 3).map(([t]) => t);
        // SpaceCandidate 타입 손실 없이 spacesRaw 원본을 점수 기준으로 직접 정렬
        const sorted = [...spacesRaw].sort(
          (a, b) => scoreSpace(b, userTopTags) - scoreSpace(a, userTopTags),
        );
        spaces = sorted.map(({ spaceTags: _t, district: _d, ...rest }) => rest);
        tasteSort = true;
      }
    }
  }

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <nav className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
      </nav>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>지금 탐험할 지역</p>
        <h1 className="text-3xl font-bold">{district}</h1>
      </div>

      {spaces.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            아직 {district}에 등록된 공간이 없어. 조금 기다려봐.
          </p>
          <Link href="/" className="text-sm" style={{ color: "var(--dim)" }}>다른 지역 보기 →</Link>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
              {spaces.length}곳 발견
            </p>
            {tasteSort && (
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                당신의 취향과 닮은 순으로 정렬되었습니다.
              </p>
            )}
          </div>
          <SpaceCards spaces={spaces} />
        </>
      )}
    </main>
  );
}
