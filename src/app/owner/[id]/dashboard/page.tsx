import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getTagLabels } from "@/lib/tags";
import { aggregateSpaceTags, getSpaceUsageSummary, getRevisitStats } from "@/lib/spaceInsight";
import WaitlistPanel from "./WaitlistPanel";
import MoodPanel from "./MoodPanel";
import NotePanel from "./NotePanel";

interface Props { params: Promise<{ id: string }> }

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function getRevisitInsight(revisitors: number, total: number, ratio: number): string {
  if (total === 0) return "";
  if (revisitors === 0) return "아직 재방문 기록이 없습니다. 방문자들의 첫 인상이 쌓이고 있는 단계입니다.";
  if (ratio >= 40) return "이 공간을 다시 찾는 방문자가 꾸준히 이어지고 있습니다.";
  if (ratio >= 20) return "일부 방문자들이 이 공간을 다시 찾고 있습니다.";
  return "천천히 재방문자가 생겨나고 있습니다.";
}

export default async function DashboardPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id } });
  if (!space) notFound();

  const TAG_LABELS = getTagLabels("ko");
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);

  const [scansToday, scansWeek, scansAll, allRecords, latestNote] = await Promise.all([
    prisma.spaceScan.count({ where: { spaceId: id, scannedAt: { gte: todayStart } } }),
    prisma.spaceScan.count({ where: { spaceId: id, scannedAt: { gte: weekStart } } }),
    prisma.spaceScan.count({ where: { spaceId: id } }),
    prisma.record.findMany({
      where: { spaceId: id },
      include: { tags: true },
      orderBy: { visitedAt: "desc" },
    }),
    prisma.spaceNote.findFirst({
      where: { spaceId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, content: true, createdAt: true },
    }),
  ]);

  const recentMemos = allRecords.filter((r) => r.memo).slice(0, 5);
  const topTags = aggregateSpaceTags(allRecords).slice(0, 3);
  const { total: uniqueVisitors, revisitors, ratio: revisitRatio } = getRevisitStats(allRecords);
  const usageSummary = getSpaceUsageSummary(aggregateSpaceTags(allRecords), "ko");
  const revisitInsight = getRevisitInsight(revisitors, uniqueVisitors, revisitRatio);

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      {/* 헤더 */}
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / DASHBOARD</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>반응 보드</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      {/* ① 지금의 공간 상태 */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <MoodPanel spaceId={space.id} initialMood={space.currentMood} />

      {/* ② 공간 노트 */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <NotePanel
        spaceId={space.id}
        initialNote={
          latestNote
            ? { ...latestNote, createdAt: latestNote.createdAt.toISOString() }
            : null
        }
      />

      {/* 스캔 현황 */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// QR 스캔</p>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="오늘" value={scansToday} unit="회" />
          <StatBox label="이번 주" value={scansWeek} unit="회" />
          <StatBox label="누적" value={scansAll} unit="회" />
        </div>
        {scansToday > 0 && (
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            오늘 이 공간을 {scansToday}명이 열어봤습니다.
          </p>
        )}
      </section>

      {/* 공간 사용 방식 요약 */}
      {usageSummary && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 공간 사용 방식</p>
            <p
              className="text-sm leading-relaxed pl-3"
              style={{ borderLeft: "2px solid var(--border)", color: "var(--fg)" }}
            >
              {usageSummary}
            </p>
          </section>
        </>
      )}

      {/* 태그 TOP 3 */}
      {topTags.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-4">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 많이 선택된 감정 TOP {topTags.length}</p>
            <div className="space-y-2">
              {topTags.map(([tag, count], i) => (
                <div key={tag} className="flex items-center gap-4">
                  <span className="text-xs w-4 flex-shrink-0" style={{ color: "var(--dim)" }}>{i + 1}</span>
                  <span className="text-sm font-medium flex-1">{TAG_LABELS[tag]}</span>
                  <span className="text-xs" style={{ color: "var(--dim)" }}>{count}회</span>
                </div>
              ))}
            </div>
            {topTags[0] && (
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                이번 주 가장 많이 선택된 감정은 &lsquo;{TAG_LABELS[topTags[0][0]]}&rsquo;입니다.
              </p>
            )}
          </section>
        </>
      )}

      {/* ③ 재방문 흔적 — 운영자 시점 */}
      {uniqueVisitors > 0 && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-4">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 재방문 흔적</p>
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="총 기록자" value={uniqueVisitors} unit="명" />
              <StatBox label="재방문" value={revisitors} unit="명" />
              <StatBox label="재방문율" value={revisitRatio} unit="%" />
            </div>
            {revisitInsight && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                {revisitInsight}
              </p>
            )}
          </section>
        </>
      )}

      {/* 최근 익명 메모 */}
      {recentMemos.length > 0 ? (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-4">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 최근 방문자들의 한 줄</p>
            <p className="text-xs" style={{ color: "var(--dim)" }}>최근 방문자들은 이 공간을 이렇게 느꼈습니다.</p>
            <div className="space-y-5">
              {recentMemos.map((r) => (
                <div key={r.id} className="space-y-1.5">
                  <p className="text-sm leading-relaxed">&ldquo;{r.memo}&rdquo;</p>
                  {r.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {r.tags.map((t) => (
                        <span
                          key={t.id}
                          className="text-xs px-2 py-0.5 border"
                          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                        >
                          {TAG_LABELS[t.tag]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            아직 기록이 없습니다. QR 큐브를 공간에 두면 방문자 반응이 여기에 모입니다.
          </p>
        </>
      )}

      {/* 대기 관리 */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <WaitlistPanel
        spaceId={space.id}
        spaceSlug={space.slug}
        initialFullyBooked={space.isFullyBooked}
      />

      {/* 바로가기 */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <div className="flex gap-3 text-xs">
        <Link
          href={`/space/${space.slug}`}
          className="border px-3 py-1.5 transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          공간 페이지 보기 →
        </Link>
        <Link
          href={`/owner/${id}/qr`}
          className="border px-3 py-1.5 transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          QR 관리
        </Link>
      </div>
    </main>
  );
}

function StatBox({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 border" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--dim)" }}>{label}</p>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs" style={{ color: "var(--dim)" }}>{unit}</p>
    </div>
  );
}
