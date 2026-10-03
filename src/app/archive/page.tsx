import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import SettingsPanel from "@/components/SettingsPanel";
import NotificationBell from "@/components/NotificationBell";
import ShareArchiveButton from "@/components/archive/ShareArchiveButton";
import ArchiveTile, { type ArchiveTileData } from "@/components/archive/ArchiveTile";
import { ENABLE_NOTIFICATIONS } from "@/lib/pilotFlags";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { buildSpaceNoteEntries, guestbookNoteHref, type ArchiveRecordInput, type ArchiveGuestbookNoteInput } from "@/lib/archiveSpaceNotes";
import { getArchiveSavedTiles } from "@/lib/archiveSaved";
import { getUserDiscoveryContext } from "@/lib/discoverySignals";
import { buildTasteProfile, topAttributes } from "@/lib/discoveryRecommend";
import { formatDotDate } from "@/lib/time";

interface Props {
  searchParams: Promise<{ space?: string }>;
}

const PREVIEW = 8;
const TRACE_PREVIEW = 6;

function SectionHead({ label, title, count, href, cta }: { label: string; title: string; count: number; href?: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-5" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
      <div className="space-y-1">
        <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{label}</p>
        <h2 className="text-lg md:text-2xl font-bold tracking-[-0.02em]">
          {title}
          <span className="ml-2 text-sm font-normal tabular-nums" style={{ color: "var(--ed-dim)" }}>{count}</span>
        </h2>
      </div>
      {href && cta && <Link href={href} className="shrink-0 text-xs font-semibold hover:underline underline-offset-4">{cta} →</Link>}
    </div>
  );
}

/**
 * 내 아카이브 — "내가 실제로 지나온 공간이 조용히 쌓여 있는 개인 기록". 추천 페이지가 아니다.
 * 1) 다녀온 공간(Record) 2) 저장한 공간(공개 공간 저장 + Cube 상세 저장) 3) 나의 흔적(방명록).
 * 취향은 아주 작은 요약 한 줄 + 추천 페이지 링크만. 수치·그래프 대시보드는 두지 않는다.
 * 개인 기록이므로 다녀온 공간은 시연 공간을 포함해 내 기록 그대로 보여준다(저장 목록·취향 요약은 서비스 필터 적용).
 */
