import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import SettingsPanel from "@/components/SettingsPanel";
import NotificationBell from "@/components/NotificationBell";
import ShareArchiveButton from "@/components/archive/ShareArchiveButton";
import ArchiveAddSheet from "@/components/archive/ArchiveAddSheet";
import { ENABLE_NOTIFICATIONS } from "@/lib/pilotFlags";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { guestbookNoteHref } from "@/lib/archiveSpaceNotes";
import { getUserDiscoveryContext } from "@/lib/discoverySignals";
import { buildTasteProfile, topAttributes } from "@/lib/discoveryRecommend";
import { formatDotDate } from "@/lib/time";
import { normalizeArea } from "@/lib/editorial/area";
import { filterLibrary, getLibrary, libraryHref, parseLibraryFilter, type LibraryFilter, type LibraryItem } from "@/lib/archive/library";
import { curatorAccess } from "@/lib/curators/access";
import { getViewerCuratorContext } from "@/lib/curators/viewerTaste";
import ArchiveCuratorBlock from "@/components/curators/ArchiveCuratorBlock";
import { profilePath } from "@/lib/profile/publicProfile";
import { ShareNeedsProfileButton, ShareProfileButton } from "@/components/profile/ProfileActions";

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

/** 컨택트 시트 한 칸 — 정사각 사진 + 아주 작은 캡션. 사진이 없으면 이름만 놓인 회색 칸. */
function Cell({ it, priority, isPublic }: { it: LibraryItem; priority: boolean; isPublic: boolean }) {
  const status = it.visited ? (it.visitCount > 1 ? `다녀옴 ${it.visitCount}` : "다녀옴") : "가보고 싶음";
  return (
    <Link href={libraryHref(it.key)} className="group block min-w-0">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1 / 1", background: "var(--ed-soft)" }}>
        {it.cover ? (
          <Image src={it.cover} alt={it.name} fill sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 33vw" className="object-cover transition-opacity group-hover:opacity-90" priority={priority} />
        ) : (
          <span className="absolute inset-0 flex flex-col justify-between p-2">
            <span className="text-[10px] tracking-[0.08em] uppercase" style={{ color: "var(--ed-dim)" }}>{it.source ?? (it.personal ? "기록" : "")}</span>
            <span aria-hidden className="text-2xl font-bold leading-none" style={{ color: "var(--ed-line)" }}>{it.name.slice(0, 1)}</span>
          </span>
        )}
        {!it.visited && <span aria-hidden className="absolute right-1.5 top-1.5 w-2 h-2" style={{ border: "1.5px solid #fff", background: "rgba(0,0,0,0.35)" }} />}
      </div>
      <p className="pt-1.5 text-[12px] font-semibold leading-tight truncate">{it.name}</p>
      <p className="text-[10px] leading-tight truncate tabular-nums" style={{ color: "var(--ed-dim)" }}>
        {[status, it.photoCount ? `사진 ${it.photoCount}` : null, it.personal ? "개인 기록" : null, it.demo ? "가상" : null, isPublic ? "공개" : null].filter(Boolean).join(" · ")}
      </p>
    </Link>
  );
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
  const access = curatorAccess({ admin, editorial });
  const includeDemo = admin || process.env.NODE_ENV === "development";
  const filter = parseLibraryFilter(sp);
  const limit = Math.min(Math.max(Number(sp.n) || PAGE, PAGE), 600);

  const unreadNotificationCount = ENABLE_NOTIFICATIONS
    ? await prisma.notification.count({ where: { receiverId: user.id, isRead: false } })
    : 0;

  const [library, guestbookNotes, discovery, curatorCtx, profileSpaces, followingCount, followerCount] = await Promise.all([
    getLibrary(user.id, { includeDemo }),
    prisma.guestbookNote.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: TRACE_PREVIEW + 1,
      select: { id: true, content: true, createdAt: true, space: { select: { slug: true, name: true } }, session: { select: { id: true, status: true } } },
    }),
    getUserDiscoveryContext(user.id, { includeDemo: access.includeDemo }),
    access.enabled ? getViewerCuratorContext(user.id, access) : Promise.resolve(null),
    // 공개 취향 프로필 — 내가 공개로 고른 공간(칸에 "공개" 표시)과 따라가는 취향 수(새 정보구조를 볼 때만)
    editorial ? prisma.profileSpace.findMany({ where: { userId: user.id }, select: { space: { select: { slug: true } } } }) : Promise.resolve([]),
    editorial ? prisma.savedTaste.count({ where: { userId: user.id } }) : Promise.resolve(0),
    editorial ? prisma.savedTaste.count({ where: { targetUserId: user.id } }) : Promise.resolve(0),
  ]);
  const publicKeys = new Set(profileSpaces.map((p) => `s-${p.space.slug}`));

  const shown = filterLibrary(library, filter);
  const counts = {
    all: library.length,
    visited: library.filter((i) => i.visited).length,
    saved: library.filter((i) => i.saved && !i.visited).length,
  };
  const areas = [...new Set(library.map((i) => normalizeArea(i.area)).filter((a): a is string => !!a))].sort((a, b) => a.localeCompare(b, "ko"));
  const myTags = [...new Set(library.flatMap((i) => i.tags))];
  // 취향 가중치는 추천에만 쓴다 — 화면에는 태그·통계로 내보내지 않고, 추천 입구를 보일지만 판단한다.
  const hasTaste = topAttributes(buildTasteProfile(discovery.signals), 1).length > 0;
  const filtered = filter.q || filter.area || filter.tag;

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <header className="ed-container pt-8 md:pt-14 pb-6">
          <div className="flex items-center justify-end gap-4 pb-5">
            {ENABLE_NOTIFICATIONS && <NotificationBell initialUnreadCount={unreadNotificationCount} />}
            {/* 새 정보구조에서는 공유를 아래 큰 버튼(공개 프로필 주소)으로 — 그 전에는 기존 공유 링크 그대로 */}
            {!editorial && <ShareArchiveButton userId={user.id} />}
            <SettingsPanel
              nickname={user.nickname}
              nicknameUpdatedAt={user.nicknameUpdatedAt?.toISOString() ?? null}
              profile={editorial ? { public: user.profilePublic, handle: user.profileHandle, bio: user.profileBio } : undefined}
            />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Archive{user.nickname ? ` · ${user.nickname}` : ""}</p>
              <h1 className="pt-3 text-[40px] md:text-[64px] font-bold leading-none tracking-[-0.04em]">내 아카이브</h1>
              <p className="pt-3 text-base md:text-lg leading-relaxed" style={{ color: "var(--ed-dim)" }}>내가 발견하고 머물렀던 공간들. 나만 보는 기록이에요.</p>
            </div>
            <ArchiveAddSheet />
          </div>
          {editorial && (
            // 사람과의 연결 — 아카이브(나의 기록)에서 공개 프로필(다른 사람이 보는 나의 공간)로 나가는 입구.
            // 관계 수는 작은 보조 문구로만(인기 경쟁처럼 보이지 않게), 각 목록으로 이어진다.
            <div className="pt-6 space-y-3">
              <div className="flex flex-wrap items-start gap-2">
                {/* 아카이브의 주 행동은 "공간 추가"(검정) — 사람 찾기·공유는 같은 크기의 테두리 버튼으로 */}
                <Link href="/archive/people" className="inline-flex items-center justify-center h-12 px-6 text-[15px] font-semibold" style={{ border: "1px solid var(--ed-fg)", color: "var(--ed-fg)" }}>
                  사람 찾기
                </Link>
                {user.profilePublic && user.profileHandle ? (
                  <ShareProfileButton path={profilePath(user.profileHandle)} name={user.nickname ?? user.profileHandle} label="내 아카이브 공유하기" />
                ) : (
                  <ShareNeedsProfileButton label="내 아카이브 공유하기" />
                )}
              </div>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: "var(--ed-dim)" }}>
                {user.profileHandle ? (
                  <Link href={profilePath(user.profileHandle)} className="font-semibold underline underline-offset-4" style={{ color: "var(--ed-fg)" }}>
                    {user.profilePublic ? "내 공개 프로필 보기 →" : "공개 프로필 미리보기(비공개) →"}
                  </Link>
                ) : (
                  <span>공개 프로필은 설정(⚙)에서 만들 수 있어요</span>
                )}
                <Link href="/archive/following" className="hover:underline underline-offset-4">따라가는 취향 <span className="tabular-nums">{followingCount}</span></Link>
                {user.profilePublic && user.profileHandle ? (
                  <Link href={`${profilePath(user.profileHandle)}/followers`} className="hover:underline underline-offset-4">나를 따라가는 사람 <span className="tabular-nums">{followerCount}</span></Link>
                ) : (
                  <span>나를 따라가는 사람 <span className="tabular-nums">{followerCount}</span></span>
                )}
              </p>
            </div>
          )}
        </header>

        {/* 보기 · 검색 · 지역 · 내 태그 — 100곳 이상이어도 찾을 수 있도록 */}
        <section className="ed-container" style={{ borderBottom: "1px solid var(--ed-line)" }}>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <nav aria-label="보기" className="flex gap-5">
              {([["all", "전체"], ["visited", "다녀온 공간"], ["saved", "저장한 공간"]] as const).map(([v, label]) => (
                <Link key={v} href={hrefWith(filter, { view: v })} aria-current={filter.view === v ? "page" : undefined} className="py-3 text-sm font-semibold whitespace-nowrap" style={{ opacity: filter.view === v ? 1 : 0.45, borderBottom: filter.view === v ? "1.5px solid var(--ed-fg)" : "1.5px solid transparent" }}>
                  {label} <span className="tabular-nums font-normal">{counts[v]}</span>
                </Link>
              ))}
            </nav>
            {library.length > 0 && (
              <form method="get" action="/archive" className="flex items-center gap-2 py-2" role="search">
                {filter.view !== "all" && <input type="hidden" name="view" value={filter.view} />}
                <input name="q" defaultValue={filter.q} placeholder="공간 이름" aria-label="공간 이름으로 찾기" className="h-9 w-36 md:w-48 px-3 text-sm outline-none" style={{ border: "1px solid var(--ed-line)" }} />
              </form>
            )}
          </div>
          {(areas.length > 1 || myTags.length > 0) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pb-3 text-xs">
              {areas.length > 1 && areas.map((a) => (
                <Link key={a} href={hrefWith(filter, { area: filter.area === a ? null : a })} style={{ fontWeight: filter.area === a ? 700 : 400, color: filter.area === a ? "var(--ed-fg)" : "var(--ed-dim)" }}>
                  {a}
                </Link>
              ))}
              {myTags.map((t) => (
                <Link key={t} href={hrefWith(filter, { tag: filter.tag === t ? null : t })} style={{ fontWeight: filter.tag === t ? 700 : 400, color: filter.tag === t ? "var(--ed-fg)" : "var(--ed-dim)" }}>
                  #{t}
                </Link>
              ))}
              {filtered && <Link href={hrefWith(filter, { q: "", area: null, tag: null })} className="underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>필터 지우기</Link>}
            </div>
          )}
        </section>

        <section className="ed-container pt-5">
          {library.length === 0 ? (
            <div className="py-14 max-w-[560px] space-y-2">
              <p className="text-lg font-bold">아직 아카이브가 비어 있어요.</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>
                “공간 추가”에서 공간을 검색해 고르고, 가보고 싶은지 다녀왔는지만 남기면 시작할 수 있어요.
                Cube가 있는 공간에 다녀오면 그 기록도 여기에 쌓여요.
              </p>
            </div>
          ) : shown.length === 0 ? (
            <p className="py-12 text-sm" style={{ color: "var(--ed-dim)" }}>조건에 맞는 공간이 없어요.</p>
          ) : (
            <>
              <ul className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-1.5 gap-y-4 md:gap-x-3 md:gap-y-6">
                {shown.slice(0, limit).map((it, i) => (
                  <li key={it.key} className="min-w-0"><Cell it={it} priority={i < 6} isPublic={publicKeys.has(it.key)} /></li>
                ))}
              </ul>
              {shown.length > limit && (
                <div className="pt-8 text-center">
                  <Link href={hrefWith(filter, { n: limit + PAGE })} scroll={false} className="inline-flex items-center h-10 px-5 text-sm" style={{ border: "1px solid var(--ed-line)" }}>
                    더 보기 <span className="ml-2 tabular-nums" style={{ color: "var(--ed-dim)" }}>{shown.length - limit}</span>
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        {/* 쌓인 기록 → 다음 공간 — 취향을 태그·통계로 보여주지 않고 추천으로만 잇는다 */}
        {hasTaste && (
          <section className="ed-container pt-14">
            <div className="py-6 flex flex-wrap items-end justify-between gap-4" style={{ borderTop: "1px solid var(--ed-fg)" }}>
              <div className="space-y-1">
                <p className="ed-label" style={{ color: "var(--ed-dim)" }}>이 취향으로 추천받기</p>
                <p className="text-base md:text-lg break-keep">저장하고 다녀온 공간들과 비슷한 결의 공간을 찾아드려요.</p>
              </div>
              <Link href="/find" className="tap-target inline-flex items-center px-5 text-sm font-semibold" style={{ border: "1px solid var(--ed-fg)" }}>나에게 맞는 공간 보기 →</Link>
            </div>
          </section>
        )}

        {curatorCtx && <div className="pt-4"><ArchiveCuratorBlock ctx={curatorCtx} /></div>}

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
