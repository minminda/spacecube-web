import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { formatDotDate } from "@/lib/time";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import { guestbookNoteHref, type ArchiveGuestbookNoteInput } from "@/lib/archiveSpaceNotes";

interface Props {
  params: Promise<{ spaceId: string }>;
}

export default async function ArchiveSpaceDetailPage({ params }: Props) {
  const { spaceId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const [space, records, notesRaw, savedSpace] = await Promise.all([
    prisma.space.findUnique({
      where: { id: spaceId },
      select: {
        id: true, name: true, slug: true, type: true, district: true, imageUrl: true, tagline: true,
        spaceTagLinks: {
          where: { visibleToUsers: true, tag: { isActive: true } },
          orderBy: { weight: "desc" },
          include: { tag: { include: { categoryRef: true } } },
        },
      },
    }),
    prisma.record.findMany({
      where: { userId: user.id, spaceId },
      orderBy: { visitedAt: "desc" },
      select: { id: true, visitedAt: true, tasteScore: true, memo: true },
    }),
    prisma.guestbookNote.findMany({
      where: { userId: user.id, spaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, content: true, color: true, imageUrl: true, createdAt: true,
        session: { select: { id: true, status: true } },
      },
    }),
    prisma.savedSpace.findUnique({ where: { userId_spaceId: { userId: user.id, spaceId } } }),
  ]);

  // Space가 아예 없거나, 이 사용자가 이 공간을 방문한 적이 없으면(=이 공간 노트 페이지의 주인이 아니면) 404.
  if (!space || records.length === 0) notFound();

  const notes: ArchiveGuestbookNoteInput[] = notesRaw.map((n) => ({
    id: n.id, spaceId: space.id, content: n.content, color: n.color, imageUrl: n.imageUrl, createdAt: n.createdAt,
    spaceSlug: space.slug, sessionId: n.session.id, sessionStatus: n.session.status,
  }));

  const spaceTypeLabel = resolveSpaceTypeLabel(space.spaceTagLinks, space.type);

  // 카테고리별로 묶어서 전체 태그 표시 — categoryRef.displayOrder 기준 정렬, 미분류는 맨 뒤.
  const tagGroups = new Map<string, { order: number; names: string[] }>();
  for (const link of space.spaceTagLinks) {
    const category = link.tag.categoryRef?.name ?? "기타";
    const order = link.tag.categoryRef?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (!tagGroups.has(category)) tagGroups.set(category, { order, names: [] });
    tagGroups.get(category)!.names.push(link.tag.name);
  }
  const sortedTagGroups = [...tagGroups.entries()].sort((a, b) => a[1].order - b[1].order);

  return (
    <main className="flex flex-col min-h-screen px-6 pt-8 pb-16 gap-8">
      <nav className="flex justify-between items-center">
        <Link href={`/archive?space=${space.id}`} className="text-xs" style={{ color: "var(--dim)" }}>← 공간 노트</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>자세히 보기</p>
      </nav>

      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-2xl font-bold leading-snug">{space.name}</p>
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            {[spaceTypeLabel, space.district].filter(Boolean).join(" · ")}
          </p>
          {space.tagline && (
            <p className="text-sm italic leading-relaxed" style={{ color: "var(--dim)" }}>{space.tagline}</p>
          )}
        </div>

        {space.imageUrl && (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 11", background: "var(--tag-bg)" }}>
            <Image src={space.imageUrl} alt={space.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
          </div>
        )}
      </div>

      {sortedTagGroups.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>태그</p>
          <div className="space-y-2">
            {sortedTagGroups.map(([category, group]) => (
              <div key={category} className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs w-16 flex-shrink-0" style={{ color: "var(--border)" }}>{category}</span>
                <span className="text-sm" style={{ color: "var(--dim)" }}>{group.names.join(" · ")}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
          방문 기록 · {records.length}번
        </p>
        <div className="space-y-2">
          {records.map((r) => (
            <Link
              key={r.id}
              href={`/archive/${r.id}`}
              className="flex items-center justify-between py-2 group"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="text-sm group-hover:underline">{formatDotDate(r.visitedAt)}</span>
              <span className="text-xs" style={{ color: "var(--dim)" }}>
                {r.tasteScore != null ? `${r.tasteScore} / 5` : "—"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {notes.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>내가 남긴 흔적</p>
          <div className="flex flex-wrap gap-3">
            {notes.map((note, i) => (
              <Link
                key={note.id}
                href={guestbookNoteHref(note)}
                className="w-40 p-3.5 relative"
                style={{
                  background: note.color,
                  transform: `rotate(${i % 2 === 0 ? -1.4 : 1.2}deg)`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}
              >
                <span
                  aria-hidden
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5"
                  style={{ background: "#00000018" }}
                />
                <p className="text-[13px] leading-relaxed break-keep line-clamp-4" style={{ color: "#3d3524" }}>
                  {note.content}
                </p>
                <p className="text-[10px] mt-2" style={{ color: "#8a7d5c" }}>{formatDotDate(note.createdAt)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>저장 여부</p>
        <p className="text-sm" style={{ color: "var(--dim)" }}>{savedSpace ? "찜한 공간이에요" : "찜하지 않았어요"}</p>
      </section>

      <div className="flex-1" />

      <Link
        href={`/space/${space.slug}`}
        className="tap-target flex items-center justify-center text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
        style={{ borderColor: "var(--fg)" }}
      >
        공간 이야기 보러가기
      </Link>
    </main>
  );
}
