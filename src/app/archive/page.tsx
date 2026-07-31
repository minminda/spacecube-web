import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import SettingsPanel from "@/components/SettingsPanel";
import NotificationBell from "@/components/NotificationBell";
import { ENABLE_NOTIFICATIONS } from "@/lib/pilotFlags";
import {
  buildSpaceNoteEntries, resolveInitialIndex,
  type ArchiveRecordInput, type ArchiveGuestbookNoteInput,
} from "@/lib/archiveSpaceNotes";
import { toSpaceNoteCardData } from "@/components/archive/SpaceNoteCard";
import SpaceNotePager from "@/components/archive/SpaceNotePager";
import ArchiveBottomNav from "@/components/archive/ArchiveBottomNav";

interface Props {
  searchParams: Promise<{ space?: string }>;
}

export default async function ArchivePage({ searchParams }: Props) {
  const { space: spaceIdParam } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  // 파일럿 기간 알림 비활성: 미읽음 카운트 조회 자체를 건너뛴다.
  const unreadNotificationCount = ENABLE_NOTIFICATIONS
    ? await prisma.notification.count({ where: { receiverId: user.id, isRead: false } })
    : 0;

  const [records, guestbookNotesRaw] = await Promise.all([
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
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, spaceId: true, content: true, color: true, imageUrl: true, createdAt: true,
        space: { select: { slug: true } },
        session: { select: { id: true, status: true } },
      },
    }),
  ]);

  const guestbookNotes: ArchiveGuestbookNoteInput[] = guestbookNotesRaw.map((n) => ({
    id: n.id, spaceId: n.spaceId, content: n.content, color: n.color, imageUrl: n.imageUrl, createdAt: n.createdAt,
    spaceSlug: n.space.slug, sessionId: n.session.id, sessionStatus: n.session.status,
  }));

  const entries = buildSpaceNoteEntries(records as ArchiveRecordInput[], guestbookNotes);
  const initialIndex = resolveInitialIndex(entries, spaceIdParam);
  const cardData = entries.map(toSpaceNoteCardData);

  return (
    <main className="flex flex-col min-h-screen px-6 pt-8 pb-16">
      <nav className="flex justify-between items-center mb-10">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← </Link>
        <div className="flex items-center gap-4">
          {ENABLE_NOTIFICATIONS && <NotificationBell initialUnreadCount={unreadNotificationCount} />}
          <SettingsPanel nickname={user.nickname} visibility={user.visibility} userId={user.id} />
        </div>
      </nav>

      <section className="mb-6 space-y-1.5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">내 아카이브</h1>
          {entries.length > 0 && (
            <Link href="/archive/all" className="text-xs" style={{ color: "var(--dim)" }}>
              전체 기록 →
            </Link>
          )}
        </div>
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          {entries.length > 0
            ? `지금까지 ${entries.length}개의 공간을 기록했어요`
            : "아직 기록된 공간이 없어요"}
        </p>
      </section>

      {entries.length === 0 ? (
        <section className="flex-1 flex flex-col justify-center items-center gap-4 text-center py-16">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            아직 기록된 공간이 없어요
            <br />
            공간에서 큐브 QR을 인식하고 첫 기록을 남겨보세요.
          </p>
          <Link href="/discover" className="text-sm" style={{ color: "var(--fg)" }}>
            공간 둘러보기 →
          </Link>
        </section>
      ) : (
        <SpaceNotePager key={initialIndex} entries={cardData} initialIndex={initialIndex} />
      )}

      <ArchiveBottomNav />
    </main>
  );
}
