import Link from "next/link";
import CubeGlyph from "@/components/CubeGlyph";
import EdImage from "@/components/editorial/EdImage";
import SpaceCard from "@/components/editorial/SpaceCard";
import Participation from "@/components/editorial/Participation";
import SiteFooter from "@/components/editorial/SiteFooter";
import { getHomeData, type HomeFeedEntry } from "@/lib/editorial/queries";
import { curationLabel, formatCurationNumber, formatPeopleNumber, spaceCoverImage, spaceHref, type ResolvedImage } from "@/lib/editorial/types";
import { BRAND_NAME } from "@/content/site";
import QrScanSheet from "./QrScanSheet";

/* ── 에디토리얼 홈(1차 개편) ─────────────────────────────────────────────
   발견 → 이해 → 방문 → 경험 → 기록. 기능 설명보다 콘텐츠를 먼저 보여주고, 큐브(QR) 경험은
   중반부 GONGGANCUBE EXPERIENCE 섹션에서 소개한다. 콘텐츠는 Editorial CMS(발행된 것만,
   무엇을 노출할지는 관리자 › 홈페이지 설정)에서 읽으며, Cube 운영 DB·라우트(/space/[slug]/** 의
   Episode/Scene/방명록)로는 연결하지 않는다. ── */

interface FeedCardData {
  key: string;
  label: string;
  title: string;
  summary?: string | null;
  meta?: string | null;
  href: string;
  image: ResolvedImage;
}

