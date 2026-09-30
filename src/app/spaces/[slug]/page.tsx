import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import CubeGlyph from "@/components/CubeGlyph";
import EdImage from "@/components/editorial/EdImage";
import SpaceCard from "@/components/editorial/SpaceCard";
import SiteFooter from "@/components/editorial/SiteFooter";
import { getEditorialViewer } from "@/lib/editorial";
import { SPACES, getSpace, resolveImage, spaceCoverImage } from "@/content/spaces";
import { getCurations, formatCurationNumber } from "@/content/curations";
import { getPeople, formatPeopleNumber } from "@/content/people";
import { BRAND_NAME, INSTAGRAM_URL } from "@/content/site";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = getSpace(slug);
  if (!s) return {};
  return { title: `${s.name} — 공간큐브`, description: s.summary ?? `${s.area} · ${s.category}` };
}

/**
 * 공개 SPACE 상세 — 공개 정보만 보여준다(src/content/spaces.ts).
 * Cube 운영 DB·Episode/Scene·방명록(/space/[slug]/**)으로는 어떤 링크도 두지 않는다.
 * cubeAvailable이면 "공간에서 Cube를 찾아보라"는 안내만 한다 — 온라인에서 이야기를 미리 열지 않는다.
 */
export default async function SpaceDetailPage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) redirect("/");

  const space = getSpace(slug);
  if (!space) notFound();

  const curations = getCurations().filter((c) => c.spaceSlugs.includes(space.slug));
  const people = getPeople().filter((p) => p.spaceSlugs.includes(space.slug));
  const nearby = SPACES.filter((s) => s.slug !== space.slug && s.area === space.area).slice(0, 3);

  const info = [
    { label: "지역", value: space.area },
    { label: "종류", value: space.category },
    { label: "주소", value: space.address },
    { label: "운영", value: space.hours },
  ].filter((r): r is { label: string; value: string } => !!r.value);
  const links = [
    { label: "지도 보기", href: space.mapUrl },
    { label: "Instagram", href: space.instagram },
    { label: "Website", href: space.website },
  ].filter((l): l is { label: string; href: string } => !!l.href);

  return (
    <div className="editorial-bleed">
      <main>
        <header className="ed-container pt-10 md:pt-16">
          <Link href="/spaces" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← SPACE</Link>
          <div className="mt-8 md:mt-12 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7 space-y-5">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{space.area} · {space.category}</p>
              <h1 className="text-[48px] md:text-[88px] font-bold leading-[0.98] tracking-[-0.045em]">{space.name}</h1>
            </div>
            {space.summary && (
              <p className="md:col-span-5 text-lg md:text-xl leading-relaxed">{space.summary}</p>
            )}
          </div>
        </header>

        <div className="ed-container pt-10 md:pt-14">
          <EdImage image={spaceCoverImage(space)} ratio="16 / 9" sizes="(min-width: 1200px) 1120px, 100vw" priority />
        </div>

        <section className="ed-container py-16 md:py-24 grid gap-14 md:grid-cols-12 md:gap-12">
          {/* 공간 소개 */}
          <div className="md:col-span-7 space-y-6">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>About this space</p>
            {space.description && space.description.length > 0 ? (
              space.description.map((para, i) => (
                <p key={i} className="text-base md:text-[17px] leading-[1.85]">{para}</p>
              ))
            ) : (
              <p className="text-base leading-[1.85]" style={{ color: "var(--ed-dim)" }}>공간 소개를 준비하고 있습니다.</p>
            )}
            {space.tags && space.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2 pt-2">
                {space.tags.map((t) => (
                  <li key={t} className="text-xs px-2.5 py-1" style={{ border: "1px solid var(--ed-line)", color: "var(--ed-dim)" }}>{t}</li>
                ))}
              </ul>
            )}
          </div>

          {/* 기본 정보 */}
          <aside className="md:col-span-5 space-y-8">
            <div>
              <p className="ed-label pb-3" style={{ color: "var(--ed-dim)", borderBottom: "1px solid var(--ed-fg)" }}>Information</p>
              <dl>
                {info.map((r) => (
                  <div key={r.label} className="grid grid-cols-[56px_1fr] gap-4 py-3 text-sm" style={{ borderBottom: "1px solid var(--ed-line)" }}>
                    <dt style={{ color: "var(--ed-dim)" }}>{r.label}</dt>
                    <dd className="leading-relaxed">{r.value}</dd>
                  </div>
                ))}
              </dl>
              {links.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-4">
                  {links.map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline underline-offset-4">
                      {l.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>

            {space.cubeAvailable && (
              <div className="p-6 space-y-3" style={{ background: "var(--ed-soft)" }}>
                <div className="flex items-center gap-2.5">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" style={{ color: "var(--ed-fg)" }} aria-hidden>
                    <CubeGlyph outlineWidth={1.2} edgeWidth={1} />
                  </svg>
                  <p className="ed-label">{BRAND_NAME}</p>
                </div>
                <p className="text-base font-bold leading-snug">GONGGANCUBE가 있는 공간입니다.</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>
                  공간에서 Cube를 찾아 이야기를 만나보세요. 공간을 만든 사람의 더 깊은 이야기는 현장에서만 열립니다.
                </p>
              </div>
            )}
          </aside>
        </section>

        {space.images && space.images.length > 0 && (
          <section className="ed-container pb-16 md:pb-24">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              {space.images.map((src, i) => (
                <EdImage key={i} image={{ src, alt: `${space.name} 사진 ${i + 1}` }} ratio="4 / 5" sizes="(min-width: 768px) 33vw, 50vw" />
              ))}
            </div>
          </section>
        )}

        {(curations.length > 0 || people.length > 0) && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container py-14 md:py-20">
              <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>이 공간이 소개된 이야기</p>
              <div className="grid gap-10 md:grid-cols-2">
                {curations.map((c) => (
                  <Link key={c.slug} href={`/curation/${c.slug}`} className="group grid grid-cols-[120px_1fr] md:grid-cols-[200px_1fr] gap-5 items-center">
                    <EdImage image={resolveImage(c.cover)} ratio="1 / 1" sizes="200px" />
                    <div className="space-y-2">
                      <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{formatCurationNumber(c.number)} · {c.region}</p>
                      <p className="text-lg md:text-xl font-bold leading-snug group-hover:underline underline-offset-4">{c.title}</p>
                    </div>
                  </Link>
                ))}
                {people.map((p) => (
                  <Link key={p.slug} href={`/people/${p.slug}`} className="group grid grid-cols-[120px_1fr] md:grid-cols-[200px_1fr] gap-5 items-center">
                    <EdImage image={resolveImage(p.cover)} ratio="1 / 1" sizes="200px" />
                    <div className="space-y-2">
                      <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{formatPeopleNumber(p.number)}</p>
                      <p className="text-lg md:text-xl font-bold leading-snug group-hover:underline underline-offset-4">{p.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {nearby.length > 0 && (
          <section style={{ background: "var(--ed-soft)" }}>
            <div className="ed-container py-14 md:py-20">
              <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>{space.area}의 다른 공간</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-10">
                {nearby.map((s) => <SpaceCard key={s.slug} space={s} sizes="(min-width: 768px) 33vw, 50vw" />)}
              </div>
            </div>
          </section>
        )}

        <div className="ed-container py-10 text-center">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>
            더 많은 공간 이야기는 Instagram에서 →
          </a>
        </div>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
