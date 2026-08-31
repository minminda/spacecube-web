import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { recomputeSpaceKPI, getSpaceMonthlyKpi, getEarliestRecordDate, getDailyVisitTrend } from "@/lib/kpi";
import {
  getExtendedPeriodStats,
  getHourlyPeriodStats,
  getGuestbookConversionFunnel,
  getRecentVisitLog,
  type HourlyCountSet,
  type GuestbookConversionFunnel,
  type VisitLogEntry,
} from "@/lib/reportMetrics";
import { computeMonthlyReportContent, formatDurationLabel } from "@/lib/monthlyReport";
import {
  resolveDateRange,
  detectActivePreset,
  formatKstDateParam,
  formatKstTime,
  toDotFormat,
  type DateRangePreset,
} from "@/lib/reportDateRange";
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
  // 시간별 조회는 하루(from===to)를 선택했을 때만 의미가 있으므로 그때만 쿼리한다.
  const isSingleDay = range.from === range.to;
  const [rangeStats, rangeExtended, dailyTrend, previewData, hourlyStats, funnelStats, visitLog] = await Promise.all([
    getSpaceMonthlyKpi(spaceId, range.start, range.end),
    getExtendedPeriodStats(spaceId, range.start, range.end),
    getDailyVisitTrend(spaceId, range.start, range.end),
    computeMonthlyReportContent(spaceId, range.start, range.end, null, null),
    isSingleDay ? getHourlyPeriodStats(spaceId, range.start, range.end) : Promise.resolve(null),
    getGuestbookConversionFunnel(spaceId, range.start, range.end),
    getRecentVisitLog(spaceId, range.start, range.end, 50),
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
                <StatBox
                  label="실제 방명록 조회"
                  value={funnelStats.guestbookViewers}
                  unit="명 — 아래 방문자 퍼널 참고"
                />
              </div>
            </div>

            <VisitLogSection entries={visitLog} />

            <FunnelSection funnel={funnelStats} />

            {dailyTrend.length > 0 ? (
              <DailyTrendChart data={dailyTrend} />
            ) : (
              Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) > 62 && (
                <p className="text-xs" style={{ color: "var(--dim)" }}>선택한 기간이 길어(62일 초과) 일별 추이는 생략합니다.</p>
              )
            )}

            {hourlyStats && <HourlySection data={hourlyStats} dateLabel={toDotFormat(range.from)} />}
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

/**
 * "최근 방문 로그"(PHASE 2 현장 관찰용) — 평균 체류시간 같은 요약값만으로는 실제 방문자
 * 행동을 판단하기 어렵다는 요청에 따라, 개별 QR Entry 발생 시각과 그 방문에서 Story를
 * 얼마나 읽었는지를 원본 그대로(요약 전) 최근 방문 순으로 보여준다. 새 세션 추적 시스템을
 * 만들지 않고 getRecentVisitLog(reportMetrics.ts)가 기존 SpaceScan/EpisodeRead만으로
 * 짝지은 결과를 표시만 한다. 날짜가 바뀔 때만 날짜 헤더를 넣고, 같은 날짜 안에서는
 * 시각(HH:mm:ss)만 반복한다.
 */
function VisitLogSection({ entries }: { entries: VisitLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>최근 방문 로그</p>
        <p className="text-sm" style={{ color: "var(--dim)" }}>선택한 기간에 QR Entry 기록이 없습니다.</p>
      </div>
    );
  }

  let lastDateKey: string | null = null;

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: "var(--dim)" }}>
        최근 방문 로그(KST) — QR Entry 시각 · Story 체류시간, 최근 {entries.length}건
      </p>
      <div className="flex flex-col border" style={{ borderColor: "var(--border)" }}>
        {entries.map((entry, i) => {
          const dateKey = formatKstDateParam(entry.scannedAt);
          const showDateHeader = dateKey !== lastDateKey;
          lastDateKey = dateKey;
          return (
            <div key={i}>
              {showDateHeader && (
                <p
                  className="text-[11px] uppercase tracking-widest px-3 pt-2"
                  style={{ color: "var(--dim)", borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                >
                  {toDotFormat(dateKey)}
                </p>
              )}
              <div className="flex items-center justify-between px-3 py-2 text-xs" style={{ borderTop: showDateHeader ? undefined : "1px solid var(--border)" }}>
                <span className="font-mono">{formatKstTime(entry.scannedAt)}</span>
                <span style={{ color: "var(--dim)" }}>{visitOutcomeLabel(entry)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
        최근 {entries.length}건만 표시합니다. &quot;스토리 미조회&quot;는 QR은 인식됐지만 이 기간 안에 이야기를 열람한
        기록이 없는 경우(같은 방문자가 이미 열어본 이야기를 재방문 시 다시 열지 않은 경우 포함)이고,
        &quot;중도 이탈&quot;은 이야기를 열었지만 마지막까지 스크롤하지 않고 페이지를 벗어난 경우입니다.
      </p>
    </div>
  );
}

function visitOutcomeLabel(entry: VisitLogEntry): string {
  if (!entry.storyOpenedAt) return "스토리 미조회";
  if (entry.storyDurationMs == null) return "Story 진행 중 / 측정 안 됨";
  const duration = formatDurationLabel(entry.storyDurationMs);
  return entry.storyCompleted ? `Story ${duration}` : `Story ${duration} · 중도 이탈`;
}

/**
 * "방문자 퍼널" — QR 인식부터 포스트잇 작성까지 9단계를 원시 숫자(명)와 직전 단계 대비
 * 전환율로 한 줄씩 보여준다. 어느 구간에서 가장 크게 빠지는지 한눈에 보기 위한 진단용
 * 화면이라 막대그래프 대신 텍스트 목록으로 구성했다(기존 관리자 화면의 흑백/텍스트 스타일
 * 유지). getGuestbookConversionFunnel이 이미 모든 값을 "명"(고유 방문자) 단위로 통일해
 * 넘겨주므로 여기서는 표시만 담당한다 — 절대 다른 곳의 "회" 단위 숫자를 섞어 넣지 않는다.
 */
function FunnelSection({ funnel }: { funnel: GuestbookConversionFunnel }) {
  const steps: { key: string; label: string; value: number }[] = [
    { key: "qr", label: "QR 진입", value: funnel.qrEntrants },
    { key: "storyView", label: "Story View", value: funnel.storyViewers },
    { key: "storyComplete", label: "Story Complete", value: funnel.storyCompleters },
    { key: "entryAttempt", label: "방명록 열기 클릭", value: funnel.entryAttempts },
    { key: "loginSuccess", label: "로그인 성공", value: funnel.loginSuccess },
    { key: "record", label: "취향 점수 완료", value: funnel.recordCompleters },
    { key: "guestbookView", label: "실제 방명록 조회", value: funnel.guestbookViewers },
    { key: "writeAttempt", label: "작성 시도", value: funnel.writeAttempts },
    { key: "postIt", label: "작성 완료", value: funnel.postItAuthors },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>방문자 퍼널 — 이탈 구간 진단</p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
        모두 &quot;몇 명&quot;(중복 제거) 기준입니다. 위 KPI의 &quot;회&quot; 단위 숫자(스토리 조회 등, 같은 사람이 여러 번 잡힐 수 있음)와는
        집계 단위가 달라 직접 비교하면 안 됩니다.
      </p>

      <div className="flex flex-col">
        {steps.map((step, i) => {
          const prevValue = i > 0 ? steps[i - 1].value : null;
          const rateLabel = prevValue == null ? null : prevValue > 0 ? pct(step.value / prevValue) : "—";
          return (
            <div key={step.key}>
              {rateLabel != null && (
                <p className="text-xs text-center py-1" style={{ color: "var(--border)" }}>↓ {rateLabel}</p>
              )}
              <div className="flex items-center justify-between p-3 border" style={{ borderColor: "var(--border)" }}>
                <span className="text-sm">{step.label}</span>
                <span className="text-lg font-bold">{step.value}<span className="text-xs font-normal" style={{ color: "var(--dim)" }}> 명</span></span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="로그인 요구" value={funnel.loginRequired} unit="명" />
          <StatBox
            label="로그인 전환율"
            value={funnel.loginRequired > 0 ? pct(funnel.loginSuccess / funnel.loginRequired) : "—"}
            unit=""
          />
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
          로그인 요구/전환율은 비로그인 방문자에게만 발생합니다(이미 로그인된 방문자는 &quot;방명록 열기 클릭&quot;에서 곧장
          다음 단계로 이어져 이 값을 거치지 않습니다) — 방명록에 관심을 보인 비로그인 방문자가 로그인 때문에 얼마나
          이탈하는지는 위 퍼널의 &quot;방명록 열기 클릭 → 로그인 성공&quot; 전환율이 아니라 이 값으로 판단하세요.
        </p>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
        비로그인 QR 진입/Story View/방명록 열기 클릭 계측은 2026-08-29부터 시작되었습니다. 그 이전 기간을 조회하면
        이 지표들은 로그인 사용자만 반영해 실제보다 적게 나올 수 있습니다.
      </p>
    </div>
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

const HOURLY_METRICS: { key: keyof HourlyCountSet; label: string }[] = [
  { key: "qrScans", label: "QR 인식" },
  { key: "episodeViews", label: "스토리 조회" },
  { key: "episodeCompletions", label: "스토리 완료" },
  { key: "records", label: "취향 기록(Record)" },
  { key: "guestbookPosts", label: "방명록 작성" },
];

/** 하루를 선택했을 때만 나타나는 "시간별 조회" — 설치 위치/문구를 바꾼 뒤 실제 QR/Story
 *  진입이 언제 발생했는지 시간 단위로 확인하기 위한 최소 구현. 지표마다 DailyTrendChart와
 *  같은 막대 그래프를 하나씩 쌓아 보여주고, X축(00시~23시)은 맨 아래 한 번만 공유해서
 *  화면을 과하게 늘리지 않는다. */
function HourlySection({ data, dateLabel }: { data: HourlyCountSet[]; dateLabel: string }) {
  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--dim)" }}>시간별 조회 — {dateLabel} (KST)</p>
      {HOURLY_METRICS.map(({ key, label }) => (
        <HourlyTrendChart key={key} label={label} data={data.map((d) => ({ hour: d.hour, count: d[key] as number }))} />
      ))}
      <div className="flex justify-between text-[10px]" style={{ color: "var(--dim)" }}>
        {[0, 4, 8, 12, 16, 20].map((h) => (
          <span key={h}>{String(h).padStart(2, "0")}시</span>
        ))}
      </div>
    </div>
  );
}

function HourlyTrendChart({ label, data }: { label: string; data: { hour: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px]" style={{ color: "var(--dim)" }}>{label}</p>
        <p className="text-[11px]" style={{ color: "var(--dim)" }}>합계 {total}</p>
      </div>
      <div className="flex items-end gap-[2px]" style={{ height: 40 }}>
        {data.map((d) => (
          <div
            key={d.hour}
            title={`${String(d.hour).padStart(2, "0")}시 · ${d.count}건`}
            className="flex-1"
            style={{
              height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`,
              background: d.count > 0 ? "var(--fg)" : "var(--border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
