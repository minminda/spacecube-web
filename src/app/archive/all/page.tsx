import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { buildSpaceNoteEntries, type ArchiveRecordInput, type ArchiveGuestbookNoteInput } from "@/lib/archiveSpaceNotes";
import { toSpaceNoteCardData } from "@/components/archive/SpaceNoteCard";
import AllRecordsList from "@/components/archive/AllRecordsList";
import ArchiveBottomNav from "@/components/archive/ArchiveBottomNav";

export default async function ArchiveAllPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

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
  const cardData = entries.map(toSpaceNoteCardData);

  return (
    <main className="flex flex-col min-h-screen px-6 pt-8 pb-16">
      <nav className="flex justify-between items-center mb-10">
        <Link href="/archive" className="text-xs" style={{ color: "var(--dim)" }}>← 공간 노트</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>전체 기록</p>
      </nav>

      <section className="mb-6">
        <p className="text-sm" style={{ color: "var(--dim)" }}>지금까지 {entries.length}개의 공간을 기록했어요.</p>
      </section>

      {entries.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>아직 기록된 공간이 없어요.</p>
      ) : (
        <AllRecordsList entries={cardData} />
      )}

      <ArchiveBottomNav />
    </main>
  );
}
