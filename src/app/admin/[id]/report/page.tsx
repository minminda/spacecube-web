import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { recomputeSpaceKPI, getSpaceMonthlyKpi, getEarliestRecordDate, getDailyVisitTrend } from "@/lib/kpi";
import { getExtendedPeriodStats } from "@/lib/reportMetrics";
import { computeMonthlyReportContent, buildReportEmailDataFromStored, formatDurationLabel } from "@/lib/monthlyReport";
import { resolvePreviewPeriods, inferReportDayPreset } from "@/lib/reportPeriod";
import { resolveDateRange, detectActivePreset, formatKstDateParam, toDotFormat, type DateRangePreset } from "@/lib/reportDateRange";
import ReportEmail from "@/components/ReportEmail";
import ReportSendSettingsForm from "./ReportSendSettingsForm";
import ReportHistorySelect from "./ReportHistorySelect";
import GenerateReportButton from "./GenerateReportButton";
import DateRangeFilter from "./DateRangeFilter";
import { ENABLE_REPORT_EMAIL, ENABLE_REPORT_AI_ANALYSIS } from "@/lib/pilotFlags";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reportId?: string; from?: string; to?: string }>;
}

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function formatPeriodOptionLabel(periodStart: Date): string {
  return `${periodStart.getFullYear()}.${String(periodStart.getMonth() + 1).padStart(2, "0")}`;
}