export default async function ArchivePage({ searchParams }: Props) {
  const { space: spaceIdParam } = await searchParams;
  // 이전 "공간 노트" 딥링크(/archive?space=) 호환 — 그 공간의 자세히 보기로 보낸다.
  if (spaceIdParam) redirect(`/archive/space/${encodeURIComponent(spaceIdParam)}`);

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  const editorial = ENABLE_EDITORIAL_HOME || isAdmin(session.user.email);

  const unreadNotificationCount = ENABLE_NOTIFICATIONS
    ? await prisma.notification.count({ where: { receiverId: user.id, isRead: false } })
    : 0;

  const [records, guestbookNotesRaw, discovery] = await Promise.all([
    prisma.record.findMany({
      where: { userId: user.id },
      select: {
        id: true, spaceId: true, visitedAt: true, tasteScore: true,
        space: {
          select: {
            id: true, name: true, slug: true, type: true, district: true, imageUrl: true,
            spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
          },
        },
      },
    }),
    prisma.guestbookNote.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, spaceId: true, content: true, color: true, imageUrl: true, createdAt: true,
        space: { select: { slug: true, name: true } },
        session: { select: { id: true, status: true } },
      },
    }),
    getUserDiscoveryContext(user.id),
  ]);

  const guestbookNotes: (ArchiveGuestbookNoteInput & { spaceName: string })[] = guestbookNotesRaw.map((n) => ({
    id: n.id, spaceId: n.spaceId, content: n.content, color: n.color, imageUrl: n.imageUrl, createdAt: n.createdAt,
    spaceSlug: n.space.slug, spaceName: n.space.name, sessionId: n.session.id, sessionStatus: n.session.status,
  }));

  const entries = buildSpaceNoteEntries(records as ArchiveRecordInput[], guestbookNotes);
  const visitedTiles: ArchiveTileData[] = entries.map((e) => ({
    key: e.spaceId,
    href: `/archive/space/${e.spaceId}`,
    name: e.spaceName,
    imageUrl: e.imageUrl,
    meta: [e.district, e.spaceTypeLabel].filter(Boolean).join(" · "),
    note: e.visitCount > 1 ? `${e.visitCount}번 방문 · 마지막 ${formatDotDate(e.visitedAt)}` : formatDotDate(e.visitedAt),
    partner: true,
  }));
  const savedTiles = await getArchiveSavedTiles(user.id, { visitedSpaceIds: new Set(entries.map((e) => e.spaceId)), editorial });
  const profile = buildTasteProfile(discovery.signals);
  const tasteWords = topAttributes(profile, 3);

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <header className="ed-container pt-10 md:pt-16 pb-8 md:pb-10">
          <div className="flex items-center justify-end gap-4 pb-6">
            {ENABLE_NOTIFICATIONS && <NotificationBell initialUnreadCount={unreadNotificationCount} />}
            <ShareArchiveButton userId={user.id} />
            <SettingsPanel nickname={user.nickname} nicknameUpdatedAt={user.nicknameUpdatedAt?.toISOString() ?? null} />
          </div>
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Archive{user.nickname ? ` · ${user.nickname}` : ""}</p>
          <h1 className="pt-3 text-[40px] md:text-[64px] font-bold leading-none tracking-[-0.04em]">내 아카이브</h1>
          <p className="pt-4 text-base md:text-lg leading-relaxed" style={{ color: "var(--ed-dim)" }}>내가 머물렀던 공간과, 다시 가고 싶은 공간.</p>
        </header>

        {/* 취향 — 아주 작은 요약만. 추천은 별도 페이지. 실제 신호가 있을 때만 */}
        {tasteWords.length > 0 && (
          <section className="ed-container pb-10">
            <Link href="/recommend" className="group flex flex-wrap items-baseline justify-between gap-3 py-4" style={{ borderTop: "1px solid var(--ed-line)", borderBottom: "1px solid var(--ed-line)" }}>
              <span className="text-sm">
                <span style={{ color: "var(--ed-dim)" }}>요즘 이런 공간을 자주 찾았어요 · </span>
                <span className="font-semibold">{tasteWords.join(" · ")}</span>
              </span>
              <span className="text-xs font-semibold group-hover:underline underline-offset-4">나에게 맞는 공간 보기 →</span>
            </Link>
          </section>
        )}

        {/* 1. 다녀온 공간 */}
        <section className="ed-container pt-4">
          <SectionHead label="Visited" title="다녀온 공간" count={visitedTiles.length} href={visitedTiles.length > PREVIEW ? "/archive/all" : undefined} cta="전체 기록" />
          {visitedTiles.length === 0 ? (
            <p className="py-10 text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>
              아직 다녀온 공간이 없어요.
              <br />
              공간에서 Cube의 QR을 인식하면 그날의 기록이 이곳에 쌓입니다.
            </p>
          ) : (
            <div className="pt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-8">
              {visitedTiles.slice(0, PREVIEW).map((t) => <ArchiveTile key={t.key} t={t} />)}
            </div>
          )}
        </section>

        {/* 2. 저장한 공간 */}
        <section className="ed-container pt-16 md:pt-20">
          <SectionHead label="Saved" title="가보고 싶은 공간" count={savedTiles.length} href={savedTiles.length > 0 ? "/archive/saved" : undefined} cta="저장한 공간 전체" />
          {savedTiles.length === 0 ? (
            <p className="py-10 text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>
              저장한 공간이 없어요.
              {editorial && (
                <>
                  <br />
                  <Link href="/curation" className="underline underline-offset-4">큐레이션</Link>이나 <Link href="/cube-spaces" className="underline underline-offset-4">함께한 공간</Link>에서 마음에 드는 곳을 저장해보세요.
                </>
              )}
            </p>
          ) : (
            <div className="pt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-8">
              {savedTiles.slice(0, PREVIEW).map((t) => <ArchiveTile key={t.key} t={t} />)}
            </div>
          )}
        </section>

        {/* 3. 나의 흔적 — 방명록에 남긴 문장 */}
        <section className="ed-container pt-16 md:pt-20">
          <SectionHead label="Traces" title="나의 흔적" count={guestbookNotes.length} />
          {guestbookNotes.length === 0 ? (
            <p className="py-10 text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>방명록에 남긴 흔적이 아직 없어요.</p>
          ) : (
            <ul>
              {guestbookNotes.slice(0, TRACE_PREVIEW).map((n) => (
                <li key={n.id} style={{ borderBottom: "1px solid var(--ed-line)" }}>
                  <Link href={guestbookNoteHref(n)} className="group grid grid-cols-[1fr_auto] gap-4 py-5 items-baseline">
                    <span className="text-base leading-relaxed break-keep group-hover:underline underline-offset-4">“{n.content}”</span>
                    <span className="text-xs tabular-nums text-right" style={{ color: "var(--ed-dim)" }}>
                      {n.spaceName}
                      <br />
                      {formatDotDate(n.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {guestbookNotes.length > TRACE_PREVIEW && (
            <p className="pt-4 text-xs" style={{ color: "var(--ed-dim)" }}>공간별 흔적은 다녀온 공간의 자세히 보기에서 모두 볼 수 있어요.</p>
          )}
        </section>
      </main>
    </div>
  );
}
