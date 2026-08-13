import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import { aggregateTags, getTastePhrase, getLatestRecordPerSpace } from "@/lib/taste";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import { getUserUnlockSets } from "@/lib/spaceUnlock";
import SaveTasteButton from "@/components/SaveTasteButton";

interface Props { params: Promise<{ userId: string }> }

function NoticeScreen({ message }: { message: string }) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-3">
      <p className="text-sm" style={{ color: "var(--dim)" }}>{message}</p>
      <Link href="/" className="text-xs" style={{ color: "var(--border)" }}>← 홈으로</Link>
    </main>
  );
}

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

  // 탈퇴/존재하지 않는 사용자 — notFound()의 기본 404 화면 대신 이 서비스 톤에 맞는 안내로 처리한다.
  if (!target) return <NoticeScreen message="이 사용자를 찾을 수 없습니다" />;

  if (session?.user?.id === target.id) {
    const { redirect } = await import("next/navigation");
    redirect("/archive");
  }

  const displayName = target.nickname || "이 사용자";

  const topTags = aggregateTags(target.records).slice(0, 5);
  const tastePhrase = getTastePhrase(topTags.map(([t, count]) => ({ name: TAG_LABELS[t], weight: count })));

  // 같은 공간을 여러 번 방문했어도 공간당 최신 방문 1개만 — 추천/취향 프로파일과 동일한
  // 공통 함수(getLatestRecordPerSpace)를 재사용해 "최신 기록만 반영" 기준을 하나로 통일한다.
  const uniqueRecords = getLatestRecordPerSpace(target.records);

  let isLoggedIn = false;
  let alreadySaved = false;
  let isSelf = false;
  let viewerUnlockedSpaceIds = new Set<string>();
  if (session?.user?.id) {
    isLoggedIn = true;
    const me = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (me) {
      isSelf = me.id === userId;
      if (!isSelf) {
        const [existing, unlockSets] = await Promise.all([
          prisma.savedTaste.findUnique({
            where: { userId_targetUserId: { userId: me.id, targetUserId: userId } },
          }),
          // 다른 사용자의 방명록 흔적을 볼 수 있는 범위 — 새 판정 체계를 만들지 않고, 공간 "읽기"
          // 보호 페이지(공간 상세/Episode/방명록)가 이미 공유하는 SpaceUnlock 기준을 그대로 재사용한다.
          // everUnlocked(만료 여부 무관, 실제로 QR로 열어본 적 있는 공간 전체)를 쓴다 — "지금 당장
          // 12시간 내"가 아니라 "내가 실제로 방문해서 경험한 공간"이 이 화면의 기준이기 때문이다.
          getUserUnlockSets(me.id),
        ]);
        alreadySaved = !!existing;
        viewerUnlockedSpaceIds = unlockSets.everUnlocked;
      }
    }
  }

  // 이 사용자가 남긴 방명록 포스트잇 — 공간이 존재한다는 사실(카드 자체)은 항상 보여주되,
  // 내용(content/imageUrl)은 "지금 보고 있는 내"가 그 공간을 실제로 방문해 잠금을 해제한
  // 경우에만 채운다. 잠긴 공간의 흔적은 서버에서부터 아예 content를 내려보내지 않는다 —
  // 클라이언트에서 숨기는 게 아니라 애초에 응답(HTML)에 담기지 않아야 하기 때문.
  const targetNotesRaw = await prisma.guestbookNote.findMany({
    where: { userId: target.id, isHidden: false, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true, imageUrl: true, spaceId: true, space: { select: { name: true, slug: true } } },
  });
  const guestbookNotes = targetNotesRaw.map((n) => {
    const unlocked = viewerUnlockedSpaceIds.has(n.spaceId);
    return {
      id: n.id,
      spaceName: n.space.name,
      spaceSlug: n.space.slug,
      unlocked,
      content: unlocked ? n.content : null,
      imageUrl: unlocked ? n.imageUrl : null,
    };
  });

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
          <p className="text-sm" style={{ color: "var(--dim)" }}>아직 공개된 기록이 없습니다</p>
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
              {guestbookNotes.map((note, i) =>
                note.unlocked ? (
                  <Link
                    key={note.id}
                    href={`/space/${note.spaceSlug}/guestbook?focus=${note.id}`}
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
                    <p className="mt-3 text-[11px] font-medium" style={{ color: "#3d3524" }}>{note.spaceName}</p>
                  </Link>
                ) : (
                  <div
                    key={note.id}
                    className="flex-shrink-0 w-40 snap-start p-3.5 relative"
                    style={{ background: "#e5e5e5", transform: `rotate(${i % 2 === 0 ? -1.4 : 1.2}deg)`, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
                  >
                    <p className="text-[13px] leading-relaxed break-keep" style={{ color: "#8a8a8a" }}>
                      이 공간을 직접 방문하면
                      <br />이 흔적을 볼 수 있어요
                    </p>
                    <p className="mt-3 text-[11px] font-medium" style={{ color: "#8a8a8a" }}>{note.spaceName}</p>
                  </div>
                ),
              )}
            </div>
          </section>
        </>
      )}

      {!isSelf && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-2">
            <p className="text-xs" style={{ color: "var(--dim)" }}>사람을 팔로우하지 않고, 취향을 저장합니다</p>
            <SaveTasteButton targetUserId={userId} initialSaved={alreadySaved} isLoggedIn={isLoggedIn} />
          </section>
        </>
      )}
    </main>
  );
}