const PRESET_LABEL: Record<DateRangePreset, string> = { today: "오늘", "7d": "최근 7일", "30d": "최근 30일", all: "전체" };

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
  const { reportId, from, to } = await searchParams;

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      reportStartDate: true,
      reportEnabled: true,
      owner: { select: { email: true } },
    },
  });
  if (!space) notFound();

  // 이 페이지의 "현재 KPI" 섹션은 이제 아래에서 계산하는 기간별 원본 집계(rangeStats 등)를
  // 그대로 쓰지만, 다른 화면(향후 KPI 히스토리 등)이 참조할 수 있도록 오늘 날짜(KST) 스냅샷
  // 행은 계속 최신 상태로 갱신해둔다.
  await recomputeSpaceKPI(spaceId);

  const now = new Date();
  const { current, previous } = resolvePreviewPeriods(space.reportStartDate, now);

  // ── 관리자 기간 조회("현재 KPI") — 리포트 발행 주기(위 current/previous)와는 완전히 별개다.
  // "전체"의 시작점은 이 공간의 첫 방문일(없으면 공간 생성일)로, 관리자가 원하는 임의의
  // 기간을 자유롭게 잘라볼 수 있게 한다. 아래 "리포트 미리보기"/"이전 리포트" 섹션은 이
  // 기간 선택과 무관하게 그대로 report 주기(reportStartDate) 기준으로 계속 동작한다.
  const earliestRecordDate = await getEarliestRecordDate(spaceId);
  const allTimeStart = earliestRecordDate ?? space.createdAt;
  const range = resolveDateRange(from, to, allTimeStart, now);
  const activePreset = detectActivePreset(range.from, range.to, now, allTimeStart);

  const [previousStats, previousExtended, archivedReports, rangeStats, rangeExtended, dailyTrend] = await Promise.all([
    previous ? getSpaceMonthlyKpi(spaceId, previous.start, previous.end) : Promise.resolve(null),
    previous ? getExtendedPeriodStats(spaceId, previous.start, previous.end) : Promise.resolve(null),
    prisma.spaceMonthlyReport.findMany({
      where: { spaceId },
      orderBy: { periodStart: "desc" },
      select: { id: true, periodStart: true, periodEnd: true },
    }),
    getSpaceMonthlyKpi(spaceId, range.start, range.end),
    getExtendedPeriodStats(spaceId, range.start, range.end),
    getDailyVisitTrend(spaceId, range.start, range.end),
  ]);

  const selectedReport = reportId ? archivedReports.find((r) => r.id === reportId) ?? null : null;
  const previewData = selectedReport
    ? await buildReportEmailDataFromStored(selectedReport.id)
    : await computeMonthlyReportContent(spaceId, current.start, current.end, previousStats, previousExtended);
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

      {/* ── 현재 KPI(기간 조회) — 아래 "리포트 미리보기"의 발행 주기와는 별개로, 관리자가
           원하는 임의의 기간을 자유롭게 잘라볼 수 있는 섹션이다. ── */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <section className="space-y-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>현재 KPI</p>
          <p className="text-sm font-medium">
            {activePreset ? PRESET_LABEL[activePreset] : "직접 지정"}
            <span style={{ color: "var(--dim)" }}> ({toDotFormat(range.from)} — {toDotFormat(range.to)})</span>
          </p>
          {range.usedFallback && (from || to) && (
            <p className="text-xs" style={{ color: "var(--dim)" }}>요청한 기간이 올바르지 않아 최근 30일로 표시합니다.</p>
          )}
        </div>

        <DateRangeFilter from={range.from} to={range.to} activePreset={activePreset} allTimeStart={formatKstDateParam(allTimeStart)} />

        {!earliestRecordDate ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            아직 이 공간에 대한 기록이 없습니다. 첫 방문 기록이 생기면 KPI가 쌓이기 시작합니다.
          </p>
        ) : rangeStats.qrUsers === 0 && rangeExtended.qrScans === 0 ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>선택한 기간에 기록된 방문이 없습니다.</p>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>방문</p>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="QR 이용자" value={rangeStats.qrUsers} unit="명" />
                <StatBox label="QR 스캔 수" value={rangeExtended.qrScans} unit="회" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>재방문</p>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="재방문자" value={rangeStats.returningUsers} unit="명" />
                <StatBox label="재방문율" value={pct(rangeStats.revisitRate)} unit="" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>공간 이야기</p>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="스토리 조회" value={rangeExtended.episodeViews} unit="회" />
                <StatBox
                  label="스토리 완독률"
                  value={rangeExtended.episodeViews > 0 ? pct(rangeExtended.episodeCompletions / rangeExtended.episodeViews) : "—"}
                  unit=""
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatBox
                  label="평균 체류시간"
                  value={rangeExtended.avgReadDurationMs != null ? formatDurationLabel(rangeExtended.avgReadDurationMs) : "—"}
                  unit=""
                />
                <StatBox label="새로 해제된 Episode" value={rangeExtended.newlyUnlockedEpisodes} unit="개" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>취향</p>
              <p className="text-2xl font-bold leading-none">
                {rangeStats.averageTasteScore != null ? rangeStats.averageTasteScore.toFixed(1) : "—"}
                <span className="text-sm font-normal" style={{ color: "var(--dim)" }}> / 5 평균</span>
              </p>
              <div className="flex gap-2">
                {rangeExtended.tasteScoreDistribution.map((b) => (
                  <div key={b.score} className="flex-1 text-center p-2 border" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs" style={{ color: "var(--dim)" }}>{b.score}점</p>
                    <p className="text-sm font-medium">{b.count}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>방명록</p>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="포스트잇 작성" value={rangeStats.guestbookPosts} unit="개" />
                <StatBox label="작성자 수" value={rangeStats.guestbookWriters} unit="명" />
                <StatBox label="작성률" value={pct(rangeStats.guestbookRate)} unit="" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="공감 수" value={rangeExtended.reactionsTotal} unit="회" />
                <div className="flex flex-col justify-center gap-1 p-4 border" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs" style={{ color: "var(--dim)" }}>방명록 진입</p>
                  <p className="text-xs" style={{ color: "var(--border)" }}>아직 별도로 추적하지 않습니다 (구조만 준비)</p>
                </div>
              </div>
            </div>

            {dailyTrend.length > 0 ? (
              <DailyTrendChart data={dailyTrend} />
            ) : (
              Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) > 62 && (
                <p className="text-xs" style={{ color: "var(--dim)" }}>선택한 기간이 길어(62일 초과) 일별 추이는 생략합니다.</p>
              )
            )}

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

/** "일별 방문 추이" — 새 차트 라이브러리 없이 막대 높이(%)만으로 그리는 최소 구현(§10). */
function DailyTrendChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: "var(--dim)" }}>일별 방문 추이 (Record 기준)</p>
      <div className="flex items-end gap-[2px]" style={{ height: 64 }}>
        {data.map((d) => (
          <div
            key={d.date}
            title={`${toDotFormat(d.date)} · ${d.count}건`}
            className="flex-1"
            style={{
              height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`,
              background: d.count > 0 ? "var(--fg)" : "var(--border)",
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: "var(--dim)" }}>
        <span>{toDotFormat(data[0].date)}</span>
        <span>{toDotFormat(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}
