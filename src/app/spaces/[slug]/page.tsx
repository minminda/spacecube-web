import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import PartnerMark from "@/components/editorial/PartnerMark";
import EdImage from "@/components/editorial/EdImage";
import SpaceCard from "@/components/editorial/SpaceCard";
import { SPACE_GRID_CLASS } from "@/components/editorial/SpaceTile";
import SiteFooter from "@/components/editorial/SiteFooter";
import SaveButton from "@/components/editorial/SaveButton";
import BlockRenderer from "@/components/editorial/BlockRenderer";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import PreviewBanner from "@/components/editorial/PreviewBanner";
import { getSpaceBySlug, getStoriesForSpace, listSpaces, personStoryItem, thoughtStoryItem } from "@/lib/editorial/queries";
import { curationEyebrow, spaceCoverImage } from "@/lib/editorial/types";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { countPartnerGuestbookTraces } from "@/lib/editorial/partnerTrace";
import { normalizeArea } from "@/lib/editorial/area";
import { INSTAGRAM_URL } from "@/content/site";
import { curatorAccess } from "@/lib/curators/access";
import { PrototypeBanner } from "@/components/curators/CuratorBits";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSpaceBySlug(slug);
  if (!s) return { robots: { index: false } };
  return { title: `${s.name} — 공간큐브`, description: s.summary ?? `${s.area} · ${s.category}` };
}

/**
 * 공개 SPACE 상세 — Editorial CMS의 공간 콘텐츠(발행된 것만, 관리자는 미리보기 가능).
 * Cube 운영 DB·Episode/Scene·방명록(/space/[slug]/**)으로는 어떤 링크도 두지 않는다.
 * 함께한 공간(cubeAvailable)이면 웹 정본인 "운영자의 이야기"(story 블록)를 전부 보여주고,
 * 현장 Cube는 이 이야기의 뒷부분이 아니라 그 자리에서만 의미 있는 디테일이라는 점을 안내한다.
 * 방명록은 실제 남은 흔적 수만 보여준다(내용은 현장에서만).
 */
