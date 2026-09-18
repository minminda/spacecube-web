import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getEarliestRecordDate } from "@/lib/kpi";
import { getStoryDepthForSpace, findLargestDropOff, type EpisodeStoryDepth } from "@/lib/storyDepth";
import { safeConversionRate } from "@/lib/reportMetrics";
import { resolveDateRange, detectActivePreset, formatKstDateParam, toDotFormat, type DateRangePreset } from "@/lib/reportDateRange";
import DateRangeFilter from "../DateRangeFilter";
import ReportTabs from "../ReportTabs";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

// Story Depth(Scene 도달) 계측을 도입한 날짜 — 이전 기간을 조회하면 Scene 단계 값이
// 존재하지 않는 과거 데이터를 임의로 추정하지 않고 그대로 0으로 보여준다(§23).
const SCENE_DEPTH_LAUNCH_DATE = "2026-09-18";

const PRESET_LABEL: Record<DateRangePreset, string> = { today: "오늘", "7d": "최근 7일", "30d": "최근 30일", all: "전체" };

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function conversionRateLabel(current: number, previous: number): string {
  const rate = safeConversionRate(current, previous);
  return rate == null ? "—" : pct(rate);
}

/**
 * 관리자 "스토리 분석" 탭 — 기존 핵심 퍼널(QR Entry~Experience Complete)의 "Story View →
 * Story Complete" 구간만 Scene 단위로 확대해서 보는 별도 화면이다. 같은 공간/기간 필터
 * (DateRangeFilter, resolveDateRange)를 report 메인 페이지와 그대로 공유하고, 새 필터
 * 시스템을 만들지 않는다. 데이터 원본은 EpisodeRead(Story View/Complete, 기존과 동일한
 * completedAt 정의)와 신규 SceneReach(Scene 2 이상 최초 도달, additive 테이블)뿐이다.
 */
export default async function StoryAnalyticsPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId } = await params;
  const { from, to } = await searchParams;

  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, name: true } });
  if (!space) notFound();

  const now = new Date();
  const earliestRecordDate = await getEarliestRecordDate(spaceId);
  const allTimeStart = earliestRecordDate ?? now;
  const range = resolveDateRange(from, to, allTimeStart, now);
  const activePreset = detectActivePreset(range.from, range.to, now, allTimeStart);

  const episodes = await getStoryDepthForSpace(spaceId, range.start, range.end);

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / REPORT / STORY</p>
          <Link href="/admin" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>스토리 분석</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          방문자가 이 공간의 이야기(Episode)를 어느 Scene까지 읽고, 어느 구간에서 이탈하는지 확인합니다.
        </p>
      </div>

      <ReportTabs spaceId={space.id} active="story" from={range.from} to={range.to} />

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>기간</p>
          <p className="text-sm font-medium">
            {activePreset ? PRESET_LABEL[activePreset] : "직접 지정"}
            <span style={{ color: "var(--dim)" }}> ({toDotFormat(range.from)} — {toDotFormat(range.to)})</span>
          </p>
        </div>
        <DateRangeFilter from={range.from} to={range.to} activePreset={activePreset} allTimeStart={formatKstDateParam(allTimeStart)} />
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {!earliestRecordDate ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          아직 이 공간에 대한 기록이 없습니다. 첫 방문 기록이 생기면 데이터가 쌓이기 시작합니다.
        </p>
      ) : episodes.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>공개된 Episode가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {episodes.map((ep) => (
            <EpisodeDepthSection key={ep.episodeId} episode={ep} />
          ))}
        </div>
      )}

      <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
        Scene별 도달 데이터는 {toDotFormat(SCENE_DEPTH_LAUNCH_DATE)} 이후 방문부터 집계됩니다. 그 이전 기간을
        조회하면 Scene 단계 값이 실제보다 적게(또는 0으로) 나올 수 있습니다(과거 데이터를 추정해서 채우지
        않았습니다) — Story View/Story Complete는 기존 계측 그대로이므로 영향이 없습니다. 모든 숫자는
        &quot;몇 명&quot;(같은 방문자의 반복 스크롤·새로고침·재방문 중복 제거) 기준입니다.
      </p>
    </main>
  );
}

interface FunnelStage {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
}

function EpisodeDepthSection({ episode }: { episode: EpisodeStoryDepth }) {
  const stages: FunnelStage[] = [
    { key: "view", label: "Story View", value: episode.storyViews },
    ...episode.scenes.map((s) => ({
      key: `scene:${s.sceneId}`,
      label: `Scene ${s.sceneOrder}`,
      sublabel: s.title ?? undefined,
      value: s.reached,
    })),
    { key: "complete", label: "Story Complete", value: episode.storyCompletions },
  ];

  const dropOff = findLargestDropOff(stages.map((s) => ({ key: s.key, value: s.value })));
  const dropOffFrom = dropOff ? stages.find((s) => s.key === dropOff.fromKey) : null;
  const dropOffTo = dropOff ? stages.find((s) => s.key === dropOff.toKey) : null;

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--dim)" }}>
        EP.{episode.episodeNumber} <span style={{ color: "var(--fg)" }}>{episode.episodeTitle}</span>
      </p>

      {episode.storyViews === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>선택한 기간에 이 이야기를 조회한 기록이 없습니다.</p>
      ) : (
        <>
          <div className="flex flex-col">
            {stages.map((stage, i) => {
              const prevValue = i > 0 ? stages[i - 1].value : null;
              const rateLabel = prevValue == null ? null : conversionRateLabel(stage.value, prevValue);
              const widthPct = episode.storyViews > 0 ? Math.min(100, Math.round((stage.value / episode.storyViews) * 100)) : 0;
              return (
                <div key={stage.key}>
                  {rateLabel != null && (
                    <p className="text-xs text-center py-1" style={{ color: "var(--border)" }}>↓ {rateLabel}</p>
                  )}
                  <div className="p-3 border space-y-2" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm">{stage.label}</p>
                        {stage.sublabel && (
                          <p className="text-xs break-keep" style={{ color: "var(--dim)" }}>{stage.sublabel}</p>
                        )}
                      </div>
                      <span className="text-lg font-bold whitespace-nowrap">
                        {stage.value}<span className="text-xs font-normal" style={{ color: "var(--dim)" }}> 명 · {pct(episode.storyViews > 0 ? stage.value / episode.storyViews : 0)}</span>
                      </span>
                    </div>
                    <div className="w-full overflow-hidden" style={{ height: 4, background: "var(--tag-bg)" }}>
                      <div style={{ width: `${widthPct}%`, height: "100%", background: "var(--fg)" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {dropOff && dropOffFrom && dropOffTo && (
            <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
              가장 큰 이탈 구간 — {dropOffFrom.label} → {dropOffTo.label}: -{dropOff.dropCount}명
              {dropOff.dropRate != null && ` (-${pct(dropOff.dropRate)})`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
