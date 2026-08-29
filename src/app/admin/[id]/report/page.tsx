import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { recomputeSpaceKPI, getSpaceMonthlyKpi, getEarliestRecordDate, getDailyVisitTrend } from "@/lib/kpi";
import { getExtendedPeriodStats } from "@/lib/reportMetrics";
import { computeMonthlyReportContent, formatDurationLabel } from "@/lib/monthlyReport";
import { resolveDateRange, detectActivePreset, formatKstDateParam, toDotFormat, type DateRangePreset } from "@/lib/reportDateRange";
import ReportEmail from "@/components/ReportEmail";
import DateRangeFilter from "./DateRangeFilter";
import PrintReportButton from "./PrintReportButton";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

const PRESET_LABEL: Record<DateRangePreset, string> = { today: "오늘", "7d": "최근 7일", "30d": "최근 30일", all: "전체" };

/**
 * 관리자 "공간 운영 리포트" 페이지 — 파일럿 단순화 구조(2026-08-08).
 *
 * 파일럿에서는 운영자 페이지/자동 월간 리포트 시스템을 쓰지 않는다. 대신 관리자가 이 화면에서
 * 기간을 고르면, 같은 기간으로 ①내부 분석용 KPI 요약(.no-print, 화면 전용)과 ②운영자 전달용
 * 리포트 미리보기(그대로 PDF로 인쇄)가 동시에 갱신된다. 예전에 있던 "리포트 기준일 설정"·
 * "수동 리포트 생성"·"이전 리포트" UI는 이 페이지에서 제거했다(SpaceMonthlyReport/생성 API/
 * cron/컴포넌트 파일은 코드 변경 없이 그대로 남아있다 — 파일럿 이후 자동 월간 리포트로 다시
 * 쓸 수 있게 보존, [[project_monthly_report_audit_2026-08-08]] 참고).
 *
 * "리포트 미리보기"는 SpaceMonthlyReport에 스냅샷을 쓰지 않는다 — computeMonthlyReportContent로
 * 현재 원본 데이터를 그 자리에서 계산만 해서 보여준다(previousStats/previousStoryStats는 항상
 * null — "전월 대비"가 성립하지 않는 자유 기간 조회라 비교 문장(③⑦)은 기본 숨김).
 */
export default async function ReportAdminPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId } = await params;
  const { from, to } = await searchParams;

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true, name: true, slug: true, createdAt: true },
  });
  if (!space) notFound();

  // 화면에서 매번 원본 테이블을 다시 계산하지 않지만, 관리자가 최신 값을 보도록
  // 조회 시점에 한 번만 오늘 날짜(KST) SpaceKPI 스냅샷 행을 갱신한다(이 페이지가 직접
  // 읽지는 않지만, 다른 화면/향후 KPI 히스토리가 참조할 수 있어 계속 최신으로 유지).
  await recomputeSpaceKPI(spaceId);

  const now = new Date();
  const earliestRecordDate = await getEarliestRecordDate(spaceId);
  const allTimeStart = earliestRecordDate ?? space.createdAt;
  const range = resolveDateRange(from, to, allTimeStart, now);
  const activePreset = detectActivePreset(range.from, range.to, now, allTimeStart);

  // 관리자 KPI 요약과 리포트 미리보기가 정확히 같은 [range.start, range.end)를 쓴다 —
  // 각자 따로 날짜를 계산하지 않는 것이 "기간 일치" 원칙(§21)의 핵심.
  const [rangeStats, rangeExtended, dailyTrend, previewData] = await Promise.all([
    getSpaceMonthlyKpi(spaceId, range.start, range.end),
    getExtendedPeriodStats(spaceId, range.start, range.end),
    getDailyVisitTrend(spaceId, range.start, range.end),
    computeMonthlyReportContent(spaceId, range.start, range.end, null, null),
  ]);

  const recommendedFileName = `공간큐브_${space.name}_${range.from}_${range.to}.pdf`;
  const noRangeData = rangeStats.qrUsers === 0 && rangeExtended.qrScans === 0;

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="no-print space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / REPORT</p>
          <Link href="/admin" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="no-print space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>운영 리포트</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      {/* ── 기간 선택 — 이 페이지 전체(KPI 요약 + 리포트 미리보기)가 공유하는 단일 기간 소스 ── */}
      <div className="no-print" style={{ borderTop: "1px solid var(--border)" }} />
      <section className="no-print space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>기간</p>
          <p className="text-sm font-medium">
            {activePreset ? PRESET_LABEL[activePreset] : "직접 지정"}
            <span style={{ color: "var(--dim)" }}> ({toDotFormat(range.from)} — {toDotFormat(range.to)})</span>
          </p>
          {range.usedFallback && (from || to) && (
            <p className="text-xs" style={{ color: "var(--dim)" }}>요청한 기간이 올바르지 않아 최근 30일로 표시합니다.</p>
          )}
        </div>
        <DateRangeFilter from={range.from} to={range.to} activePreset={activePreset} allTimeStart={formatKstDateParam(allTimeStart)} />
      </section>

      {/* ── KPI 요약(관리자 전용, 화면에서만 보임) ── */}
      <div className="no-print" style={{ borderTop: "1px solid var(--border)" }} />
      <section className="no-print space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>KPI 요약 — 관리자 전용</p>
        {!earliestRecordDate ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            아직 이 공간에 대한 기록이 없습니다. 첫 방문 기록이 생기면 KPI가 쌓이기 시작합니다.
          </p>
        ) : noRangeData ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>선택한 기간에 기록된 방문이 없습니다.</p>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>방문</p>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="방문 Record 수" value={rangeStats.totalRecords} unit="건" />
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
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="스토리 조회" value={rangeExtended.episodeViews} unit="회" />
                <StatBox label="스토리 완료" value={rangeExtended.episodeCompletions} unit="회" />
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
          </>
        )}
      </section>

      {/* ── 리포트 미리보기 — 운영자에게 전달할 내용만, 위 KPI 요약과 정확히 같은 기간을 사용한다.
           PDF로 인쇄할 때 이 섹션만 남고 나머지(.no-print)는 전부 숨는다. ── */}
      <div className="no-print" style={{ borderTop: "1px solid var(--border)" }} />
      <section className="space-y-4">
        <div className="no-print flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>리포트 미리보기</p>
          <PrintReportButton />
        </div>
        <p className="no-print text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          운영자에게 전달할 내용만 담았습니다. &quot;PDF로 저장&quot;을 누르면 인쇄 대화상자가 뜨고, 거기서 대상을 &quot;PDF로 저장&quot;으로 바꾸면 파일로 저장할 수 있습니다.
        </p>
        <div className="border" style={{ borderColor: "var(--border)" }}>
          <ReportEmail data={previewData} showHeadline />
        </div>
        <p className="no-print text-xs" style={{ color: "var(--dim)" }}>
          권장 파일명 — <code className="font-mono">{recommendedFileName}</code>
        </p>
      </section>

      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          .no-print { display: none !important; }
          html, body { background: #fff; }
        }
      `}</style>
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

/** "일별 방문 추이" — 새 차트 라이브러리 없이 막대 높이(%)만으로 그리는 최소 구현, 관리자 전용. */
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
