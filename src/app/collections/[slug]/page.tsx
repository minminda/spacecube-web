import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import { CollectionCard, PickCard, PrototypeBanner, TasteChips } from "@/components/curators/CuratorBits";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { curatorAccess } from "@/lib/curators/access";
import { getCollectionBySlug, getCuratedUniverse, getRelatedCollections } from "@/lib/curators/queries";
import { alsoPickedLine, curatorDisplayName } from "@/lib/curators/finder";

export const metadata: Metadata = { title: "COLLECTION — 공간큐브", robots: { index: false } };

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * 큐레이터 컬렉션 — 이 사람이 "왜 이 공간을 골랐는지"가 먼저 보이도록 코멘트를 카드의 중심에 둔다.
 * 같은 공간을 다른 큐레이터도 골랐다면 함께 표시한다(공간은 하나, 고른 사람은 여럿).
 * 공간큐브 공식 CURATION과는 출처가 다른 별개 콘텐츠다.
 */
export default async function CollectionPage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  const access = curatorAccess(viewer);
  if (!access.enabled) notFound();

  const c = await getCollectionBySlug(slug, access);
  if (!c) notFound();
  const [related, savedIds, { picks }] = await Promise.all([
    getRelatedCollections(c, access),
    getSavedEditorialSpaceIds(viewer.userId),
    getCuratedUniverse(access),
  ]);
  const by = curatorDisplayName(c.curator);

  return (
    <div className="editorial-bleed">
      <PrototypeBanner demo={access.includeDemo} />
      <main className="pb-20 md:pb-28">
        <header className="ed-container pt-10 md:pt-16 pb-8" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
          <Link href={`/curators/${c.curator.slug}`} className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← {c.curator.name}</Link>
          <p className="pt-8 ed-label" style={{ color: "var(--ed-dim)" }}>{c.curator.isOfficial ? `${c.curator.name} 컬렉션` : `${c.curator.name}의 컬렉션`}</p>
          <h1 className="pt-3 text-[32px] md:text-[56px] font-bold leading-[1.12] tracking-[-0.04em] break-keep max-w-[900px]">{c.title}</h1>
          <p className="pt-4 text-base md:text-lg leading-relaxed break-keep max-w-[720px]">{c.description}</p>
          <div className="pt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="text-xs tabular-nums" style={{ color: "var(--ed-dim)" }}>{[c.area, `${c.picks.length} spaces`].filter(Boolean).join(" · ")}</p>
            <TasteChips tags={c.keywords} />
          </div>
        </header>

        <section className="ed-container">
          {c.picks.map((p, i) => {
            const others = [...new Map(picks.filter((x) => x.spaceId === p.space.id && x.curatorSlug !== c.curator.slug).map((x) => [x.curatorSlug, { name: x.curatorName, isOfficial: x.curatorIsOfficial }])).values()];
            return (
              <PickCard
                key={p.space.id}
                space={p.space}
                priority={i < 2}
                comment={p.comment ? { text: p.comment, by } : null}
                curatorsLine={others.length > 0 ? alsoPickedLine(others) : undefined}
                save={{ saved: savedIds.has(p.space.id), loggedIn: viewer.loggedIn }}
              />
            );
          })}
        </section>

        {related.length > 0 && (
          <section style={{ background: "var(--ed-soft)" }} className="mt-16">
            <div className="ed-container py-14 md:py-20">
              <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>함께 보면 좋은 컬렉션</p>
              <div className="grid gap-12 md:grid-cols-3 md:gap-10">
                {related.slice(0, 3).map((r) => <CollectionCard key={r.id} c={r} />)}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
