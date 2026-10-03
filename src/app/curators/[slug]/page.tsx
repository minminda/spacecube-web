import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import { CollectionCard, CuratorAvatar, PrototypeBanner, TasteChips } from "@/components/curators/CuratorBits";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { curatorAccess } from "@/lib/curators/access";
import { getCuratorBySlug } from "@/lib/curators/queries";
import { getViewerCuratorContext } from "@/lib/curators/viewerTaste";
import { AFFINITY_LABEL, affinityReason } from "@/lib/curators/affinity";
import { curatorDisplayName } from "@/lib/curators/finder";
import { attrKey } from "@/lib/discoveryRecommend";

export const metadata: Metadata = { title: "CURATOR — 공간큐브", robots: { index: false } };

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * 큐레이터 프로필 — "이 사람은 어떤 공간을 고르는 사람인가"가 한눈에 보이게.
 * 대표 취향(선언) → 고른 공간에 실제로 자주 나오는 특징(개수) → 나와의 취향 겹침 → 컬렉션.
 * 숫자는 실제로 센 개수만 쓴다(점수·% 없음). 팔로워·좋아요 없음.
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

  // 이 큐레이터가 고른 공간들에 실제로 자주 나오는 특징(공간 유형·태그) — 공간 단위로 센다.
  const counts = new Map<string, { label: string; n: number }>();
  const seen = new Set<string>();
  for (const col of collections) for (const p of col.picks) {
    if (seen.has(p.space.id)) continue;
    seen.add(p.space.id);
    for (const a of new Set([p.space.category, ...(p.space.tags ?? [])])) {
      const k = attrKey(a);
      if (!k) continue;
      counts.set(k, { label: counts.get(k)?.label ?? a, n: (counts.get(k)?.n ?? 0) + 1 });
    }
  }
  const frequent = [...counts.values()].filter((c) => c.n >= 2).sort((a, b) => b.n - a.n).slice(0, 6);
  const displayName = curatorDisplayName(curator);
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
            <div className="md:col-span-5 space-y-5">
              <div>
                <p className="ed-label pb-2" style={{ color: "var(--ed-dim)" }}>대표 취향</p>
                <TasteChips tags={curator.tasteTags} size="md" />
              </div>
              {frequent.length > 0 && (
                <div>
                  <p className="ed-label pb-2" style={{ color: "var(--ed-dim)" }}>고른 공간 {curator.spaceCount}곳에 자주 나오는 특징</p>
                  <p className="text-sm leading-relaxed">
                    {frequent.map((f, i) => (
                      <span key={f.label}>
                        {i > 0 && <span style={{ color: "var(--ed-line)" }}> / </span>}
                        {f.label} <span className="tabular-nums" style={{ color: "var(--ed-dim)" }}>{f.n}곳</span>
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 나와의 취향 — 로그인했고 실제 겹침을 셀 수 있을 때만 */}
        {myAffinity && viewerCtx && !viewerCtx.empty && (
          <section className="ed-container pt-8">
            <div className="py-5 px-5 md:px-6" style={{ background: "var(--ed-soft)" }}>
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>나와의 취향</p>
              <p className="pt-1 text-lg font-bold">{AFFINITY_LABEL[myAffinity.level]}</p>
              <p className="pt-1 text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>{affinityReason(myAffinity, displayName)}</p>
            </div>
          </section>
        )}

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
