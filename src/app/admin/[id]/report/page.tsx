import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { recomputeSpaceKPI, getLatestSpaceKPI, getSpaceMonthlyKpi } from "@/lib/kpi";
import { getExtendedPeriodStats } from "@/lib/reportMetrics";
import { computeMonthlyReportContent, buildReportEmailDataFromStored } from "@/lib/monthlyReport";
import { resolvePreviewPeriods, inferReportDayPreset } from "@/lib/reportPeriod";
import ReportEmail from "@/components/ReportEmail";
import ReportSendSettingsForm from "./ReportSendSettingsForm";
import ReportHistorySelect from "./ReportHistorySelect";
import GenerateReportButton from "./GenerateReportButton";
import { ENABLE_REPORT_EMAIL, ENABLE_REPORT_AI_ANALYSIS } from "@/lib/pilotFlags";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reportId?: string }>;
}

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function formatPeriodOptionLabel(periodStart: Date): string {
  return `${periodStart.getFullYear()}.${String(periodStart.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 관리자 "운영 리포트 관리" 통합 페이지 — 예전 /admin/[id]/kpi(KPI)와
 * /admin/[id]/report-settings(리포트 설정)를 하나로 합쳤다. 같은 페이지 안에서
 * 현재 KPI → 리포트 미리보기(실제 메일과 같은 ReportEmail 컴포넌트) → 메일 발송 설정 →
 * 수동 생성 → 이전 리포트 순서로 배치한다(별도 라우트로 분리하지 않음).
 */
export default async function ReportAdminPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId } = await params;
  const { reportId } = await searchParams;

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      reportStartDate: true,
      reportEnabled: true,
      owner: { select: { email: true } },
    },
  });
  if (!space) notFound();

  // 화면에서 매번 원본 테이블을 다시 계산하지 않지만, 관리자가 최신 값을 보도록
  // 조회 시점에 한 번만 오늘 날짜(KST) 행을 갱신한다.
  await recomputeSpaceKPI(spaceId);
  const dailyKpi = await getLatestSpaceKPI(spaceId);

  const now = new Date();
  const { current, previous } = resolvePreviewPeriods(space.reportStartDate, now);

  const [currentExtended, previousStats, archivedReports] = await Promise.all([
    getExtendedPeriodStats(spaceId, current.start, current.end),
    previous ? getSpaceMonthlyKpi(spaceId, previous.start, previous.end) : Promise.resolve(null),
    prisma.spaceMonthlyReport.findMany({
      where: { spaceId },
      orderBy: { periodStart: "desc" },
      select: { id: true, periodStart: true, periodEnd: true },
    }),
  ]);

  const selectedReport = reportId ? archivedReports.find((r) => r.id === reportId) ?? null : null;
  const previewData = selectedReport
    ? await buildReportEmailDataFromStored(selectedReport.id)
    : await computeMonthlyReportContent(spaceId, current.start, current.end, previousStats);
  if (!previewData) notFound();

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / REPORT</p>
          <Link href="/admin" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>운영 리포트</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      {/* ── 현재 KPI ── */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <section className="space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>현재 KPI</p>
        {!dailyKpi ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            아직 이 공간에 대한 기록이 없습니다. 첫 방문 기록이 생기면 KPI가 쌓이기 시작합니다.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>방문</p>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="QR 이용자(누적)" value={dailyKpi.qrUsersTotal} unit="명" />
                <StatBox label="이번 달 QR 이용자" value={dailyKpi.qrUsersMonth} unit="명" />
                <StatBox label="QR 스캔 수(이번 기간)" value={currentExtended.qrScans} unit="회" />
              </div>
              <p className="text-xs" style={{ color: "var(--dim)" }}>전월 대비는 아래 &quot;리포트 미리보기&quot;의 핵심 KPI 카드에서 확인할 수 있습니다.</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>재방문</p>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="재방문자" value={dailyKpi.revisitUsersTotal} unit="명" />
                <StatBox label="재방문율" value={pct(dailyKpi.revisitRate)} unit="" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>공간 이야기 (이번 기간 · 현재 수집 가능한 데이터 기준)</p>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Episode 조회 수" value={currentExtended.episodeViews} unit="회" />
                <StatBox label="새로 해제된 Episode" value={currentExtended.newlyUnlockedEpisodes} unit="개" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>취향</p>
              <p className="text-2xl font-bold leading-none">
                {dailyKpi.averageTasteScore != null ? dailyKpi.averageTasteScore.toFixed(1) : "—"}
                <span className="text-sm font-normal" style={{ color: "var(--dim)" }}> / 5 평균</span>
              </p>
              <div className="flex gap-2">
                {currentExtended.tasteScoreDistribution.map((b) => (
                  <div key={b.score} className="flex-1 text-center p-2 border" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs" style={{ color: "var(--dim)" }}>{b.score}점</p>
                    <p className="text-sm font-medium">{b.count}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>방명록 (이번 기간)</p>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="포스트잇 작성" value={dailyKpi.totalGuestbookCount} unit="개" />
                <StatBox label="작성률" value={pct(dailyKpi.guestbookRate)} unit="" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="공감 수" value={currentExtended.reactionsTotal} unit="회" />
                <div className="flex flex-col justify-center gap-1 p-4 border" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs" style={{ color: "var(--dim)" }}>방명록 진입</p>
                  <p className="text-xs" style={{ color: "var(--border)" }}>아직 별도로 추적하지 않습니다 (구조만 준비)</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>추천</p>
              <p className="text-xs" style={{ color: "var(--border)" }}>추천 결과 노출 수 · 위치 보기 클릭 수는 아직 수집하지 않습니다 (구조만 준비).</p>
            </div>
          </>
        )}
      </section>

      {/* ── 리포트 미리보기 ── */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>리포트 미리보기</p>
          {archivedReports.length > 0 && (
            <ReportHistorySelect
              spaceId={space.id}
              currentReportId={selectedReport?.id ?? null}
              options={archivedReports.map((r) => ({ id: r.id, label: formatPeriodOptionLabel(r.periodStart) }))}
            />
          )}
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          {ENABLE_REPORT_EMAIL
            ? "운영자가 실제로 받는 메일과 같은 내용입니다."
            : "관리자 확인용 미리보기입니다. (파일럿 기간에는 자동 이메일 발송이 꺼져 있습니다.)"}
        </p>
        <div className="border" style={{ borderColor: "var(--border)" }}>
          <ReportEmail data={previewData} showAnalysis={ENABLE_REPORT_AI_ANALYSIS} />
        </div>
      </section>

      {/* ── 리포트 기준일 설정 (파일럿 기간엔 이메일 발송 관련 UI를 숨기고 기준일만 노출) ── */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
          {ENABLE_REPORT_EMAIL ? "메일 발송 설정" : "리포트 기준일 설정"}
        </p>
        <ReportSendSettingsForm
          spaceId={space.id}
          initialEnabled={space.reportEnabled}
          initialPreset={space.reportStartDate ? inferReportDayPreset(space.reportStartDate) : 1}
          ownerEmail={space.owner?.email ?? null}
          emailEnabled={ENABLE_REPORT_EMAIL}
        />
      </section>

      {/* ── 수동 리포트 생성 ── */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>수동 리포트 생성</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          공개일이 지났지만 아직 생성되지 않은 구간이 있으면 지금 생성합니다. 이미 생성된 구간은 다시 만들지 않습니다.
        </p>
        {space.reportStartDate ? (
          <GenerateReportButton spaceId={space.id} />
        ) : (
          <p className="text-xs" style={{ color: "var(--border)" }}>발송 기준일을 먼저 저장해주세요.</p>
        )}
      </section>

      {/* ── 이전 리포트 ── */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>이전 리포트</p>
        {archivedReports.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>아직 생성된 리포트가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {archivedReports.map((r) => (
              <Link
                key={r.id}
                href={`/admin/${space.id}/report?reportId=${r.id}`}
                className="flex items-center justify-between p-3 border transition-colors hover:bg-[var(--tag-bg)]"
                style={{ borderColor: r.id === selectedReport?.id ? "var(--fg)" : "var(--border)" }}
              >
                <span className="text-sm">{formatPeriodOptionLabel(r.periodStart)}</span>
                <span className="text-xs" style={{ color: "var(--dim)" }}>미리보기 →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatBox({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 border" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--dim)" }}>{label}</p>
      <p className="text-2xl font-bold leading-none">{value}</p>
      {unit && <p className="text-xs" style={{ color: "var(--dim)" }}>{unit}</p>}
    </div>
  );
}