export default async function SpaceDetailPage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) redirect("/");

  const access = curatorAccess(viewer);
  // 큐레이터 프로토타입 가상 공간은 미리보기 권한(관리자·로컬)이 있을 때만 열린다.
  const space = await getSpaceBySlug(slug, { preview: viewer.admin, allowDemo: access.includeDemo });
  if (!space) notFound();

  const [{ curations, people, thoughts }, published, savedIds, traces] = await Promise.all([
    getStoriesForSpace(space.id),
    listSpaces(),
    getSavedEditorialSpaceIds(viewer.userId),
    space.cubeAvailable ? countPartnerGuestbookTraces(space.slug) : Promise.resolve(0),
  ]);
  const area = normalizeArea(space.area);
  const nearby = published.filter((s) => s.id !== space.id && normalizeArea(s.area) === area).slice(0, 3);
  const stories = [...people.map(personStoryItem), ...thoughts.map(thoughtStoryItem)];
  const story = space.story ?? [];
  const back = space.cubeAvailable
    ? { href: "/cube-spaces", label: "함께한 공간" }
    : area
      ? { href: `/curation?area=${encodeURIComponent(area)}`, label: `${area} 큐레이션` }
      : { href: "/curation", label: "CURATION" };

  const info = [
    { label: "지역", value: space.area },
    { label: "종류", value: space.category },
    { label: "주소", value: space.address },
    { label: "운영", value: space.hours },
  ].filter((r): r is { label: string; value: string } => !!r.value);
  const links = [
    { label: "Instagram", href: space.instagram },
    { label: "Website", href: space.website },
  ].filter((l): l is { label: string; href: string } => !!l.href);

  return (
    <div className="editorial-bleed">
      {space.isDemo ? <PrototypeBanner demo /> : <PreviewBanner status={space.status} editHref={`/admin/content/spaces/${space.id}`} />}
      <main>
        <header className="ed-container pt-10 md:pt-16">
          <Link href={back.href} className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← {back.label}</Link>
          <div className="mt-8 md:mt-12 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7 space-y-5">
              <p className="ed-label inline-flex items-center gap-2" style={{ color: "var(--ed-dim)" }}>
                {space.area} · {space.category}
                {space.cubeAvailable && <PartnerMark size={14} />}
              </p>
              <h1 className="text-[48px] md:text-[88px] font-bold leading-[0.98] tracking-[-0.045em] break-keep">{space.name}</h1>
            </div>
            {space.summary && (
              <p className="md:col-span-5 text-lg md:text-xl leading-relaxed">{space.summary}</p>
            )}
            <div className="md:col-span-12 flex flex-wrap items-start gap-x-6 gap-y-3">
              <SaveButton spaceId={space.id} spaceName={space.name} initialSaved={savedIds.has(space.id)} loggedIn={viewer.loggedIn} variant="text" />
              {space.mapUrl && (
                <a href={space.mapUrl} target="_blank" rel="noopener noreferrer" className="tap-target inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-[6px] decoration-1">
                  지도에서 보기 ↗
                </a>
              )}
            </div>
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
              <p className="text-base leading-[1.85]" style={{ color: "var(--ed-dim)" }}>공간 소개를 준비하고 있어요.</p>
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
                <PartnerMark size={20} label />
                <p className="text-base font-bold leading-snug">이 공간에는 GONGGANCUBE가 있습니다.</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>
                  현장의 Cube는 웹 이야기의 뒷부분이 아니라, 그 자리에 있어야 보이는 1~2분의 디테일을 들려줍니다.
                  이야기가 끝나면 방명록으로 이어져요.
                </p>
                {traces > 0 && (
                  <p className="text-xs tabular-nums pt-1" style={{ color: "var(--ed-dim)" }}>지금까지 방명록에 남은 흔적 {traces}개</p>
                )}
              </div>
            )}
          </aside>
        </section>

        {space.cubeAvailable && story.length > 0 && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container pt-14 md:pt-20">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>운영자의 이야기</p>
            </div>
            <article className="ed-container py-12 md:py-16">
              <BlockRenderer blocks={story} spaces={new Map()} />
            </article>
          </section>
        )}

        {space.images && space.images.length > 0 && (
          <section className="ed-container pb-16 md:pb-24">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              {space.images.map((src, i) => (
                <EdImage key={i} image={{ src, alt: `${space.name} 사진 ${i + 1}` }} ratio="4 / 5" sizes="(min-width: 768px) 33vw, 50vw" />
              ))}
            </div>
          </section>
        )}

        {(curations.length > 0 || stories.length > 0) && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container py-14 md:py-20">
              <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>이 공간이 소개된 이야기</p>
              <div className="grid gap-10 md:grid-cols-2">
                {curations.map((c) => (
                  <Link key={c.id} href={`/curation/${c.slug}`} className="group grid grid-cols-[120px_1fr] md:grid-cols-[200px_1fr] gap-5 items-center">
                    <EdImage image={c.cover} ratio="1 / 1" sizes="200px" />
                    <div className="space-y-2">
                      <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{curationEyebrow(c)}</p>
                      <p className="text-lg md:text-xl font-bold leading-snug group-hover:underline underline-offset-4">{c.title}</p>
                    </div>
                  </Link>
                ))}
                {stories.map((st) => (
                  <Link key={st.key} href={st.href} className="group grid grid-cols-[120px_1fr] md:grid-cols-[200px_1fr] gap-5 items-center">
                    <EdImage image={st.cover} ratio="1 / 1" sizes="200px" />
                    <div className="space-y-2">
                      <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{st.eyebrow}</p>
                      <p className="text-lg md:text-xl font-bold leading-snug group-hover:underline underline-offset-4">{st.title}</p>
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
              <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>{area ?? space.area}의 다른 공간</p>
              <div className={SPACE_GRID_CLASS}>
                {nearby.map((s) => (
                  <SpaceCard key={s.slug} space={s} save={{ saved: savedIds.has(s.id), loggedIn: viewer.loggedIn }} />
                ))}
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
