import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getLang } from "@/lib/i18n";
import { getTagLabels } from "@/lib/tags";
import type { Metadata } from "next";
import SpaceStory from "./SpaceStory";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const space = await prisma.space.findUnique({ where: { slug, isActive: true }, select: { name: true, tagline: true, description: true, imageUrl: true } });
  if (!space) return {};
  const description = space.tagline ?? space.description.slice(0, 100);
  return {
    title: `${space.name} — SPACECUBE`, description,
    openGraph: { title: space.name, description, images: space.imageUrl ? [{ url: space.imageUrl }] : [], type: "website" },
    twitter:   { card: "summary_large_image", title: space.name, description, images: space.imageUrl ? [space.imageUrl] : [] },
  };
}

export default async function SpacePage({ params }: Props) {
  const { slug } = await params;
  const space = await prisma.space.findUnique({ where: { slug, isActive: true } });
  if (!space) notFound();

  const session = await auth();
  const lang = await getLang();
  const TAG_LABELS = getTagLabels(lang);
  const anon = lang === "ko" ? "익명" : lang === "zh" ? "匿名" : lang === "ja" ? "匿名" : "Anonymous";

  let hasRecord = false;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user) {
      const record = await prisma.record.findUnique({ where: { userId_spaceId: { userId: user.id, spaceId: space.id } } });
      hasRecord = !!record;
    }
  }

  const publicRecords = await prisma.record.findMany({
    where: { spaceId: space.id, user: { visibility: "PARTIAL" } },
    include: { user: { select: { id: true, nickname: true, name: true } } },
    orderBy: { visitedAt: "desc" }, take: 5,
  });

  const t = {
    location:     lang === "ko" ? "위치" : lang === "ja" ? "場所" : lang === "zh" ? "位置" : "Location",
    hours:        lang === "ko" ? "운영" : lang === "ja" ? "営業時間" : lang === "zh" ? "营业时间" : "Hours",
    storyNote:    lang === "ko" ? "이 공간의 이야기는 공간에서 열립니다." : lang === "ja" ? "この空間のストーリーは現地で始まります。" : lang === "zh" ? "这个空间的故事在现场展开。" : "The story of this space unfolds within.",
    lovedBy:      lang === "ko" ? "이 공간을 좋아한 사람들" : lang === "ja" ? "この空間が好きな人たち" : lang === "zh" ? "喜欢这个空间的人" : "People Who Loved This Space",
    viewTaste:    lang === "ko" ? "이 취향 보기 →" : lang === "ja" ? "この好みを見る →" : lang === "zh" ? "查看品味 →" : "View taste →",
    editRecord:   lang === "ko" ? "[[ 기록 수정하기 ]]" : lang === "ja" ? "[[ 記録を編集する ]]" : lang === "zh" ? "[[ 编辑记录 ]]" : "[[ Edit Record ]]",
    leaveRecord:  lang === "ko" ? "[[ 이 공간, 기록 남기기 ]]" : lang === "ja" ? "[[ この空間を記録する ]]" : lang === "zh" ? "[[ 记录这个空间 ]]" : "[[ Leave a Record ]]",
    signInRecord: lang === "ko" ? "[[ 로그인하고 기록 남기기 ]]" : lang === "ja" ? "[[ ログインして記録する ]]" : lang === "zh" ? "[[ 登录后记录 ]]" : "[[ Sign In to Leave a Record ]]",
  };

  return (
    <main className="flex flex-col min-h-screen">
      {space.imageUrl && (
        <div className="relative w-full h-52 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <Image src={space.imageUrl} alt={space.name} fill className="object-cover opacity-60" />
        </div>
      )}

      <div className="flex flex-col gap-6 px-6 py-6 flex-1">
        <div className="space-y-1" style={{ color: "var(--dim)" }}>
          <p className="text-xs">SPACECUBE / SPACE</p>
          <p className="text-xs">─────────────────────────────</p>
        </div>

        <div className="space-y-2">
          <p className="text-lg tracking-wide">{space.name}</p>
          {space.tagline && <p className="text-sm italic" style={{ color: "var(--dim)" }}>&ldquo;{space.tagline}&rdquo;</p>}
        </div>

        <div className="space-y-1 text-xs" style={{ color: "var(--dim)" }}>
          {space.naverMapUrl ? (
            <a href={space.naverMapUrl} target="_blank" rel="noopener noreferrer" className="block hover:underline" style={{ color: "var(--dim)" }}>
              &gt; {t.location} : {space.location} ↗
            </a>
          ) : <p>&gt; {t.location} : {space.location}</p>}
          {space.openingHours && <p>&gt; {t.hours} : {space.openingHours}</p>}
        </div>

        <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

        <SpaceStory description={space.description} philosophy={space.philosophy} ownerMessage={space.ownerMessage} experienceGuide={space.experienceGuide} spacePoints={space.spacePoints} lang={lang} />

        <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>
        <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; {t.storyNote}</p>

        {publicRecords.length > 0 && (
          <>
            <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>
            <div className="space-y-4">
              <p className="text-xs" style={{ color: "var(--dim)" }}>{t.lovedBy}</p>
              {publicRecords.map((r) => {
                const name = r.user.nickname || r.user.name?.split(" ")[0] || anon;
                return (
                  <div key={r.id} className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm" style={{ color: "var(--fg)" }}>{name}</p>
                      <Link href={`/u/${r.user.id}`} className="text-xs hover:underline flex-shrink-0 ml-3" style={{ color: "var(--dim)" }}>{t.viewTaste}</Link>
                    </div>
                    {r.memo && <p className="text-xs" style={{ color: "var(--dim)" }}>&ldquo;{r.memo}&rdquo;</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 px-6 pb-8 pt-4" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        {session ? (
          <Link href={`/space/${slug}/record`}
            className="block w-full text-center text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}>
            {hasRecord ? t.editRecord : t.leaveRecord}
          </Link>
        ) : (
          <Link href="/login"
            className="block w-full text-center text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}>
            {t.signInRecord}
          </Link>
        )}
      </div>
    </main>
  );
}
