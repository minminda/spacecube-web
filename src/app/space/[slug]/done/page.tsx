import Link from "next/link";
import Image from "next/image";
import { Tag } from "@prisma/client";
import { TAG_LABELS } from "@/lib/tags";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { rankSpaces } from "@/lib/recommend";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ name?: string; tags?: string }>;
}

export default async function DonePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { name, tags } = await searchParams;

  const defaultSpaceName = "이 공간";
  const spaceName = name ? decodeURIComponent(name) : defaultSpaceName;
  const tagList = tags ? (tags.split(",").filter((t) => t in TAG_LABELS) as Tag[]) : [];

  let recommended: { id: string; name: string; slug: string; tagline: string | null; imageUrl: string | null; type: string; district: string | null }[] = [];

  const session = await auth();
  const space = await prisma.space.findUnique({ where: { slug, isActive: true }, select: { id: true, district: true, spaceTags: true } });

  if (space && session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user) {
      const visited = await prisma.record.findMany({ where: { userId: user.id }, select: { spaceId: true } });
      const visitedIds = new Set(visited.map((r) => r.spaceId));
      const candidates = await prisma.space.findMany({
        where: { isActive: true, id: { notIn: [...visitedIds] }, ...(space.district ? { district: space.district } : {}) },
        select: { id: true, name: true, slug: true, tagline: true, imageUrl: true, type: true, district: true, spaceTags: true },
        take: 20,
      });
      recommended = rankSpaces(candidates, tagList, "similar", 2);
      if (recommended.length === 0 && space.district) {
        const broader = await prisma.space.findMany({
          where: { isActive: true, id: { notIn: [...visitedIds] } },
          select: { id: true, name: true, slug: true, tagline: true, imageUrl: true, type: true, district: true, spaceTags: true },
          take: 20,
        });
        recommended = rankSpaces(broader, tagList, "similar", 2);
      }
    }
  }

  return (
    <main className="flex flex-col min-h-screen px-6 pt-16 pb-12 gap-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>아카이브에 저장됐어.</p>
        <h1 className="text-2xl font-bold leading-tight">{spaceName}</h1>
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tagList.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 border"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {recommended.length > 0 && (
        <>
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
              {space?.district ? `${space.district} 근처 추천 공간` : "취향 기반 추천"}
            </p>
            {recommended.map((rec) => (
              <Link key={rec.id} href={`/space/${rec.slug}`} className="flex gap-4 group">
                {rec.imageUrl && (
                  <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden">
                    <Image src={rec.imageUrl} alt={rec.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                )}
                <div className="flex flex-col justify-center gap-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:underline">{rec.name}</p>
                  {rec.tagline && (
                    <p className="text-xs truncate leading-relaxed" style={{ color: "var(--dim)" }}>{rec.tagline}</p>
                  )}
                  {rec.district && (
                    <p className="text-xs" style={{ color: "var(--dim)" }}>{rec.district}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)" }} />
        </>
      )}

      <div className="space-y-3">
        <Link
          href="/archive"
          className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          내 아카이브 보기
        </Link>
        <Link href="/" className="block text-xs text-center py-2" style={{ color: "var(--dim)" }}>
          홈으로
        </Link>
      </div>
    </main>
  );
}
