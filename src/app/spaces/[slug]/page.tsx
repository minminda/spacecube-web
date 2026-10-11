import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import PartnerMark from "@/components/editorial/PartnerMark";
import EdImage from "@/components/editorial/EdImage";
import SpaceCard from "@/components/editorial/SpaceCard";
import { SPACE_GRID_CLASS } from "@/components/editorial/SpaceTile";
import SiteFooter from "@/components/editorial/SiteFooter";
import SaveButton from "@/components/editorial/SaveButton";
import DiscoveryTracker from "@/components/editorial/DiscoveryTracker";
import MapLink from "@/components/editorial/MapLink";
import BlockRenderer from "@/components/editorial/BlockRenderer";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import PreviewBanner from "@/components/editorial/PreviewBanner";
import { getSpaceBySlug, getStoriesForSpace, listSpaces, personStoryItem, thoughtStoryItem } from "@/lib/editorial/queries";
import { curationEyebrow, spaceCoverImage } from "@/lib/editorial/types";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { getPartnerEpisodes } from "@/lib/editorial/partnerEpisodes";
import PartnerEpisodeList from "@/components/editorial/PartnerEpisodeList";
import { findFixtureSpace, fixtureEpisodes, fixtureSpaceView } from "@/lib/home/fixtures";
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
 * 방명록 참여자 수 · 기록 수는 공개 상세에 노출하지 않는다(내용도 현장에서만).
 */
export default async function SpaceDetailPage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) redirect("/");

  const access = curatorAccess(viewer);
  // 큐레이터 프로토타입 가상 공간은 미리보기 권한(관리자·로컬)이 있을 때만 열린다.
  // Discovery 확인용 임시 공간(fixture-N)은 관리자 · 로컬에서만 열린다 — DB를 조회하지 않고 fixtures.ts로만 그린다
  const fixture = access.includeDemo ? findFixtureSpace(slug) : null;
  const space = fixture ? fixtureSpaceView(fixture) : await getSpaceBySlug(slug, { preview: viewer.admin, allowDemo: access.includeDemo });
  if (!space) notFound();

  const [{ curations, people, thoughts }, published, savedIds, partnerEp] = fixture
    ? [{ curations: [], people: [], thoughts: [] }, await listSpaces(), new Set<string>(), space.cubeAvailable ? fixtureEpisodes(fixture) : null] as const
    : await Promise.all([
        getStoriesForSpace(space.id),
        listSpaces(),
        getSavedEditorialSpaceIds(viewer.userId),
        space.cubeAvailable ? getPartnerEpisodes(space.slug) : Promise.resolve(null),
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
    { label: "지역", value: area ?? space.area },
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
      {fixture ? (
        <p className="ed-container pt-3 text-xs" style={{ color: "var(--ed-dim)" }}>임시 공간 미리보기 — UI 확인용이며 실제 공간이 아닙니다. 일반 방문자에게는 보이지 않아요.</p>
      ) : space.isDemo ? <PrototypeBanner demo /> : <PreviewBanner status={space.status} editHref={`/admin/content/spaces/${space.id}`} />}
      {!fixture && !space.isDemo && <DiscoveryTracker spaceId={space.id} />}
      <main>
        <header className="ed-container pt-10 md:pt-16">
          <Link href={back.href} className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← {back.label}</Link>
          <div className="mt-8 md:mt-12 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7 space-y-5">
              <p className="ed-label inline-flex items-center gap-2" style={{ color: "var(--ed-dim)" }}>
                {area ?? space.area} · {space.category}
                {space.cubeAvailable && <PartnerMark size={14} />}
              </p>
              <h1 className="text-[48px] md:text-[88px] font-bold leading-[0.98] tracking-[-0.045em] break-keep">{space.name}</h1>
            </div>
            {space.summary && (
              <p className="md:col-span-5 text-lg md:text-xl leading-relaxed">{space.summary}</p>
            )}
          </div>
        </header>

        <div className="ed-container pt-10 md:pt-14">
          {/* 저장 아이콘은 대표 이미지 우측 상단 — 사진이 없으면 플레이스홀더 면 위에 같은 자리 */}
          <div className="relative">
            <EdImage image={spaceCoverImage(space)} ratio="16 / 9" sizes="(min-width: 1200px) 1120px, 100vw" priority />
            <div className="absolute right-2 top-2 md:right-3 md:top-3 z-10">
              <SaveButton spaceId={space.id} spaceName={space.name} initialSaved={savedIds.has(space.id)} loggedIn={viewer.loggedIn} variant="detail" mock={!!fixture} />
            </div>
          </div>
        </div>

        <section className="ed-container py-16 md:py-24 grid gap-14 md:grid-cols-12 md:gap-12">
          {/* 공간 소개 */}
          <div className="md:col-span-7 space-y-6">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>공간 소개</p>
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
              <p className="ed-label pb-3" style={{ color: "var(--ed-dim)", borderBottom: "1px solid var(--ed-fg)" }}>정보</p>
              <dl>
                {info.map((r) => (
                  <div key={r.label} className="grid grid-cols-[56px_1fr] gap-4 py-3 text-sm" style={{ borderBottom: "1px solid var(--ed-line)" }}>
                    <dt style={{ color: "var(--ed-dim)" }}>{r.label}</dt>
                    <dd className="leading-relaxed">{r.value}</dd>
                  </div>
                ))}
              </dl>
              {(space.mapUrl || links.length > 0) && (
                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-4">
                  {space.mapUrl && (
                    <MapLink href={space.mapUrl} spaceId={space.id} track={!fixture && !space.isDemo} className="text-sm font-medium hover:underline underline-offset-4">
                      지도에서 보기 ↗
                    </MapLink>
                  )}
                  {links.map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline underline-offset-4">
                      {l.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* 함께한 공간이어도 연결된 운영 공간 · 공개 Episode가 아직 없으면 빈 제목만 남지 않게 블록 자체를 숨긴다 */}
            {space.cubeAvailable && partnerEp && partnerEp.episodes.length > 0 && (
              <div>
                <p className="ed-label pb-3 inline-flex items-center gap-2 w-full" style={{ color: "var(--ed-dim)", borderBottom: "1px solid var(--ed-fg)" }}>
                  Episode <PartnerMark size={13} />
                </p>
                <PartnerEpisodeList slug={space.slug} episodes={partnerEp.episodes} unlocked={partnerEp.unlocked} />
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
