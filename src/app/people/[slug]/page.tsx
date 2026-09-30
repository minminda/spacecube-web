import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import EdImage from "@/components/editorial/EdImage";
import SpaceCard from "@/components/editorial/SpaceCard";
import SiteFooter from "@/components/editorial/SiteFooter";
import BlockRenderer from "@/components/editorial/BlockRenderer";
import { getEditorialViewer } from "@/lib/editorial";
import { getSpacesBySlugs, resolveImage } from "@/content/spaces";
import { getPerson, getPeople, formatPeopleNumber } from "@/content/people";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getPerson(slug);
  if (!p) return {};
  return { title: `${formatPeopleNumber(p.number)} — 공간큐브`, description: p.summary };
}

export default async function PeopleDetailPage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) redirect("/");

  const person = getPerson(slug);
  if (!person) notFound();

  const others = getPeople().filter((p) => p.slug !== person.slug).slice(0, 3);
  const spaces = getSpacesBySlugs(person.spaceSlugs);

  return (
    <div className="editorial-bleed">
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
          <EdImage image={resolveImage(person.cover)} ratio="16 / 9" sizes="(min-width: 1200px) 1120px, 100vw" priority />
        </div>

        <article className="ed-container py-16 md:py-24">
          <BlockRenderer blocks={person.blocks} />
        </article>

        {spaces.length > 0 && (
          <section className="ed-container pb-20" style={{ borderTop: "1px solid var(--ed-line)" }}>
            <p className="ed-label pt-12 pb-8" style={{ color: "var(--ed-dim)" }}>이 사람이 머문 공간</p>
            <div className="grid gap-10 grid-cols-1 md:grid-cols-3">
              {spaces.map((s) => <SpaceCard key={s.slug} space={s} showSummary />)}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section style={{ background: "var(--ed-soft)" }}>
            <div className="ed-container py-14 md:py-20">
              <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>다른 PEOPLE</p>
              <div className="grid gap-10 md:grid-cols-3">
                {others.map((o) => (
                  <Link key={o.slug} href={`/people/${o.slug}`} className="group block">
                    <EdImage image={resolveImage(o.cover)} ratio="4 / 5" sizes="(min-width: 768px) 33vw, 100vw" />
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
