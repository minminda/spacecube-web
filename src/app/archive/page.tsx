import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import NotificationBell from "@/components/NotificationBell";
import PageHeader from "@/components/editorial/PageHeader";
import TabLinks from "@/components/editorial/TabLinks";
import SpaceTile, { SPACE_GRID_CLASS, SPACE_GRID_SIZES } from "@/components/editorial/SpaceTile";
import ShareArchiveButton from "@/components/archive/ShareArchiveButton";
import ArchiveAddSheet from "@/components/archive/ArchiveAddSheet";
import { ENABLE_NOTIFICATIONS } from "@/lib/pilotFlags";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { guestbookNoteHref } from "@/lib/archiveSpaceNotes";
import { getUserDiscoveryContext } from "@/lib/discoverySignals";
import { buildTasteProfile, topAttributes } from "@/lib/discoveryRecommend";
import { formatDotDate } from "@/lib/time";
import { normalizeArea } from "@/lib/editorial/area";
import { filterLibrary, getLibrary, libraryHref, parseLibraryFilter, type LibraryFilter } from "@/lib/archive/library";
import { curatorAccess } from "@/lib/curators/access";
import { profilePath } from "@/lib/profile/publicProfile";
import { ShareProfileButton } from "@/components/profile/ProfileActions";
import { ensureProfileHandle } from "@/lib/profile/handle";

export const metadata = { title: "내 아카이브 — 공간큐브", robots: { index: false } };

interface Props {
  searchParams: Promise<{ space?: string; view?: string; q?: string; area?: string; tag?: string; n?: string }>;
}

const PAGE = 60;
const TRACE_PREVIEW = 4;

function hrefWith(f: LibraryFilter, patch: Partial<LibraryFilter> & { n?: number }): string {
  const next = { ...f, ...patch };
  const p = new URLSearchParams();
  if (next.view !== "all") p.set("view", next.view);
  if (next.q) p.set("q", next.q);
  if (next.area) p.set("area", next.area);
  if (next.tag) p.set("tag", next.tag);
  if (patch.n) p.set("n", String(patch.n));
  const s = p.toString();
  return s ? `/archive?${s}` : "/archive";
}

/**
 * 내 아카이브 — 내가 발견하고 머물렀던 공간이 사진 중심으로 쌓이는 개인 라이브러리.
 * 공간큐브 안의 저장 · Cube 방문 · 큐레이터 컬렉션에서의 저장 · 사진/링크로 직접 추가한 공간이 한 그리드에 모인다
 * (src/lib/archive/library.ts가 공간 기준으로 합친다). + 공간 추가로 몇 초 만에 기록하고, 쌓인 기록은 취향과 추천으로 이어진다.
 * 모든 내용은 본인에게만 보인다.
 */
