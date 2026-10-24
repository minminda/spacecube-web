import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DetailCloseButton from "@/components/editorial/DetailCloseButton";
import PartnerMark from "@/components/editorial/PartnerMark";
import EdImage from "@/components/editorial/EdImage";
import DetailRail from "@/components/editorial/DetailRail";
import SiteFooter from "@/components/editorial/SiteFooter";
import SpaceRelation from "@/components/editorial/SpaceRelation";
import DiscoveryTracker from "@/components/editorial/DiscoveryTracker";
import MapLink from "@/components/editorial/MapLink";
import BlockRenderer from "@/components/editorial/BlockRenderer";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import PreviewBanner from "@/components/editorial/PreviewBanner";
import { getSpaceBySlug, getDemoStoriesForSpace, getStoriesForSpace, listSpaces, personStoryItem, thoughtStoryItem } from "@/lib/editorial/queries";
import { curationEyebrow, spaceCoverImage, spaceHref } from "@/lib/editorial/types";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { pickSpaceReasons, relatedSpacesFor } from "@/lib/editorial/spaceDetailLinks";
import { getMySpaceState } from "@/lib/archive/entries";
import { libraryHref } from "@/lib/archive/library";
import { getPartnerEpisodes } from "@/lib/editorial/partnerEpisodes";
import PartnerEpisodeList from "@/components/editorial/PartnerEpisodeList";
import { demoBadge, isExtendedSpace, isPublicDemoSpace } from "@/lib/demoSpaces";
import { normalizeArea } from "@/lib/editorial/area";
import { INSTAGRAM_URL } from "@/content/site";
import { curatorAccess } from "@/lib/curators/access";
import { PrototypeBanner } from "@/components/curators/CuratorBits";

interface Props {
  slug: string;
  /** page: 독립 페이지(주소창 · 새 탭 · 휴대폰) / modal: 데스크톱 탐색 위의 창(@modal 가로채기 라우트) — 같은 내용 */
  presentation: "page" | "modal";
}

/**
 * 공개 SPACE 상세 — Editorial CMS의 공간 콘텐츠(발행된 것만, 관리자는 미리보기 가능).
 * Cube 운영 DB·Episode/Scene·방명록(/space/[slug]/**)으로는 어떤 링크도 두지 않는다.
 * 함께한 공간(cubeAvailable)이면 웹 정본인 "운영자의 이야기"(story 블록)를 전부 보여주고,
 * 현장 Cube는 이 이야기의 뒷부분이 아니라 그 자리에서만 의미 있는 디테일이라는 점을 안내한다.
 * 방명록 참여자 수 · 기록 수는 공개 상세에 노출하지 않는다(내용도 현장에서만).
 *
 * 순서(공간 자체 → 현장 경험 → 관련 콘텐츠): 대표 사진(16:9) → 공간명 · 한 줄 소개 → 내 공간(저장 · 다녀왔어요/또 갔어요 · 내 기록)
 * → 공간큐브가 고른 이유(큐레이션 note) → 공간 소개 → 정보 → 공간큐브가 있는 공간(Episode)
 * → 이 공간이 소개된 이야기(가로 줄) → 함께 소개된 공간(가로 줄) → 운영자의 이야기 → 사진.
 * 폭은 읽는 패널 하나(.ed-detail, 데스크톱 본문 720px) — 사진 비율은 그대로 두고 창 폭 · 여백으로 압축한다.
 */