export default async function EditorialHome({ admin }: { admin: boolean }) {
  const home = await getHomeData();
  const featured = home.featuredCuration;
  const heroSpace = home.hero;
  const featuredSpaces = featured ? featured.spaces.map((l) => l.space) : [];
  const exploreSpaces = home.featuredSpaces;
  const feed = buildFeed(home.feed);

  return (
    <div className="editorial-bleed">
      <main>
        {/* ── HERO ── */}
        <section className="ed-container pt-10 pb-16 md:pt-16 md:pb-24">
          <div className="grid gap-10 md:grid-cols-12 md:gap-10 md:items-end">
            <div className="md:col-span-5 space-y-8 md:pb-4">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{BRAND_NAME}</p>
              <h1 className="text-[40px] leading-[1.18] md:text-[60px] md:leading-[1.12] font-bold tracking-[-0.03em]">
                공간을 알면,
                <br />
                머무는 시간이
                <br />
                달라집니다.
              </h1>
              <p className="text-base md:text-lg leading-relaxed" style={{ color: "var(--ed-dim)" }}>
                공간과 그곳을 만든
                <br className="md:hidden" /> 사람들의 이야기를 기록합니다.
              </p>
            </div>
            <div className="md:col-span-7">
              {heroSpace ? (
                <Link href={spaceHref(heroSpace.slug)} className="group block">
                  <EdImage
                    image={spaceCoverImage(heroSpace)}
                    ratio="5 / 4"
                    sizes="(min-width: 768px) 58vw, 100vw"
                    priority
                  />
                  <p className="mt-3 text-xs flex justify-between" style={{ color: "var(--ed-dim)" }}>
                    <span>{heroSpace.name} · {heroSpace.area}</span>
                    <span className="group-hover:underline underline-offset-4">공간 보기 →</span>
                  </p>
                </Link>
              ) : (
                <EdImage image={{ src: null, alt: "" }} ratio="5 / 4" sizes="100vw" />
              )}
            </div>
          </div>
        </section>

        {/* ── FEATURED CURATION ── */}
        {featured && (
          <section style={{ borderTop: "1px solid var(--ed-fg)" }}>
            <div className="ed-container py-14 md:py-20">
              <SectionHead label="Featured Curation" moreHref="/curation" moreLabel="모든 큐레이션" />
              <div className="grid gap-8 md:grid-cols-12 md:gap-12">
                <Link href={`/curation/${featured.slug}`} className="group block md:col-span-8">
                  <EdImage image={featured.cover} ratio="3 / 2" sizes="(min-width: 768px) 66vw, 100vw" />
                </Link>
                <div className="md:col-span-4 flex flex-col">
                  <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{formatCurationNumber(featured.number)}</p>
                  {featured.area && <p className="mt-4 text-[56px] md:text-[80px] font-bold leading-none tracking-[-0.04em]">{featured.area}</p>}
                  <p className="mt-5 text-xl md:text-2xl font-bold leading-snug tracking-tight">{featured.title}</p>
                  <p className="mt-4 text-sm md:text-base leading-relaxed" style={{ color: "var(--ed-dim)" }}>{featured.summary}</p>

                  {featuredSpaces.length > 0 && (
                    <div className="mt-8">
                      <p className="text-xs pb-2" style={{ color: "var(--ed-dim)", borderBottom: "1px solid var(--ed-line)" }}>
                        {featured.area ? `${featured.area}에서 발견한 ${featuredSpaces.length}개의 공간` : `이 큐레이션의 공간 ${featuredSpaces.length}곳`}
                      </p>
                      <ol>
                        {featuredSpaces.map((s, i) => (
                          <li key={s.slug} style={{ borderBottom: "1px solid var(--ed-line)" }}>
                            <Link href={spaceHref(s.slug)} className="flex items-baseline gap-4 py-3 text-sm hover:underline underline-offset-4">
                              <span className="tabular-nums text-xs" style={{ color: "var(--ed-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
                              <span className="font-medium">{s.name}</span>
                              <span className="ml-auto text-xs" style={{ color: "var(--ed-dim)" }}>{s.category}</span>
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <Link
                    href={`/curation/${featured.slug}`}
                    className="tap-target mt-8 md:mt-auto inline-flex items-center justify-between gap-6 px-5 text-sm font-semibold transition-opacity hover:opacity-85"
                    style={{ background: "var(--ed-fg)", color: "#fff" }}
                  >
                    {featured.area ? `${featured.area} 둘러보기` : "큐레이션 보기"} <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── LATEST STORIES ── */}
        {feed.length > 0 && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container py-14 md:py-20">
              <SectionHead label="Latest Stories" title="최근 이야기" />
              <div className="grid gap-10 md:grid-cols-12 md:gap-x-12 md:gap-y-14">
                {feed[0] && (
                  <div className="md:col-span-7 md:row-span-2">
                    <FeedCard card={feed[0]} ratio="4 / 5" sizes="(min-width: 768px) 58vw, 100vw" large />
                  </div>
                )}
                {feed.slice(1, 3).map((card) => (
                  <div key={card.key} className="md:col-span-5">
                    <FeedCard card={card} ratio="3 / 2" sizes="(min-width: 768px) 40vw, 100vw" />
                  </div>
                ))}
                {feed.slice(3).map((card) => (
                  <div key={card.key} className="md:col-span-12">
                    <FeedCardWide card={card} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── EXPLORE SPACE ── */}
        {exploreSpaces.length > 0 && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container pt-14 md:pt-20 pb-6">
              <SectionHead label="Explore Space" title="공간을 둘러보세요." moreHref="/spaces" moreLabel="전체 공간 보기" />
            </div>
            {/* 모바일: 가로 스크롤 / 데스크톱: 엇갈린 3열 */}
            <div className="md:hidden ed-scroll-x flex gap-4 overflow-x-auto snap-x snap-mandatory px-5 pb-14">
              {exploreSpaces.map((s) => (
                <div key={s.slug} className="snap-start shrink-0 w-[68vw]">
                  <SpaceCard space={s} sizes="68vw" />
                </div>
              ))}
            </div>
            <div className="hidden md:grid ed-container grid-cols-3 gap-x-10 gap-y-14 pb-20">
              {exploreSpaces.map((s, i) => (
                <div key={s.slug} className={i % 3 === 1 ? "mt-16" : ""}>
                  <SpaceCard space={s} ratio={i % 2 === 0 ? "4 / 5" : "1 / 1"} sizes="33vw" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── GONGGANCUBE EXPERIENCE ── */}
        <section style={{ background: "var(--ed-soft)" }}>
          <div className="ed-container py-16 md:py-24 grid gap-12 md:grid-cols-12 md:gap-12 md:items-center">
            <div className="md:col-span-6">
              {/* 실제 큐브 사진이 준비되면 이 도형 자리를 사진으로 교체한다 */}
              <div className="relative w-full flex items-center justify-center" style={{ aspectRatio: "1 / 1", background: "#fff" }}>
                <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" style={{ color: "var(--ed-fg)" }} aria-label="공간큐브 큐브">
                  <CubeGlyph outlineWidth={0.45} edgeWidth={0.4} />
                </svg>
                <p className="absolute bottom-4 left-4 ed-label" style={{ color: "var(--ed-dim)" }}>{BRAND_NAME}</p>
              </div>
            </div>
            <div className="md:col-span-6 space-y-10">
              <div className="space-y-4">
                <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Gonggancube Experience</p>
                <h2 className="text-3xl md:text-[44px] font-bold leading-[1.2] tracking-[-0.03em]">
                  공간에서 이 큐브를
                  <br />
                  발견하셨나요?
                </h2>
                <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--ed-dim)" }}>
                  공간큐브가 놓인 곳에서는, 온라인에서는 읽을 수 없는
                  <br className="hidden md:block" /> 그 공간을 만든 사람의 더 깊은 이야기가 열립니다.
                </p>
              </div>
              <ol style={{ borderTop: "1px solid var(--ed-fg)" }}>
                {["QR을 스캔하고", "공간의 이야기를 읽고", "당신의 이야기를 남겨보세요."].map((step, i) => (
                  <li key={step} className="flex items-baseline gap-5 py-4" style={{ borderBottom: "1px solid var(--ed-line)" }}>
                    <span className="tabular-nums text-xs" style={{ color: "var(--ed-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-lg font-semibold">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="max-w-sm space-y-3">
                <QrScanSheet />
                <Link
                  href="/about"
                  className="tap-target flex items-center justify-center w-full text-sm font-semibold border transition-colors hover:bg-white"
                  style={{ borderColor: "var(--ed-fg)" }}
                >
                  공간큐브 알아보기 →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Participation />
      </main>
      <SiteFooter admin={admin} />
    </div>
  );
}

function buildFeed(entries: HomeFeedEntry[]): FeedCardData[] {
  return entries.map((item): FeedCardData => {
    if (item.kind === "person") {
      const p = item.person;
      return { key: `p-${p.id}`, label: formatPeopleNumber(p.number), title: p.title, summary: p.summary, href: `/people/${p.slug}`, image: p.cover };
    }
    if (item.kind === "curation") {
      const c = item.curation;
      return { key: `c-${c.id}`, label: curationLabel(c), title: c.title, summary: c.summary, href: `/curation/${c.slug}`, image: c.cover };
    }
    const s = item.space;
    return {
      key: `s-${s.id}`,
      label: "Space",
      title: s.name,
      summary: item.headline ?? s.summary,
      meta: [s.area, s.category].filter(Boolean).join(" · "),
      href: spaceHref(s.slug),
      image: spaceCoverImage(s),
    };
  });
}

function SectionHead({ label, title, moreHref, moreLabel }: { label: string; title?: string; moreHref?: string; moreLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8 md:mb-12">
      <div className="space-y-3">
        <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{label}</p>
        {title && <h2 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">{title}</h2>}
      </div>
      {moreHref && (
        <Link href={moreHref} className="shrink-0 text-xs md:text-sm hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>
          {moreLabel} →
        </Link>
      )}
    </div>
  );
}

function FeedCard({ card, ratio, sizes, large }: { card: FeedCardData; ratio: string; sizes: string; large?: boolean }) {
  return (
    <Link href={card.href} className="group block">
      <EdImage image={card.image} ratio={ratio} sizes={sizes} />
      <div className="pt-4 space-y-2">
        <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{card.label}</p>
        <p className={`${large ? "text-2xl md:text-[32px]" : "text-xl"} font-bold leading-snug tracking-tight group-hover:underline underline-offset-4`}>
          {card.title}
        </p>
        {card.summary && <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--ed-dim)" }}>{card.summary}</p>}
        {card.meta && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{card.meta}</p>}
      </div>
    </Link>
  );
}

function FeedCardWide({ card }: { card: FeedCardData }) {
  return (
    <Link href={card.href} className="group grid gap-5 md:grid-cols-12 md:gap-12 md:items-center pt-10 md:pt-14" style={{ borderTop: "1px solid var(--ed-line)" }}>
      <div className="md:col-span-7">
        <EdImage image={card.image} ratio="16 / 9" sizes="(min-width: 768px) 58vw, 100vw" />
      </div>
      <div className="md:col-span-5 space-y-3">
        <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{card.label}</p>
        <p className="text-2xl md:text-3xl font-bold leading-snug tracking-tight group-hover:underline underline-offset-4">{card.title}</p>
        {card.summary && <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--ed-dim)" }}>{card.summary}</p>}
      </div>
    </Link>
  );
}
