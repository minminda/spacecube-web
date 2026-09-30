import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import EdImage from "@/components/editorial/EdImage";
import SpaceCard from "@/components/editorial/SpaceCard";
import SiteFooter from "@/components/editorial/SiteFooter";
import BlockRenderer from "@/components/editorial/BlockRenderer";
import PreviewBanner from "@/components/editorial/PreviewBanner";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getBlockSpaces, getCurationBySlug, listCurations } from "@/lib/editorial/queries";
import { curationLabel, formatCurationNumber, formatEditorialDate } from "@/lib/editorial/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCurationBySlug(slug);
  if (!c) return { robots: { index: false } };
  return { title: `${c.area ? `${c.area} — ` : ""}${c.title} — 공간큐브`, description: c.summary };
}

/** CURATION 상세 — 발행된 것만 공개. 관리자는 초안·보관 콘텐츠를 미리보기 띠와 함께 볼 수 있다. */
export default async function CurationDetailPage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) redirect("/");

  const preview = viewer.admin;
  const curation = await getCurationBySlug(slug, { preview });
  if (!curation) notFound();

  const [blockSpaces, all] = await Promise.all([getBlockSpaces(curation.blocks, { preview }), listCurations()]);
  const related = all.filter((c) => c.id !== curation.id).slice(0, 2);
  const spaces = curation.spaces;
  // 본문에 SPACE_CARD 블록이 없으면 선정 공간을 별도 섹션으로 보여준다.
  const bodyHasSpaceCards = curation.blocks.some((b) => b.type === "SPACE_CARD");
  const spaceCountLabel = curation.area ? `${curation.area}에서 발견한 ${spaces.length}개의 공간` : `공간 ${spaces.length}곳`;
  const dateLabel = formatEditorialDate(curation.publishedAt);

  return (
    <div className="editorial-bleed">
      <PreviewBanner status={curation.status} editHref={`/admin/content/curations/${curation.id}`} />
      <main>
        <header className="ed-container pt-10 md:pt-16">
          <Link href="/curation" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← CURATION</Link>
          <div className="mt-8 md:mt-12 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7 space-y-5">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{formatCurationNumber(curation.number)}</p>
              {curation.area ? (
                <>
                  <h1 className="text-[64px] md:text-[112px] font-bold leading-[0.95] tracking-[-0.05em]">{curation.area}</h1>
                  <p className="text-2xl md:text-3xl font-bold leading-snug tracking-tight">{curation.title}</p>
                </>
              ) : (
                <h1 className="text-[40px] md:text-[64px] font-bold leading-[1.08] tracking-[-0.04em]">{curation.title}</h1>
              )}
            </div>
            <div className="md:col-span-5 space-y-4">
              <p className="text-base md:text-lg leading-relaxed" style={{ color: "var(--ed-dim)" }}>{curation.summary}</p>
              <p className="text-xs" style={{ color: "var(--ed-dim)" }}>
                {spaceCountLabel}
                {dateLabel ? ` · ${dateLabel}` : ""}
              </p>
            </div>
          </div>
        </header>

        <div className="ed-container pt-10 md:pt-14">
          <EdImage image={curation.cover} ratio="16 / 9" sizes="(min-width: 1200px) 1120px, 100vw" priority />
        </div>

        {curation.blocks.length > 0 && (
          <article className="ed-container py-16 md:py-24">
            <BlockRenderer blocks={curation.blocks} spaces={blockSpaces} />
          </article>
        )}

        {!bodyHasSpaceCards && spaces.length > 0 && (
          <section className="ed-container py-16 md:pb-20" style={{ borderTop: "1px solid var(--ed-line)" }}>
            <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>선정된 공간</p>
            <div className="grid gap-10 grid-cols-1 md:grid-cols-3">
              {spaces.map((l) => <SpaceCard key={l.space.id} space={l.space} note={l.note} showSummary={!l.note} />)}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section style={{ background: "var(--ed-soft)" }}>
            <div className="ed-container py-14 md:py-20">
              <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>다른 큐레이션</p>
              <div className="grid gap-10 md:grid-cols-2">
                {related.map((c) => (
                  <Link key={c.id} href={`/curation/${c.slug}`} className="group grid grid-cols-[120px_1fr] md:grid-cols-[200px_1fr] gap-5 items-center">
                    <EdImage image={c.cover} ratio="1 / 1" sizes="200px" />
                    <div className="space-y-2">
                      <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{curationLabel(c)}</p>
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