export default async function SpaceDetail({ slug, presentation }: Props) {
  const viewer = await getEditorialViewer();
  const modal = presentation === "modal";
  if (!viewer.editorial) redirect("/");

  const access = curatorAccess(viewer);
  // 시연용 공개 가상 공간(demo- 접두어)은 일반 공간처럼 DB에서 열린다. 그 밖의 가상 공간(큐레이터 프로토타입)은 미리보기 권한(관리자 · 로컬)일 때만.
  const space = await getSpaceBySlug(slug, { preview: viewer.admin, allowDemo: access.includeDemo });
  if (!space) notFound();
  const publicDemo = isPublicDemoSpace({ isDemo: !!space.isDemo, slug: space.slug });

  const [stories0, published, savedIds, partnerEp, demoStories] = await Promise.all([
    getStoriesForSpace(space.id),
    listSpaces(),
    getSavedEditorialSpaceIds(viewer.userId),
    space.cubeAvailable ? getPartnerEpisodes(space.slug) : Promise.resolve(null),
    publicDemo ? getDemoStoriesForSpace(space.id) : Promise.resolve({ curations: [], people: [], thoughts: [] }),
  ]);
  const curations = [...demoStories.curations, ...stories0.curations];
  const people = [...demoStories.people, ...stories0.people];
  const thoughts = [...demoStories.thoughts, ...stories0.thoughts];
  const saved = savedIds.has(space.id);
  const mine = viewer.userId ? await getMySpaceState(viewer.userId, space, saved) : null;
  const area = normalizeArea(space.area);
  const sameArea = published.filter((s) => s.id !== space.id && normalizeArea(s.area) === area);
  // 큐레이션은 number DESC(getStoriesForSpace) — HOME · 검색 카드의 선정 이유와 같은 첫 note
  const reasons = pickSpaceReasons(curations, space.id, 1);
  const related = relatedSpacesFor(space.id, curations, sameArea, 3);
  const relatedTitle = related.kind === "area" ? `${area ?? space.area}의 다른 공간` : related.kind === "curation" ? "함께 소개된 공간" : "이어서 볼 공간";
  const stories = [...people.map(personStoryItem), ...thoughts.map(thoughtStoryItem)];
  const story = space.story ?? [];

  const info = [
    { label: "지역", value: area ?? space.area },
    { label: "종류", value: space.category },
    // 시연용 가상 공간은 실제 주소가 없다 — 만들어 쓰지 않고 준비 중으로 표시한다
    { label: "주소", value: space.address ?? (publicDemo ? "위치 정보 준비 중" : undefined) },
    { label: "운영시간", value: space.hours },
  ].filter((r): r is { label: string; value: string } => !!r.value);
  const links = [
    { label: "Instagram", href: space.instagram },
    { label: "Website", href: space.website },
  ].filter((l): l is { label: string; href: string } => !!l.href);

  return (
    <div className={modal ? "ed-modal-body" : "editorial-bleed"}>
      {publicDemo ? (
        isExtendedSpace(space.slug) ? (
          <p className="ed-container pt-3 text-xs" style={{ color: "var(--ed-dim)" }}>시연 컬렉션 — 망원 시연을 위해 등록한 실제 장소의 일반 공간이에요. 공간큐브 QR · Episode는 아직 없고, 등록된 정보만 보여 드려요.</p>
        ) : (
          <p className="ed-container pt-3 text-xs" style={{ color: "var(--ed-dim)" }}>시연용 공간 — 공간큐브를 보여 주기 위해 만든 가상 공간이며 실제 장소가 아닙니다. 지역 &ldquo;망원&rdquo;은 시연용 분류예요.</p>
        )
      ) : space.isDemo ? <PrototypeBanner demo /> : <PreviewBanner status={space.status} editHref={`/admin/content/spaces/${space.id}`} />}
      {!space.isDemo && <DiscoveryTracker spaceId={space.id} />}
      <main className={modal ? "pt-14" : "relative pt-12 md:pt-8"}>
        {/* 휴대폰 상세는 전체 페이지 — 화면 오른쪽 위에 닫기(이전 화면으로). 사진 위가 아니라 사진 위쪽 여백(pt-12)에 둬서 겹치지 않는다.
            데스크톱 창은 창 자체의 X · 바깥 클릭 · ESC */}
        {!modal && (
          <div className="md:hidden absolute top-0.5" style={{ right: "max(4px, env(safe-area-inset-right))" }}>
            <DetailCloseButton />
          </div>
        )}
        {/* 대표 사진 — 원래 비율 16:9(휴대폰 · 데스크톱 동일). 높이를 줄이려고 비율을 바꾸지 않고, 상세 폭(.ed-detail)을 좁혀 사진이 옆으로 늘어나 보이지 않게 한다 */}
        <div className="ed-container ed-detail">
          <EdImage image={spaceCoverImage(space)} ratio="16 / 9" sizes="(min-width: 800px) 720px, 100vw" priority />
        </div>

        {/* 공간명 · 한 줄 소개 */}
        <header className="ed-container ed-detail pt-4 md:pt-5 space-y-1.5 md:space-y-2">
          <p className="ed-label inline-flex items-center gap-2" style={{ color: "var(--ed-dim)" }}>
            {area ?? space.area} · {space.category}
            {space.cubeAvailable && <PartnerMark size={14} />}
          </p>
          <h1 className="text-[32px] md:text-[44px] font-bold leading-[1.06] tracking-[-0.04em] break-keep">{space.name}</h1>
          {space.summary && <p className="text-[15px] md:text-[17px] leading-relaxed break-keep">{space.summary}</p>}
        </header>

        {/* 내 공간 — 저장 · 다녀왔어요/또 갔어요 · 내 기록 보기. 저장 버튼은 상세에서 이 한 곳에만 둔다 */}
        <div className="ed-container ed-detail pt-3 md:pt-4">
          <SpaceRelation
            spaceId={space.id}
            spaceName={space.name}
            loggedIn={viewer.loggedIn}
            initialSaved={saved}
            initialVisits={mine?.kind === "visited" ? mine.visits : 0}
            hasEntry={!!mine && mine.kind !== "none" && !!mine.entryId}
            archiveHref={libraryHref(`s-${space.slug}`)}
          />
        </div>

        {/* 공간큐브가 고른 이유 — 큐레이션 note 1개 + 출처 큐레이션 */}
        {reasons.length > 0 && (
          <section className="ed-container ed-detail pt-6 md:pt-8" aria-label="공간큐브가 고른 이유">
            <p className="ed-label pb-1.5" style={{ color: "var(--ed-dim)" }}>공간큐브가 고른 이유</p>
            {reasons.map((r) => (
              <figure key={r.curation.id}>
                <blockquote className="text-base md:text-lg font-medium leading-relaxed break-keep">{r.note}</blockquote>
                <figcaption className="pt-1 text-xs md:text-sm">
                  <Link href={`/curation/${r.curation.slug}`} className="underline-offset-4 hover:underline" style={{ color: "var(--ed-dim)" }}>
                    {r.curation.title} →
                  </Link>
                </figcaption>
              </figure>
            ))}
          </section>
        )}

        {/* 공간 소개 */}
        <section className="ed-container ed-detail pt-6 md:pt-8 space-y-2.5">
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>공간 소개</p>
          {space.description && space.description.length > 0 ? (
            space.description.map((para, i) => (
              <p key={i} className="text-[15px] md:text-base leading-[1.8]">{para}</p>
            ))
          ) : (
            <p className="text-[15px] leading-[1.8]" style={{ color: "var(--ed-dim)" }}>공간 소개를 준비하고 있어요.</p>
          )}
          {space.tags && space.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {space.tags.map((t) => (
                <li key={t} className="text-xs px-2.5 py-1 rounded-[var(--ed-radius)]" style={{ border: "1px solid var(--ed-line)", color: "var(--ed-dim)" }}>{t}</li>
              ))}
            </ul>
          )}
        </section>

        {/* 기본 정보 */}
        <section className="ed-container ed-detail pt-6 md:pt-8">
          <p className="ed-label pb-2" style={{ color: "var(--ed-dim)", borderBottom: "1px solid var(--ed-fg)" }}>정보</p>
          <dl>
            {info.map((r) => (
              <div key={r.label} className="grid grid-cols-[56px_1fr] gap-3 py-2 text-sm" style={{ borderBottom: "1px solid var(--ed-line)" }}>
                <dt style={{ color: "var(--ed-dim)" }}>{r.label}</dt>
                <dd className="leading-relaxed break-keep whitespace-pre-line">{r.value}</dd>
              </div>
            ))}
          </dl>
          {(space.mapUrl || links.length > 0) && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 pt-2.5">
              {space.mapUrl && (
                <MapLink href={space.mapUrl} spaceId={space.id} track={!space.isDemo} className="text-sm font-medium hover:underline underline-offset-4">
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
        </section>

        {/* 공간큐브가 있는 공간 — 정보 바로 아래(공간 자체 정보 → 현장 경험 → 관련 콘텐츠). 뜻은 "현장에서 공간큐브 경험이 가능하다"뿐(인증 · 등급이 아니다).
            본문 섹션이라 라벨을 진하게 — 아래 보조 줄(이야기 · 함께 소개된 공간)보다 강하게. 연결된 운영 공간 · 공개 Episode가 아직 없으면 안내 문장만 */}
        {space.cubeAvailable && (
          <section className="ed-container ed-detail pt-6 md:pt-8">
            <p className="ed-label pb-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
              공간큐브가 있는 공간 <span aria-hidden><PartnerMark size={13} /></span>
            </p>
            <p className="pt-2 text-sm leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
              {partnerEp && partnerEp.episodes.length > 0
                ? "현장에서 QR을 찍으면 이 공간의 Episode가 열려요."
                : "현장에서 공간큐브의 QR로 이 공간의 이야기를 만날 수 있어요."}
            </p>
            {partnerEp && partnerEp.episodes.length > 0 && (
              <PartnerEpisodeList slug={space.slug} episodes={partnerEp.episodes} unlocked={partnerEp.unlocked} />
            )}
          </section>
        )}

        {/* 이 공간이 소개된 이야기 — 보조 콘텐츠: 작은 가로 카드 한 줄(휴대폰 · 데스크톱 모두 옆으로 넘김) */}
        {(curations.length > 0 || stories.length > 0) && (
          <div className="ed-container ed-detail pt-6 md:pt-8">
            <DetailRail title="이 공간이 소개된 이야기" kind="story">
              {[
                ...curations.map((c) => ({ key: c.id, href: `/curation/${c.slug}`, cover: c.cover, eyebrow: curationEyebrow(c), title: c.title })),
                ...stories.map((st) => ({ key: st.key, href: st.href, cover: st.cover, eyebrow: st.eyebrow, title: st.title })),
              ].map((it) => (
                <li key={it.key}>
                  <Link href={it.href} className="group grid grid-cols-[56px_1fr] gap-2.5 items-start p-2 h-full rounded-[var(--ed-radius)]" style={{ border: "1px solid var(--ed-line)" }}>
                    <EdImage image={it.cover} ratio="1 / 1" sizes="56px" />
                    <span className="block min-w-0 space-y-0.5">
                      <span className="block ed-label truncate" style={{ color: "var(--ed-dim)" }}>{it.eyebrow}</span>
                      <span className="text-[13px] font-semibold leading-snug break-keep line-clamp-2 group-hover:underline underline-offset-4">{it.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </DetailRail>
          </div>
        )}

        {/* 함께 소개된 공간 — 사진 · 공간명 · 지역만 있는 작은 카드 한 줄(카드 전체가 그 공간 상세로) */}
        {related.spaces.length > 0 && (
          <div className="ed-container ed-detail pt-6 md:pt-8">
            <DetailRail title={relatedTitle} kind="space">
              {related.spaces.map((s) => (
                <li key={s.slug}>
                  <Link href={spaceHref(s.slug)} className="group block space-y-1.5">
                    <EdImage image={spaceCoverImage(s)} ratio="1 / 1" sizes="128px" />
                    <span className="block min-w-0">
                      <span className="block text-[13px] font-semibold leading-snug truncate group-hover:underline underline-offset-4">{s.name}</span>
                      <span className="block text-xs truncate" style={{ color: "var(--ed-dim)" }}>
                        {[normalizeArea(s.area) ?? s.area, s.isDemo ? demoBadge(s.slug) : null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </DetailRail>
          </div>
        )}

        {/* 운영자의 이야기(함께한 공간의 웹 정본 · 긴 글) · 사진 묶음 — 목차(정보 → 공간큐브 → 이야기 → 함께 소개된 공간) 뒤에 이어 읽는 본문 */}
        {space.cubeAvailable && story.length > 0 && (
          <section className="mt-8 md:mt-10" style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container ed-detail pt-6 md:pt-8">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>운영자의 이야기</p>
            </div>
            <article className="ed-container ed-detail pt-5 md:pt-6">
              <BlockRenderer blocks={story} spaces={new Map()} />
            </article>
          </section>
        )}

        {space.images && space.images.length > 0 && (
          <section className="ed-container ed-detail pt-6 md:pt-8">
            <div className="grid grid-cols-3 gap-1.5 md:gap-2">
              {space.images.map((src, i) => (
                <EdImage key={i} image={{ src, alt: `${space.name} 사진 ${i + 1}` }} ratio="4 / 5" sizes="(min-width: 800px) 240px, 33vw" />
              ))}
            </div>
          </section>
        )}

        <div className="ed-container ed-detail py-8 text-center">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>
            더 많은 공간 이야기는 Instagram에서 →
          </a>
        </div>
      </main>
      {!modal && <SiteFooter admin={viewer.admin} />}
    </div>
  );
}
