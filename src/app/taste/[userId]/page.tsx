import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import { aggregateTags, getTastePhrase, getLatestRecordPerSpace } from "@/lib/taste";
import { formatDotDate as formatDate } from "@/lib/time";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import SaveTasteButton from "@/components/SaveTasteButton";

interface Props { params: Promise<{ userId: string }> }

export default async function TasteJourneyPage({ params }: Props) {
  const { userId } = await params;
  const session = await auth();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      records: {
        orderBy: { visitedAt: "desc" },
        include: {
          space: {
            select: {
              id: true, name: true, slug: true, type: true, district: true,
              spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
            },
          },
          tags: true,
        },
      },
    },
  });

  // 존재하지 않는 사용자는 404, 비공개 사용자는 안내 문구를 보여준다 (구분 노출은 하지 않는다는 원칙과 무관하게
  // "존재 자체를 숨겨야 하는" 요구사항은 없으므로 자연스러운 안내로 처리)
  if (!target) notFound();

  if (session?.user?.id === target.id) {
    const { redirect } = await import("next/navigation");
    redirect("/archive");
  }

  const displayName = target.nickname || "이 사용자";

  if (target.visibility === "PRIVATE") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-3">
        <p className="text-sm" style={{ color: "var(--dim)" }}>이 사용자의 아카이브는 공개되지 않았습니다.</p>
        <Link href="/" className="text-xs" style={{ color: "var(--border)" }}>← 홈으로</Link>
      </main>
    );
  }

  const topTags = aggregateTags(target.records).slice(0, 5);
  const tastePhrase = getTastePhrase(topTags.map(([t, count]) => ({ name: TAG_LABELS[t], weight: count })));

  // 같은 공간을 여러 번 방문했어도 공간당 최신 방문 1개만 — 추천/취향 프로파일과 동일한
  // 공통 함수(getLatestRecordPerSpace)를 재사용해 "최신 기록만 반영" 기준을 하나로 통일한다.
  const uniqueRecords = getLatestRecordPerSpace(target.records);

  // 이 사용자가 남긴 방명록 포스트잇 — 공개 아카이브에 노출 가능한 정보만 선택
  // (이메일/정확한 방문 시각/로그인 정보/관리자 여부/비공개 기록은 노출하지 않음)
  const guestbookNotes = await prisma.guestbookNote.findMany({
    where: { userId: target.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true, imageUrl: true, createdAt: true, space: { select: { name: true, slug: true } } },
  });

  let isLoggedIn = false;
  let alreadySaved = false;
  let isSelf = false;
  if (session?.user?.id) {
    isLoggedIn = true;
    const me = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (me) {
      isSelf = me.id === userId;
      if (!isSelf) {
        const existing = await prisma.savedTaste.findUnique({
          where: { userId_targetUserId: { userId: me.id, targetUserId: userId } },
        });
        alreadySaved = !!existing;
      }
    }
  }

  return (
    <main className="flex flex-col min-h-screen px-6 pt-10 pb-16 gap-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
      </div>

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{displayName}의 아카이브</p>
        <h1 className="text-xl font-bold leading-snug">{tastePhrase}</h1>
      </section>

      {topTags.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs" style={{ color: "var(--dim)" }}>자주 선택한 감정</p>
          <div className="flex flex-wrap gap-2">
            {topTags.slice(0, 4).map(([tag]) => (
              <span key={tag} className="text-xs px-2 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        </section>
      )}

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>이 취향이 다녀온 공간</p>

        {uniqueRecords.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>아직 공개된 기록이 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {uniqueRecords.map((r, i) => (
              <Link key={r.id} href={`/space/${r.space.slug}`} className="flex gap-4 group">
                <span className="text-xs flex-shrink-0 mt-0.5 w-5 text-right" style={{ color: "var(--border)" }}>
                  {i + 1}
                </span>
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug group-hover:underline">{r.space.name}</p>
                  <p className="text-xs" style={{ color: "var(--dim)" }}>
                    {[resolveSpaceTypeLabel(r.space.spaceTagLinks, r.space.type), r.space.district].filter(Boolean).join(" · ")}
                  </p>
                  {r.memo && (
                    <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>&ldquo;{r.memo}&rdquo;</p>
                  )}
                  {r.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-0.5">
                      {r.tags.slice(0, 2).map((t) => (
                        <span key={t.id} className="text-xs" style={{ color: "var(--border)" }}>
                          {TAG_LABELS[t.tag]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {guestbookNotes.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-4">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간마다 남긴 방명록</p>
            <div className="flex gap-3 overflow-x-auto snap-x pb-3 -mx-6 px-6" style={{ scrollbarWidth: "none" }}>
              {guestbookNotes.map((note, i) => (
                <Link
                  key={note.id}
                  href={`/space/${note.space.slug}/guestbook?focus=${note.id}`}
                  className="flex-shrink-0 w-40 snap-start p-3.5 relative"
                  style={{ background: "#F6E7A8", transform: `rotate(${i % 2 === 0 ? -1.4 : 1.2}deg)`, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
                >
                  {note.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={note.imageUrl} alt="" className="w-full h-20 object-cover mb-2" />
                  )}
                  <p className="text-[13px] leading-relaxed break-keep line-clamp-4" style={{ color: "#3d3524" }}>
                    {note.content}
                  </p>
                  <div className="mt-3 space-y-0.5">
                    <p className="text-[11px] font-medium" style={{ color: "#3d3524" }}>{note.space.name}</p>
                    <p className="text-[10px]" style={{ color: "#8a7d5c" }}>{formatDate(note.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {!isSelf && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-2">
            <p className="text-xs" style={{ color: "var(--dim)" }}>사람을 팔로우하지 않고, 취향을 저장합니다.</p>
            <SaveTasteButton targetUserId={userId} initialSaved={alreadySaved} isLoggedIn={isLoggedIn} />
          </section>
        </>
      )}
    </main>
  );
}
