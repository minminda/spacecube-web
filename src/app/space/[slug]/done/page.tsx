import Link from "next/link";
import Image from "next/image";
import { Tag } from "@prisma/client";
import { getTagLabels } from "@/lib/tags";
import { getLang } from "@/lib/i18n";
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

  const lang = await getLang();
  const TAG_LABELS = getTagLabels(lang);

  const defaultSpaceName = lang === "ko" ? "이 공간" : lang === "ja" ? "この空間" : lang === "zh" ? "这个空间" : "this space";
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
        select: { id: true, name: true, slug: true, tagline: true, imageUrl: true, type: true, district: true, spaceTags: true, lat: true, lng: true },
        take: 20,
      });
      recommended = rankSpaces(candidates, tagList, "similar", 2);
      if (recommended.length === 0 && space.district) {
        const broader = await prisma.space.findMany({
          where: { isActive: true, id: { notIn: [...visitedIds] } },
          select: { id: true, name: true, slug: true, tagline: true, imageUrl: true, type: true, district: true, spaceTags: true, lat: true, lng: true },
          take: 20,
        });
        recommended = rankSpaces(broader, tagList, "similar", 2);
      }
    }
  }

  const t = {
    saved:       lang === "ko" ? "아카이브에 저장됐어." : lang === "ja" ? "アーカイブに保存されました。" : lang === "zh" ? "已保存到档案。" : "Saved to your archive.",
    nextSpace:   lang === "ko" ? "다음 공간" : lang === "ja" ? "次の空間" : lang === "zh" ? "下一个空间" : "Next Space",
    nearBy: space?.district
      ? (lang === "ko" ? `${space.district} 근처로 이런 공간도 있어.` : lang === "ja" ? `${space.district}周辺のおすすめ空間です。` : lang === "zh" ? `${space.district}附近还有这些空间。` : `More spaces near ${space.district}.`)
      : (lang === "ko" ? "취향 기반으로 이런 공간도 있어." : lang === "ja" ? "好みに合った空間もあります。" : lang === "zh" ? "根据你的品味，还有这些空间。" : "You might also like these spaces."),
    viewArchive: lang === "ko" ? "[[ 내 아카이브 보기 ]]" : lang === "ja" ? "[[ マイアーカイブを見る ]]" : lang === "zh" ? "[[ 查看我的档案 ]]" : "[[ View My Archive ]]",
    goHome:      lang === "ko" ? "홈으로" : lang === "ja" ? "ホームへ" : lang === "zh" ? "回到首页" : "Go Home",
  };

  return (
    <main className="flex flex-col justify-center min-h-screen px-6 py-12 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">SPACECUBE / DONE</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-3">
        <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; {t.saved}</p>
        <p className="text-lg">□ {spaceName}</p>
        {tagList.length > 0 && <p className="text-sm" style={{ color: "var(--dim)" }}>{tagList.map((tag) => `[${TAG_LABELS[tag]}]`).join(" ")}</p>}
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {recommended.length > 0 && (
        <>
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--dim)" }}>// {t.nextSpace}</p>
            <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; {t.nearBy}</p>
            <div className="space-y-2">
              {recommended.map((rec) => (
                <Link key={rec.id} href={`/space/${rec.slug}`} className="flex gap-3 p-3 border transition-colors hover:border-[var(--fg)]" style={{ borderColor: "var(--border)" }}>
                  {rec.imageUrl && (
                    <div className="relative w-12 h-12 flex-shrink-0 overflow-hidden">
                      <Image src={rec.imageUrl} alt={rec.name} fill className="object-cover opacity-60" />
                    </div>
                  )}
                  <div className="flex flex-col justify-center gap-1 min-w-0">
                    <p className="text-sm truncate">&gt; {rec.name}</p>
                    {rec.tagline && <p className="text-xs truncate italic" style={{ color: "var(--dim)" }}>&ldquo;{rec.tagline}&rdquo;</p>}
                    {rec.district && <p className="text-xs" style={{ color: "var(--dim)" }}>[{rec.district}]</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>
        </>
      )}

      <div className="space-y-3">
        <Link href="/archive" className="block w-full text-center text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors" style={{ borderColor: "var(--fg)" }}>
          {t.viewArchive}
        </Link>
        <Link href="/" className="block text-xs text-center" style={{ color: "var(--dim)" }}>&lt; {t.goHome}</Link>
      </div>
    </main>
  );
}
