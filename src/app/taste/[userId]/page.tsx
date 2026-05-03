import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getLang } from "@/lib/i18n";
import { getTagLabels } from "@/lib/tags";
import { aggregateTags, getTastePhrase } from "@/lib/taste";
import SaveTasteButton from "@/components/SaveTasteButton";

interface Props { params: Promise<{ userId: string }> }

export default async function TasteJourneyPage({ params }: Props) {
  const { userId } = await params;
  const session = await auth();
  const lang = await getLang();
  const TAG_LABELS = getTagLabels(lang);

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      records: {
        orderBy: { visitedAt: "desc" },
        include: { space: { select: { id: true, name: true, slug: true, type: true, district: true } }, tags: true },
      },
    },
  });

  if (!target || target.visibility === "PRIVATE") notFound();

  // 자기 자신이면 아카이브로
  if (session?.user?.email === target.email) {
    const { redirect } = await import("next/navigation");
    redirect("/archive");
  }

  const topTags = aggregateTags(target.records).slice(0, 5);
  const tastePhrase = getTastePhrase(topTags, lang);

  // 공간 기록 (중복 공간 제거 — 마지막 기록만)
  const seenSpaces = new Set<string>();
  const uniqueRecords = target.records.filter((r) => {
    if (seenSpaces.has(r.space.id)) return false;
    seenSpaces.add(r.space.id);
    return true;
  });

  let isLoggedIn = false;
  let alreadySaved = false;
  let isSelf = false;
  if (session?.user?.email) {
    isLoggedIn = true;
    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
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

  const t = {
    back:       lang === "ko" ? "← 홈" : lang === "ja" ? "← ホーム" : lang === "zh" ? "← 首页" : "← Home",
    flow:       lang === "ko" ? "이 취향이 다녀온 공간" : lang === "ja" ? "この好みが訪れた空間" : lang === "zh" ? "这个品味去过的空间" : "Spaces this taste has visited",
    noRecords:  lang === "ko" ? "아직 공개된 기록이 없습니다." : lang === "ja" ? "まだ公開された記録がありません。" : lang === "zh" ? "暂时没有公开的记录。" : "No public records yet.",
    tagLabel:   lang === "ko" ? "자주 선택한 감정" : lang === "ja" ? "よく選んだ感情" : lang === "zh" ? "常选情感" : "Feelings often chosen",
  };

  return (
    <main className="flex flex-col min-h-screen px-6 pt-10 pb-16 gap-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>{t.back}</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
      </div>

      {/* 취향 문장 — 사람 이름 없음 */}
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>취향 흐름</p>
        <h1 className="text-xl font-bold leading-snug">{tastePhrase}</h1>
      </section>

      {/* 자주 선택한 감정 태그 */}
      {topTags.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs" style={{ color: "var(--dim)" }}>{t.tagLabel}</p>
          <div className="flex flex-wrap gap-2">
            {topTags.slice(0, 4).map(([tag]) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 border"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        </section>
      )}

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 공간 시퀀스 */}
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.flow}</p>

        {uniqueRecords.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>{t.noRecords}</p>
        ) : (
          <div className="space-y-6">
            {uniqueRecords.map((r, i) => (
              <Link
                key={r.id}
                href={`/space/${r.space.slug}`}
                className="flex gap-4 group"
              >
                {/* 번호 */}
                <span
                  className="text-xs flex-shrink-0 mt-0.5 w-5 text-right"
                  style={{ color: "var(--border)" }}
                >
                  {i + 1}
                </span>

                {/* 공간 정보 */}
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug group-hover:underline">
                    {r.space.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--dim)" }}>
                    {[r.space.type, r.space.district].filter(Boolean).join(" · ")}
                  </p>
                  {r.memo && (
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--dim)" }}
                    >
                      &ldquo;{r.memo}&rdquo;
                    </p>
                  )}
                  {r.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-0.5">
                      {r.tags.slice(0, 2).map((t) => (
                        <span
                          key={t.id}
                          className="text-xs"
                          style={{ color: "var(--border)" }}
                        >
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

      {/* 저장 버튼 — 자기 자신이 아닐 때만 */}
      {!isSelf && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-2">
            <p className="text-xs" style={{ color: "var(--dim)" }}>
              {lang === "ko"
                ? "사람을 팔로우하지 않고, 취향을 저장합니다."
                : lang === "ja"
                ? "人をフォローせず、好みを保存します。"
                : lang === "zh"
                ? "不追踪人，保存品味。"
                : "Save the taste, not the person."}
            </p>
            <SaveTasteButton
              targetUserId={userId}
              initialSaved={alreadySaved}
              isLoggedIn={isLoggedIn}
              lang={lang}
            />
          </section>
        </>
      )}
    </main>
  );
}
