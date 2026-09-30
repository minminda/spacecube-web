import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import EdImage from "@/components/editorial/EdImage";
import SpaceCard from "@/components/editorial/SpaceCard";
import SiteFooter from "@/components/editorial/SiteFooter";
import BlockRenderer, { collectBlockSpaceSlugs } from "@/components/editorial/BlockRenderer";
import { getEditorialViewer, getSpacesBySlugs, resolveImage, toSpaceMap } from "@/lib/editorial";
import { getCuration, getCurations, formatCurationNumber } from "@/content/curations";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getCuration(slug);
  if (!c) return {};
  return { title: `${c.region} — ${c.title} — 공간큐브`, description: c.summary };
}

export default async function CurationDetailPage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) redirect("/");

  const curation = getCuration(slug);
  if (!curation) notFound();

  const related = getCurations().filter((c) => c.slug !== curation.slug).slice(0, 2);
  const spaceMap = toSpaceMap(
    await getSpacesBySlugs(
      [
        curation.cover.spaceSlug ?? "",
        ...curation.spaceSlugs,
        ...collectBlockSpaceSlugs(curation.blocks),
        ...related.map((r) => r.cover.spaceSlug ?? ""),
      ].filter(Boolean),
    ),
  );
  const spaces = curation.spaceSlugs.flatMap((s) => spaceMap.get(s) ?? []);
  // 본문에 SPACE_CARD 블록이 없으면 선정 공간을 별도 섹션으로 보여준다.
  const bodyHasSpaceCards = curation.blocks.some((b) => b.type === "SPACE_CARD");

  return (
    <div className="editorial-bleed">
      <main>
        {/* Hero */}
        <header className="ed-container pt-10 md:pt-16">
          <Link href="/curation" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← CURATION</Link>
          <div className="mt-8 md:mt-12 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7 space-y-5">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{formatCurationNumber(curation.number)}</p>
              <h1 className="text-[64px] md:text-[112px] font-bold leading-[0.95] tracking-[-0.05em]">{curation.region}</h1>
              <p className="text-2xl md:text-3xl font-bold leading-snug tracking-tight">{curation.title}</p>
            </div>
            <div className="md:col-span-5 space-y-4">
              <p className="text-base md:text-lg leading-relaxed" style={{ color: "var(--ed-dim)" }}>{curation.summary}</p>
              <p className="text-xs" style={{ color: "var(--ed-dim)" }}>
                {curation.region}에서 발견한 {spaces.length}개의 공간 · {curation.publishedAt.replaceAll("-", ".")}
              </p>
            </div>
          </div>
        </header>

        <div className="ed-container pt-10 md:pt-14">
          <EdImage image={resolveImage(curation.cover, spaceMap)} ratio="16 / 9" sizes="(min-width: 1200px) 1120px, 100vw" priority />
        </div>

        {/* Editorial body */}
        <article className="ed-container py-16 md:py-24">
          <BlockRenderer blocks={curation.blocks} spaces={spaceMap} />
        </article>

        {!bodyHasSpaceCards && spaces.length > 0 && (
          <section className="ed-container pb-20" style={{ borderTop: "1px solid var(--ed-line)" }}>
            <p className="ed-label pt-12 pb-8" style={{ color: "var(--ed-dim)" }}>선정된 공간</p>
            <div className="grid gap-10 grid-cols-1 md:grid-cols-3">
              {spaces.map((s) => <SpaceCard key={s.slug} space={s} showTagline />)}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section style={{ background: "var(--ed-soft)" }}>
            <div className="ed-container py-14 md:py-20">
              <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>다른 큐레이션</p>
              <div className="grid gap-10 md:grid-cols-2">
                {related.map((c) => (
                  <Link key={c.slug} href={`/curation/${c.slug}`} className="group grid grid-cols-[120px_1fr] md:grid-cols-[200px_1fr] gap-5 items-center">
                    <EdImage image={resolveImage(c.cover, spaceMap)} ratio="1 / 1" sizes="200px" />
                    <div className="space-y-2">
                      <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{formatCurationNumber(c.number)} · {c.region}</p>
                      <p className="text-lg md:text-xl font-bold leading-snug group-hover:underline underline-offset-4">{c.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
