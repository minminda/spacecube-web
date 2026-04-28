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
    lovedBy:      lang === "ko" ? "이 공간을 좋아한 사람들" : lang === "ja" ? "この空間が好きな人たち" : lang === "zh" ? "喜欢这个空间的人" : "People Who Loved This Space",
    viewTaste:    lang === "ko" ? "취향 보기 →" : lang === "ja" ? "好みを見る →" : lang === "zh" ? "查看品味 →" : "View taste →",
    editRecord:   lang === "ko" ? "기록 수정하기" : lang === "ja" ? "記録を編集する" : lang === "zh" ? "编辑记录" : "Edit Record",
    leaveRecord:  lang === "ko" ? "이 공간, 기록 남기기" : lang === "ja" ? "この空間を記録する" : lang === "zh" ? "记录这个空间" : "Leave a Record",
    signInRecord: lang === "ko" ? "로그인하고 기록 남기기" : lang === "ja" ? "ログインして記録する" : lang === "zh" ? "登录后记录" : "Sign In to Leave a Record",
    home:         lang === "ko" ? "홈" : lang === "ja" ? "ホーム" : lang === "zh" ? "首页" : "Home",
  };

  return (
    <main className="flex flex-col min-h-screen">
      {/* Hero image */}
      {space.imageUrl && (
        <div className="relative w-full flex-shrink-0" style={{ aspectRatio: "16 / 11" }}>
          <Image src={space.imageUrl} alt={space.name} fill className="object-cover" />
        </div>
      )}

      <div className="flex flex-col gap-6 px-6 py-6 flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>SPACECUBE</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← {t.home}</Link>
        </div>

        <div style={{ borderTop: "1px solid var(--border)" }} />

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold leading-tight">{space.name}</h1>
          {space.tagline && (
            <p className="text-sm leading-relaxed italic" style={{ color: "var(--dim)" }}>{space.tagline}</p>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm" style={{ color: "var(--dim)" }}>
          {space.naverMapUrl ? (
            <a href={space.naverMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:underline">
              <span className="text-xs uppercase tracking-widest flex-shrink-0 mt-0.5">{t.location}</span>
              <span>{space.location} ↗</span>
            </a>
          ) : (
            <div className="flex items-start gap-3">
              <span className="text-xs uppercase tracking-widest flex-shrink-0 mt-0.5">{t.location}</span>
              <span>{space.location}</span>
            </div>
          )}
          {space.openingHours && (
            <div className="flex items-start gap-3">
              <span className="text-xs uppercase tracking-widest flex-shrink-0 mt-0.5">{t.hours}</span>
              <span>{space.openingHours}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)" }} />

        <SpaceStory
          description={space.description}
          philosophy={space.philosophy}
          ownerMessage={space.ownerMessage}
          experienceGuide={space.experienceGuide}
          spacePoints={space.spacePoints}
          lang={lang}
        />

        {publicRecords.length > 0 && (
          <>
            <div style={{ borderTop: "1px solid var(--border)" }} />
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.lovedBy}</p>
              {publicRecords.map((r) => {
                const name = r.user.nickname || r.user.name?.split(" ")[0] || anon;
                return (
                  <div key={r.id} className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-medium">{name}</p>
                      <Link href={`/u/${r.user.id}`} className="text-xs hover:underline flex-shrink-0 ml-3" style={{ color: "var(--dim)" }}>{t.viewTaste}</Link>
                    </div>
                    {r.memo && (
                      <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>&ldquo;{r.memo}&rdquo;</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 px-6 pb-8 pt-4" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        {session ? (
          <Link
            href={`/space/${slug}/record`}
            className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            {hasRecord ? t.editRecord : t.leaveRecord}
          </Link>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            {t.signInRecord}
          </Link>
        )}
      </div>
    </main>
  );
}
