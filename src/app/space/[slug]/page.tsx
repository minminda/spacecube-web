import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { name: true, tagline: true, description: true, imageUrl: true },
  });
  if (!space) return {};

  const description = space.tagline ?? space.description.slice(0, 100);
  return {
    title: `${space.name} — SPACECUBE`,
    description,
    openGraph: {
      title: space.name,
      description,
      images: space.imageUrl ? [{ url: space.imageUrl }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: space.name,
      description,
      images: space.imageUrl ? [space.imageUrl] : [],
    },
  };
}

export default async function SpacePage({ params }: Props) {
  const { slug } = await params;
  const space = await prisma.space.findUnique({ where: { slug, isActive: true } });
  if (!space) notFound();

  const session = await auth();
  let hasRecord = false;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user) {
      const record = await prisma.record.findUnique({
        where: { userId_spaceId: { userId: user.id, spaceId: space.id } },
      });
      hasRecord = !!record;
    }
  }

  // 이 공간을 좋아한 사람들 (PARTIAL 공개 유저만)
  const publicRecords = await prisma.record.findMany({
    where: {
      spaceId: space.id,
      user: { visibility: "PARTIAL" },
    },
    include: {
      user: { select: { id: true, nickname: true, name: true } },
    },
    orderBy: { visitedAt: "desc" },
    take: 5,
  });

  return (
    <main className="flex flex-col min-h-screen">
      {/* 대표 이미지 */}
      {space.imageUrl && (
        <div className="relative w-full h-52 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <Image src={space.imageUrl} alt={space.name} fill className="object-cover opacity-60" />
        </div>
      )}

      <div className="flex flex-col gap-6 px-6 py-6 flex-1">
        {/* 헤더 */}
        <div className="space-y-1" style={{ color: "var(--dim)" }}>
          <p className="text-xs">SPACECUBE / SPACE</p>
          <p className="text-xs">─────────────────────────────</p>
        </div>

        {/* 공간 이름 + 핵심 한 줄 */}
        <div className="space-y-2">
          <p className="text-lg tracking-wide">{space.name}</p>
          {space.tagline && (
            <p className="text-sm italic" style={{ color: "var(--dim)" }}>
              &ldquo;{space.tagline}&rdquo;
            </p>
          )}
        </div>

        {/* 핵심 정보 (위치 + 운영시간) */}
        <div className="space-y-1 text-xs" style={{ color: "var(--dim)" }}>
          {space.naverMapUrl ? (
            <a
              href={space.naverMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:underline"
              style={{ color: "var(--dim)" }}
            >
              &gt; 위치 : {space.location} ↗
            </a>
          ) : (
            <p>&gt; 위치 : {space.location}</p>
          )}
          {space.openingHours && (
            <p>&gt; 운영 : {space.openingHours}</p>
          )}
        </div>

        <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

        {/* 섹션 1: 공간 해석 */}
        <div className="space-y-4">
          <p className="text-xs" style={{ color: "var(--dim)" }}>// 공간 해석</p>

          <div className="space-y-2">
            <p className="text-sm leading-relaxed whitespace-pre-line">{space.description}</p>
          </div>

          {space.philosophy && (
            <div className="space-y-1">
              <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 왜 만들었나</p>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
                {space.philosophy}
              </p>
            </div>
          )}

          {space.ownerMessage && (
            <div className="space-y-1">
              <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 운영자의 말</p>
              <p className="text-sm" style={{ color: "var(--fg)" }}>
                &ldquo;{space.ownerMessage}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* 섹션 2: 경험 가이드 */}
        {space.experienceGuide && (
          <>
            <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>
            <div className="space-y-3">
              <p className="text-xs" style={{ color: "var(--dim)" }}>// 경험 가이드</p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{space.experienceGuide}</p>
            </div>
          </>
        )}

        {/* 섹션 3: 공간 포인트 */}
        {space.spacePoints && (
          <>
            <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>
            <div className="space-y-3">
              <p className="text-xs" style={{ color: "var(--dim)" }}>// 공간 포인트</p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{space.spacePoints}</p>
            </div>
          </>
        )}

        <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

        <p className="text-xs" style={{ color: "var(--dim)" }}>
          &gt; 이 공간의 이야기는 공간에서 열립니다.
        </p>

        {/* 이 공간을 좋아한 사람들 */}
        {publicRecords.length > 0 && (
          <>
            <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>
            <div className="space-y-4">
              <p className="text-xs" style={{ color: "var(--dim)" }}>이 공간을 좋아한 사람들</p>
              {publicRecords.map((r) => {
                const name = r.user.nickname || r.user.name?.split(" ")[0] || "익명";
                return (
                  <Link
                    key={r.id}
                    href={`/u/${r.user.id}`}
                    className="block space-y-0.5 group"
                  >
                    <p className="text-sm group-hover:underline" style={{ color: "var(--fg)" }}>
                      {name}
                    </p>
                    {r.memo && (
                      <p className="text-xs" style={{ color: "var(--dim)" }}>
                        &ldquo;{r.memo}&rdquo;
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 기록 버튼 */}
      <div className="sticky bottom-0 px-6 pb-8 pt-4" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        {session ? (
          <Link
            href={`/space/${slug}/record`}
            className="block w-full text-center text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            {hasRecord ? "[[ 기록 수정하기 ]]" : "[[ 이 공간, 기록 남기기 ]]"}
          </Link>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            [[ 로그인하고 기록 남기기 ]]
          </Link>
        )}
      </div>
    </main>
  );
}
