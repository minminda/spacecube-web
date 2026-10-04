import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import { CollectionCard, CuratorAvatar, PrototypeBanner } from "@/components/curators/CuratorBits";
import { FollowTasteButton } from "@/components/profile/ProfileActions";
import { prisma } from "@/lib/prisma";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { curatorAccess } from "@/lib/curators/access";
import { getCuratorBySlug } from "@/lib/curators/queries";
import { getViewerCuratorContext } from "@/lib/curators/viewerTaste";

export const metadata: Metadata = { title: "CURATOR — 공간큐브", robots: { index: false } };

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * 큐레이터 프로필 — "이 사람은 어떤 공간을 고르는 사람인가"가 한눈에 보이게.
 * 이름 · 소개 · 링크 · (공개 프로필이 있으면) 취향 따라가기 → 컬렉션. 취향은 태그·통계로 설명하지 않는다 —
 * 고른 공간(컬렉션 사진)을 보면 느껴지게. 취향 가중치는 추천 정렬에서만 쓴다. 팔로워 수·좋아요 없음.
 */
export default async function CuratorProfilePage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  const access = curatorAccess(viewer);
  if (!access.enabled) notFound();

  const data = await getCuratorBySlug(slug, access);
  if (!data) notFound();
  const { curator, collections } = data;
  const isMe = viewer.userId === curator.userId;
  const viewerCtx = viewer.userId && !isMe ? await getViewerCuratorContext(viewer.userId, access) : null;
  const myAffinity = viewerCtx?.affinities.find((a) => a.curator.slug === curator.slug) ?? null;
  // 큐레이터의 사용자 공개 프로필(있을 때만) — 취향 따라가기는 일반 사용자와 같은 관계(SavedTaste)
  const owner = await prisma.user.findUnique({ where: { id: curator.userId }, select: { profilePublic: true, profileHandle: true, isDemo: true } });
  const followHandle = owner?.profilePublic && owner.profileHandle && !owner.isDemo ? owner.profileHandle : null;
  const followingCurator = !!(followHandle && viewer.userId && (await prisma.savedTaste.findUnique({ where: { userId_targetUserId: { userId: viewer.userId, targetUserId: curator.userId } }, select: { id: true } })));

  const links = [
    curator.instagramUrl ? { href: curator.instagramUrl, label: curator.instagramHandle ? `Instagram @${curator.instagramHandle}` : "Instagram" } : null,
    curator.websiteUrl ? { href: curator.websiteUrl, label: "Website" } : null,
  ].filter((l): l is { href: string; label: string } => !!l);

  return (
    <div className="editorial-bleed">
      <PrototypeBanner demo={access.includeDemo} />
      <main className="pb-20 md:pb-28">
        <header className="ed-container pt-10 md:pt-16 pb-10" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
          <Link href="/curators" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← CURATORS</Link>
          <div className="pt-8 grid gap-8 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7 flex items-start gap-5">
              <CuratorAvatar name={curator.name} imageUrl={curator.imageUrl} size={72} />
              <div className="space-y-3 min-w-0">
                <p className="ed-label" style={{ color: "var(--ed-dim)" }}>
                  {curator.isOfficial ? "Official Curator" : "Curator"}
                  {curator.isDemo ? " · 가상 큐레이터" : ""}
                  {isMe ? " · 내 큐레이터 프로필" : ""}
                </p>
                <h1 className="text-[40px] md:text-[64px] font-bold leading-none tracking-[-0.04em]">{curator.name}</h1>
                <p className="text-base md:text-xl leading-relaxed break-keep">{curator.bio}</p>
                {links.length > 0 && (
                  <p className="flex flex-wrap gap-4 text-sm">
                    {links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline underline-offset-4">{l.label} ↗</a>)}
                  </p>
                )}
              </div>
            </div>
            <div className="md:col-span-5 space-y-3 md:text-right">
              {/* 큐레이터도 같은 사용자 — 공개 프로필이 있으면 같은 "취향 따라가기"(별도 큐레이터 팔로우 없음) */}
              {!isMe && followHandle && <FollowTasteButton handle={followHandle} initialFollowing={followingCurator} loggedIn={viewer.loggedIn} returnTo={`/curators/${curator.slug}`} />}
              {myAffinity && myAffinity.sharedSpaceIds.length > 0 && (
                <p className="text-xs" style={{ color: "var(--ed-dim)" }}>함께 좋아하는 공간 {myAffinity.sharedSpaceIds.length}곳</p>
              )}
            </div>
          </div>
        </header>

        <section className="ed-container pt-12 md:pt-16">
          <p className="ed-label pb-6" style={{ color: "var(--ed-dim)" }}>{curator.name}의 Collections · {collections.length}</p>
          {collections.length === 0 ? (
            <p className="text-base" style={{ color: "var(--ed-dim)" }}>아직 공개한 컬렉션이 없어요.</p>
          ) : (
            <div className="grid gap-12 md:grid-cols-3 md:gap-x-10 md:gap-y-16">
              {collections.map((c) => <CollectionCard key={c.id} c={c} showCurator={false} />)}
            </div>
          )}
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
