import type { Metadata } from "next";
import Link from "next/link";
import { getOperatorSession } from "@/lib/operatorSession";
import { prisma } from "@/lib/prisma";
import { computeReportPeriod } from "@/lib/reportPeriod";
import { formatDotDate as formatDate } from "@/lib/time";
import { GuestbookSessionStatus, MonthlyReportStatus } from "@prisma/client";
import PastReportsSelect from "./PastReportsSelect";
import MonthlyMemo from "./MonthlyMemo";
import GuestbookBrowser from "./GuestbookBrowser";
import OperatorAccessGate from "./OperatorAccessGate";
import { ENABLE_REPORT_AI_ANALYSIS } from "@/lib/pilotFlags";

export const metadata: Metadata = {
  title: "월간 운영 — 공간큐브",
  description: "한 달 동안 쌓인 공간의 기록을 돌아보고, 다음 달을 준비하는 페이지입니다.",
};

interface Props {
  searchParams: Promise<{ reportId?: string }>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{children}</p>;
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--border)" }} />;
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export default async function OperatorPage({ searchParams }: Props) {
  const session = await getOperatorSession();

  if (!session) {
    return (
      <main className="flex flex-col min-h-screen px-6 py-8">
        <OperatorAccessGate />
      </main>
    );
  }

  const spaceId = session.spaceId;
  const activeSpace = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!activeSpace) {
    return (
      <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          공간을 찾을 수 없습니다. 공간큐브 관리자에게 문의해주세요.
        </p>
      </main>
    );
  }

  const { reportId: requestedReportId } = await searchParams;

  const now = new Date();
  const reportNotStarted =
    !activeSpace.reportEnabled || !activeSpace.reportStartDate || activeSpace.reportStartDate.getTime() > now.getTime();

  const period = !reportNotStarted && activeSpace.reportStartDate ? computeReportPeriod(activeSpace.reportStartDate, now) : null;

  const [latestReport, requestedReport, pastReports, activeSession, archivedSessions] = await Promise.all([
    prisma.spaceMonthlyReport.findFirst({
      where: { spaceId, status: MonthlyReportStatus.PUBLISHED },
      orderBy: { periodStart: "desc" },
    }),
    requestedReportId ? prisma.spaceMonthlyReport.findUnique({ where: { id: requestedReportId } }) : Promise.resolve(null),
    prisma.spaceMonthlyReport.findMany({
      where: { spaceId, status: MonthlyReportStatus.PUBLISHED },
      orderBy: { periodStart: "desc" },
      select: { id: true, periodStart: true, periodEnd: true },
    }),
    prisma.guestbookSession.findFirst({ where: { spaceId, status: GuestbookSessionStatus.ACTIVE } }),
    prisma.guestbookSession.findMany({
      where: { spaceId, status: GuestbookSessionStatus.ARCHIVED },
      orderBy: { startsAt: "desc" },
      include: {
        notes: {
          select: { id: true, userId: true, content: true, nickname: true, _count: { select: { reactions: true } } },
        },
      },
    }),
  ]);

  const report = requestedReport && requestedReport.spaceId === spaceId ? requestedReport : latestReport;

  const featuredPosts = report
    ? await prisma.monthlyReportFeaturedPost.findMany({
        where: { monthlyReportId: report.id },
        orderBy: { rank: "asc" },
        include: { note: { select: { content: true, createdAt: true, nickname: true } } },
      })
    : [];

  const activeSessionNotes = activeSession
    ? await prisma.guestbookNote.findMany({
        where: { guestbookSessionId: activeSession.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          nickname: true,
          clusterType: true,
          createdAt: true,
          _count: { select: { reactions: true } },
        },
      })
    : [];

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-10">
      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{activeSpace.name}</p>
        <h1 className="text-xl font-bold">월간 운영 일지</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          한 달 동안 쌓인 공간의 기록을 돌아보고, 다음 달을 준비해보세요.
        </p>
      </div>

      {/* ── 리포트 주기 (읽기 전용 — 시작일 변경은 공간큐브 관리자 전용) ── */}
      <Divider />
      <section className="space-y-3">
        <SectionLabel>// 리포트 주기</SectionLabel>
        {reportNotStarted ? (
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            아직 리포트 시작일이 설정되지 않았습니다. 공간큐브 관리자에게 문의해주세요.
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-sm">
              현재 집계 중 <span className="font-medium">{formatDate(period!.currentPeriodStart.toISOString())} – {formatDate(new Date(period!.currentPeriodEnd.getTime() - 86400000).toISOString())}</span>
            </p>
            <p className="text-xs" style={{ color: "var(--dim)" }}>
              다음 리포트 {formatDate(period!.nextReportDate.toISOString())} 공개 예정
            </p>
          </div>
        )}
      </section>

      {/* ── 월간 리포트 ── */}
      <Divider />
      <section className="space-y-4">
        <div className="space-y-1 flex items-start justify-between gap-3">
          <div>
            <SectionLabel>// 월간 리포트</SectionLabel>
            {report && (
              <h2 className="text-lg font-bold">
                {formatDate(report.periodStart.toISOString())} – {formatDate(new Date(report.periodEnd.getTime() - 86400000).toISOString())}
              </h2>
            )}
          </div>
          {pastReports.length > 0 && (
            <PastReportsSelect
              spaceId={spaceId}
              currentReportId={report?.id ?? null}
              options={pastReports.map((r) => ({ id: r.id, label: formatDate(r.periodStart.toISOString()) }))}
            />
          )}
        </div>

        {!report ? (
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            첫 번째 월간 리포트를 만들고 있습니다.
            {period && ` ${formatDate(period.nextReportDate.toISOString())}에 공개될 예정이에요.`}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <ReportStat label="QR 이용자" value={`${report.qrUsers}`} unit="명" />
              <ReportStat label="재방문" value={`${report.returningUsers}`} unit={`명 · ${pct(report.revisitRate)}`} />
              <ReportStat label="방명록 작성" value={`${report.guestbookWriters}`} unit={`명 · ${pct(report.guestbookRate)}`} />
              <ReportStat label="방명록 포스트잇" value={`${report.guestbookPosts}`} unit="개" />
              <ReportStat
                label="평균 취향 적합도"
                value={report.averageTasteScore != null ? report.averageTasteScore.toFixed(1) : "—"}
                unit="/ 5"
              />
            </div>

            {ENABLE_REPORT_AI_ANALYSIS && (
              <div className="p-4 border space-y-1.5" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--dim)" }}>공간 사용 방식</p>
                <p className="text-sm leading-relaxed">{report.usageSummary}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공감 TOP3</p>
              {featuredPosts.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--dim)" }}>아직 공감이 쌓인 기록이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {featuredPosts.map((f) => (
                    <div key={f.rank} className="p-3 border space-y-1" style={{ borderColor: "var(--border)" }}>
                      <div className="flex justify-between text-xs" style={{ color: "var(--dim)" }}>
                        <span>{f.rank}위 · 공감 {f.reactionCount}</span>
                        <span>{formatDate(f.note.createdAt.toISOString())}</span>
                      </div>
                      <p className="text-sm leading-relaxed break-keep">{f.note.content}</p>
                      {f.note.nickname && <p className="text-xs" style={{ color: "var(--dim)" }}>— {f.note.nickname}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <MonthlyMemo key={report.id} spaceId={spaceId} reportId={report.id} />
          </>
        )}
      </section>

      {/* ── 이번 기간 방명록 ── */}
      <Divider />
      <section className="space-y-4">
        <div className="space-y-1">
          <SectionLabel>// 이번 기간 방명록</SectionLabel>
          <h2 className="text-lg font-bold">
            {activeSession ? `${activeSessionNotes.length}개의 기록` : "진행 중인 방명록 없음"}
          </h2>
        </div>
        {!activeSession ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>아직 진행 중인 방명록 세션이 없습니다.</p>
        ) : activeSessionNotes.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>아직 남겨진 방명록이 없습니다.</p>
        ) : (
          <GuestbookBrowser
            notes={activeSessionNotes.map((n) => ({
              id: n.id,
              content: n.content,
              nickname: n.nickname,
              clusterType: n.clusterType,
              createdAt: n.createdAt.toISOString(),
              reactionCount: n._count.reactions,
            }))}
          />
        )}
      </section>

      {/* ── 이전 방명록 아카이브 ── */}
      <Divider />
      <section className="space-y-4">
        <SectionLabel>// 이전 방명록 아카이브</SectionLabel>
        {archivedSessions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>아직 종료된 방명록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {archivedSessions.map((s) => {
              const totalReactions = s.notes.reduce((sum, n) => sum + n._count.reactions, 0);
              const uniqueWriterCount = new Set(s.notes.map((n) => n.userId)).size;
              const top = [...s.notes].sort((a, b) => b._count.reactions - a._count.reactions)[0];
              return (
                <div key={s.id} className="p-4 border space-y-2" style={{ borderColor: "var(--border)" }}>
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-medium">
                      {formatDate(s.startsAt?.toISOString() ?? null)} – {formatDate(s.endsAt?.toISOString() ?? null)}
                    </p>
                    <Link href={`/space/${activeSpace.slug}/guestbook/archive/${s.id}`} className="text-xs underline underline-offset-2" style={{ color: "var(--dim)" }}>
                      읽기 →
                    </Link>
                  </div>
                  {(s.question1 || s.question2) && (
                    <p className="text-xs" style={{ color: "var(--dim)" }}>
                      {[s.question1, s.question2].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs" style={{ color: "var(--dim)" }}>
                    <span>포스트잇 {s.notes.length}개</span>
                    <span>작성자 {uniqueWriterCount}명</span>
                    <span>공감 {totalReactions}개</span>
                  </div>
                  {top && top._count.reactions > 0 && (
                    <p className="text-xs leading-relaxed pl-2" style={{ borderLeft: "2px solid var(--border)", color: "var(--fg)" }}>
                      &ldquo;{top.content}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function ReportStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 border" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--dim)" }}>{label}</p>
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-xs" style={{ color: "var(--dim)" }}>{unit}</p>
    </div>
  );
}