export default async function ArchivePage({ searchParams }: Props) {
  const sp = await searchParams;
  // 이전 "공간 노트" 딥링크(/archive?space=) 호환 — 그 공간의 자세히 보기로 보낸다.
  if (sp.space) redirect(`/archive/space/${encodeURIComponent(sp.space)}`);

  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Farchive");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  const admin = isAdmin(session.user.email);
  const editorial = ENABLE_EDITORIAL_HOME || admin;
  // 공유 주소(/@handle)는 공개 여부와 상관없이 항상 있어야 한다 — 가입 때 못 받은 사람은 여기서 발급
  const handle = editorial ? user.profileHandle ?? (await ensureProfileHandle(user.id)) : user.profileHandle;
  const access = curatorAccess({ admin, editorial });
  const includeDemo = admin || process.env.NODE_ENV === "development";
  const filter = parseLibraryFilter(sp);
  const limit = Math.min(Math.max(Number(sp.n) || PAGE, PAGE), 600);

  const unreadNotificationCount = ENABLE_NOTIFICATIONS
    ? await prisma.notification.count({ where: { receiverId: user.id, isRead: false } })
    : 0;

  const [library, guestbookNotes, discovery, followingCount, followerCount] = await Promise.all([
    getLibrary(user.id, { includeDemo }),
    prisma.guestbookNote.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: TRACE_PREVIEW + 1,
      select: { id: true, content: true, createdAt: true, space: { select: { slug: true, name: true } }, session: { select: { id: true, status: true } } },
    }),
    getUserDiscoveryContext(user.id, { includeDemo: access.includeDemo }),
    editorial ? prisma.savedTaste.count({ where: { userId: user.id } }) : Promise.resolve(0),
    editorial ? prisma.savedTaste.count({ where: { targetUserId: user.id } }) : Promise.resolve(0),
  ]);

  const shown = filterLibrary(library, filter);
  const counts = {
    all: library.length,
    visited: library.filter((i) => i.visited).length,
    saved: library.filter((i) => i.saved && !i.visited).length,
  };
  const areas = [...new Set(library.map((i) => normalizeArea(i.area)).filter((a): a is string => !!a))].sort((a, b) => a.localeCompare(b, "ko"));
  // 취향 가중치는 추천에만 쓴다 — 화면에는 태그·통계로 내보내지 않고, 추천 입구를 보일지만 판단한다.
  const hasTaste = topAttributes(buildTasteProfile(discovery.signals), 1).length > 0;
  const filtered = filter.q || filter.area || filter.tag;

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <PageHeader
          label={`Archive${user.nickname ? ` · ${user.nickname}` : ""}`}
          title="내 아카이브"
          tools={
            <>
              {ENABLE_NOTIFICATIONS && <NotificationBell initialUnreadCount={unreadNotificationCount} />}
              {/* 설정은 톱니바퀴 없이 메뉴의 "설정"(/settings)으로 */}
              {!editorial && <ShareArchiveButton userId={user.id} />}
            </>
          }
        >
          {/* 핵심 행동 두 가지 — 공간 추가(Primary) · 내 아카이브 공유(Secondary)를 세로로.
              크기는 추천의 공간/사람 세그먼트와 같다(휴대폰 전체 폭, 데스크톱 360px · 높이 46px).
              공유는 공개 여부와 상관없이 항상 내 /@handle — 비공개면 받는 사람에게 "비공개 아카이브입니다."가 보인다. */}
          <div className="pt-6 w-full md:max-w-[360px] flex flex-col gap-2">
            <ArchiveAddSheet className="ed-btn ed-btn-primary ed-btn-seg w-full" />
            {editorial && handle && (
              <ShareProfileButton handle={handle} label="내 아카이브 공유" variant="seg" />
            )}
          </div>
          {editorial && (
            // 공개 주소 · 관계 수 — 작은 보조 줄(인기 경쟁처럼 보이지 않게 숫자도 작게). 공유 행동은 위 버튼 하나뿐.
            <div className="pt-2 flex flex-wrap items-center gap-x-5 text-xs" style={{ color: "var(--ed-dim)" }}>
              {handle && (
                <Link href={profilePath(handle)} className="inline-flex items-center min-h-10 text-[13px] font-semibold underline underline-offset-4" style={{ color: "var(--ed-fg)" }}>
                  @{handle}{user.profilePublic ? "" : " (비공개)"}
                </Link>
              )}
              <Link href="/archive/following" className="inline-flex items-center min-h-10 hover:underline underline-offset-4">따라가는 취향 <span className="ml-1 tabular-nums">{followingCount}</span></Link>
              {user.profilePublic && handle ? (
                <Link href={`${profilePath(handle)}/followers`} className="inline-flex items-center min-h-10 hover:underline underline-offset-4">나를 따라가는 사람 <span className="ml-1 tabular-nums">{followerCount}</span></Link>
              ) : (
                <span className="inline-flex items-center min-h-10">나를 따라가는 사람 <span className="ml-1 tabular-nums">{followerCount}</span></span>
              )}
            </div>
          )}
        </PageHeader>

        {/* 보기 · 검색 · 지역 — 100곳 이상이어도 찾을 수 있도록. 태그는 화면에 내지 않는다(취향은 사진으로) */}
        <section className="ed-container" style={{ borderBottom: "1px solid var(--ed-line)" }}>
          <div className="flex flex-wrap items-center justify-between gap-x-6">
            <TabLinks
              label="보기"
              active={filter.view}
              tabs={([["all", "전체"], ["visited", "다녀온 곳"], ["saved", "가보고 싶은 곳"]] as const).map(([v, label]) => ({ key: v, label: `${label} ${counts[v]}`, href: hrefWith(filter, { view: v }) }))}
            />
            {library.length > 0 && (
              <form method="get" action="/archive" className="w-full sm:w-auto pb-3 sm:py-2" role="search">
                {filter.view !== "all" && <input type="hidden" name="view" value={filter.view} />}
                <input name="q" type="search" defaultValue={filter.q} placeholder="공간 이름" aria-label="공간 이름으로 찾기" className="h-10 w-full sm:w-48 px-3 text-sm outline-none" style={{ border: "1px solid var(--ed-line)" }} />
              </form>
            )}
          </div>
          {(areas.length > 1 || filtered) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pb-3 text-xs">
              {areas.length > 1 && areas.map((a) => (
                <Link key={a} href={hrefWith(filter, { area: filter.area === a ? null : a })} className="inline-flex items-center min-h-8" style={{ fontWeight: filter.area === a ? 700 : 400, color: filter.area === a ? "var(--ed-fg)" : "var(--ed-dim)" }}>
                  {a}
                </Link>
              ))}
              {filtered && <Link href={hrefWith(filter, { q: "", area: null, tag: null })} className="inline-flex items-center min-h-8 underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>필터 지우기</Link>}
            </div>
          )}
        </section>

        <section className="ed-container pt-6">
          {library.length === 0 ? (
            <div className="py-12 space-y-4">
              <p className="text-base font-semibold">아직 담은 공간이 없어요.</p>
              {editorial && <Link href="/find" className="ed-btn ed-btn-sm">추천에서 찾아보기</Link>}
            </div>
          ) : shown.length === 0 ? (
            <p className="py-12 text-sm" style={{ color: "var(--ed-dim)" }}>조건에 맞는 공간이 없어요.</p>
          ) : (
            <>
              <ul className={SPACE_GRID_CLASS}>
                {shown.slice(0, limit).map((it, i) => (
                  <li key={it.key} className="min-w-0">
                    <SpaceTile
                      href={libraryHref(it.key)}
                      image={{ src: it.cover, alt: it.name }}
                      name={it.name}
                      meta={[normalizeArea(it.area), it.personal ? "개인 기록" : null, it.demo ? "가상" : null].filter(Boolean).join(" · ")}
                      sizes={SPACE_GRID_SIZES}
                      priority={i < 4}
                    />
                  </li>
                ))}
              </ul>
              {shown.length > limit && (
                <div className="pt-8 text-center">
                  <Link href={hrefWith(filter, { n: limit + PAGE })} scroll={false} className="ed-btn ed-btn-sm">
                    더 보기 <span className="ml-2 tabular-nums" style={{ color: "var(--ed-dim)" }}>{shown.length - limit}</span>
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        {/* 쌓인 기록 → 다음 공간 — 취향을 태그·통계로 보여주지 않고 추천으로만 잇는다 */}
        {hasTaste && editorial && (
          <section className="ed-container pt-14">
            <Link href="/find" className="group flex items-center justify-between gap-4 py-5" style={{ borderTop: "1px solid var(--ed-fg)", borderBottom: "1px solid var(--ed-line)" }}>
              <span className="text-base md:text-lg font-semibold break-keep group-hover:underline underline-offset-4">이 취향과 비슷한 공간</span>
              <span aria-hidden className="text-sm">추천 →</span>
            </Link>
          </section>
        )}


        {/* 나의 흔적 — 방명록에 남긴 문장 */}
        {guestbookNotes.length > 0 && (
          <section className="ed-container pt-10">
            <p className="ed-label pb-2" style={{ color: "var(--ed-dim)" }}>나의 흔적 · 방명록</p>
            <ul>
              {guestbookNotes.slice(0, TRACE_PREVIEW).map((n) => (
                <li key={n.id} style={{ borderBottom: "1px solid var(--ed-line)" }}>
                  <Link
                    href={guestbookNoteHref({ id: n.id, spaceSlug: n.space.slug, sessionId: n.session.id, sessionStatus: n.session.status })}
                    className="group grid grid-cols-[1fr_auto] gap-4 py-4 items-baseline"
                  >
                    <span className="text-[15px] leading-relaxed break-keep group-hover:underline underline-offset-4">“{n.content}”</span>
                    <span className="text-xs tabular-nums text-right" style={{ color: "var(--ed-dim)" }}>{n.space.name}<br />{formatDotDate(n.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
