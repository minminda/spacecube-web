import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import EdImage from "@/components/editorial/EdImage";
import PageHeader from "@/components/editorial/PageHeader";
import SiteFooter from "@/components/editorial/SiteFooter";
import { getEditorialViewer, getSpacesBySlugs, resolveImage, toSpaceMap } from "@/lib/editorial";
import { getCurations, formatCurationNumber } from "@/content/curations";

export const metadata: Metadata = {
  title: "CURATION — 공간큐브",
  description: "지역 하나를 하나의 관점으로 읽는 공간큐브의 큐레이션.",
};

export default async function CurationListPage() {
  const viewer = await getEditorialViewer();
  if (!viewer.editorial) redirect("/");

  const curations = getCurations();
  const spaces = await getSpacesBySlugs(curations.flatMap((c) => [...c.spaceSlugs, c.cover.spaceSlug ?? ""]).filter(Boolean));
  const spaceMap = toSpaceMap(spaces);
  const countOf = (slugs: string[]) => slugs.filter((s) => spaceMap.has(s)).length;

  const [first, ...rest] = curations;

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <PageHeader
          label="Curation"
          title="CURATION"
          description="지역 하나를 하나의 관점으로 읽습니다. 가장 인기 있는 곳이 아니라, 같은 생각을 공유하는 공간들을 함께 소개합니다."
        />

        {first && (
          <section className="ed-container pt-12 md:pt-16">
            <Link href={`/curation/${first.slug}`} className="group grid gap-6 md:grid-cols-12 md:gap-12 md:items-end">
              <div className="md:col-span-8">
                <EdImage image={resolveImage(first.cover, spaceMap)} ratio="3 / 2" sizes="(min-width: 768px) 66vw, 100vw" priority />
              </div>
              <div className="md:col-span-4 space-y-4">
                <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{formatCurationNumber(first.number)}</p>
                <p className="text-[48px] md:text-[64px] font-bold leading-none tracking-[-0.04em]">{first.region}</p>
                <p className="text-xl md:text-2xl font-bold leading-snug tracking-tight group-hover:underline underline-offset-4">{first.title}</p>
                <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--ed-dim)" }}>{first.summary}</p>
                <p className="text-xs pt-2" style={{ color: "var(--ed-dim)" }}>공간 {countOf(first.spaceSlugs)}곳</p>
              </div>
            </Link>
          </section>
        )}

        {rest.length > 0 && (
          <section className="ed-container pt-16 md:pt-24">
            <div className="grid gap-12 md:grid-cols-2 md:gap-x-12 md:gap-y-20" style={{ borderTop: "1px solid var(--ed-line)", paddingTop: 48 }}>
              {rest.map((c, i) => (
                <Link key={c.slug} href={`/curation/${c.slug}`} className={`group block ${i % 2 === 1 ? "md:mt-20" : ""}`}>
                  <EdImage image={resolveImage(c.cover, spaceMap)} ratio={i % 2 === 0 ? "4 / 5" : "1 / 1"} sizes="(min-width: 768px) 50vw, 100vw" />
                  <div className="pt-5 space-y-2">
                    <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{formatCurationNumber(c.number)} · {c.region}</p>
                    <p className="text-2xl font-bold leading-snug tracking-tight group-hover:underline underline-offset-4">{c.title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>{c.summary}</p>
                    <p className="text-xs pt-1" style={{ color: "var(--ed-dim)" }}>공간 {countOf(c.spaceSlugs)}곳</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
