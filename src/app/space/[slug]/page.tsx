import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { Metadata } from "next";
import SpaceStory from "./SpaceStory";

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

        {/* 스토리 섹션 (탭해서 열기) */}
        <SpaceStory
          description={space.description}
          philosophy={space.philosophy}
          ownerMessage={space.ownerMessage}
          experienceGuide={space.experienceGuide}
          spacePoints={space.spacePoints}
        />

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
                  <div key={r.id} className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm" style={{ color: "var(--fg)" }}>{name}</p>
                      <Link
                        href={`/u/${r.user.id}`}
                        className="text-xs hover:underline flex-shrink-0 ml-3"
                        style={{ color: "var(--dim)" }}
                      >
                        이 취향 보기 →
                      </Link>
                    </div>
                    {r.memo && (
                      <p className="text-xs" style={{ color: "var(--dim)" }}>
                        &ldquo;{r.memo}&rdquo;
                      </p>
                    )}
                  </div>
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
