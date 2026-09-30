import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import EdImage from "@/components/editorial/EdImage";
import SpaceCard from "@/components/editorial/SpaceCard";
import SiteFooter from "@/components/editorial/SiteFooter";
import BlockRenderer from "@/components/editorial/BlockRenderer";
import PreviewBanner from "@/components/editorial/PreviewBanner";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getBlockSpaces, getPersonBySlug, listPeople } from "@/lib/editorial/queries";
import { formatPeopleNumber } from "@/lib/editorial/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPersonBySlug(slug);
  if (!p) return { robots: { index: false } };
  return { title: `${formatPeopleNumber(p.number)} — 공간큐브`, description: p.summary };
}

/** PEOPLE 상세 — 발행된 것만 공개. 관리자는 초안·보관 콘텐츠를 미리보기 띠와 함께 볼 수 있다. */
export default async function PeopleDetailPage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) redirect("/");

  const preview = viewer.admin;
  const person = await getPersonBySlug(slug, { preview });
  if (!person) notFound();

  const [blockSpaces, all] = await Promise.all([getBlockSpaces(person.blocks, { preview }), listPeople()]);
  const others = all.filter((p) => p.id !== person.id).slice(0, 3);

  return (
    <div className="editorial-bleed">
      <PreviewBanner status={person.status} editHref={`/admin/content/people/${person.id}`} />
      <main>
        <header className="ed-container pt-10 md:pt-16">
          <Link href="/people" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← PEOPLE</Link>
          <div className="mt-8 md:mt-12 max-w-[900px] space-y-6">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>
              {formatPeopleNumber(person.number)}{person.subject ? ` · ${person.subject}` : ""}
            </p>
            <h1 className="text-[34px] md:text-[56px] font-bold leading-[1.15] tracking-[-0.03em]">{person.title}</h1>
            <p className="text-base md:text-lg leading-relaxed" style={{ color: "var(--ed-dim)" }}>{person.summary}</p>
          </div>
        </header>

        <div className="ed-container pt-10 md:pt-14">
          <EdImage image={person.cover} ratio="16 / 9" sizes="(min-width: 1200px) 1120px, 100vw" priority />
        </div>

        {person.blocks.length > 0 && (
          <article className="ed-container py-16 md:py-24">
            <BlockRenderer blocks={person.blocks} spaces={blockSpaces} />
          </article>
        )}

        {person.spaces.length > 0 && (
          <section className="ed-container py-16 md:pb-20" style={{ borderTop: "1px solid var(--ed-line)" }}>
            <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>이 사람이 머문 공간</p>
            <div className="grid gap-10 grid-cols-1 md:grid-cols-3">
              {person.spaces.map((l) => <SpaceCard key={l.space.id} space={l.space} note={l.note} showSummary={!l.note} />)}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section style={{ background: "var(--ed-soft)" }}>
            <div className="ed-container py-14 md:py-20">
              <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>다른 PEOPLE</p>
              <div className="grid gap-10 md:grid-cols-3">
                {others.map((o) => (
                  <Link key={o.id} href={`/people/${o.slug}`} className="group block">
                    <EdImage image={o.cover} ratio="4 / 5" sizes="(min-width: 768px) 33vw, 100vw" />
                    <p className="pt-4 ed-label" style={{ color: "var(--ed-dim)" }}>{formatPeopleNumber(o.number)}</p>
                    <p className="pt-2 text-lg font-bold leading-snug group-hover:underline underline-offset-4">{o.title}</p>
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
