import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getKpiExcludedUserIds } from "@/lib/demoData";
import { getDiscoveryStats, getServiceOnsiteStats } from "@/lib/discoveryKpi";
import { presetDateRange, parseKstDateStart, toDotFormat, type DateRangePreset } from "@/lib/reportDateRange";
import { DiscoverySection, KpiAreaHeading, PeopleSteps } from "@/components/admin/kpi/DiscoveryKpi";
import { AdminPageHeader, AdminTable, EmptyState, StatusBadge, adminButtonClass } from "@/components/admin/ui";

const DAY = 24 * 60 * 60 * 1000;

/** n일 전 시각 — 요청 시점 기준(서버 컴포넌트, 렌더마다 새로 계산). */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

/**
 * KPI / 리포트 — 운영 공간 선택 화면. 정식 KPI(방문자 퍼널·기간 조회·PDF)는 기존 공간별
 * 리포트(/admin/[id]/report)에 그대로 있다. 여기서는 공간을 고르기 위한 참고 수치(최근 30일
 * QR 스캔 수, 로그인한 관리자 제외)만 읽기 전용으로 보여준다.
 */
const SERVICE_RANGES: { value: Exclude<DateRangePreset, "today">; label: string }[] = [
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
  { value: "all", label: "전체" },
];

export default async function AdminReportsIndexPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { range: rangeParam } = await searchParams;
  const preset = SERVICE_RANGES.find((r) => r.value === rangeParam)?.value ?? "30d";
  const now = new Date();
  const picked = presetDateRange(preset, now, new Date("2026-01-01T00:00:00+09:00"));
  const rangeStart = parseKstDateStart(picked.from) as Date;
  const rangeEnd = new Date((parseKstDateStart(picked.to) as Date).getTime() + DAY);
  const [discovery, onsite] = await Promise.all([getDiscoveryStats("all", rangeStart, rangeEnd), getServiceOnsiteStats(rangeStart, rangeEnd)]);

  const since = daysAgo(30);
  const adminIds = [...(await getKpiExcludedUserIds())];
  const notAdmin = adminIds.length > 0 ? { OR: [{ userId: null }, { userId: { notIn: adminIds } }] } : {};

  const [spaces, scanGroups] = await Promise.all([
    prisma.space.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, isActive: true, isDemo: true, district: true } }),
    prisma.spaceScan.groupBy({ by: ["spaceId"], where: { scannedAt: { gte: since }, ...notAdmin }, _count: { _all: true } }),
  ]);
  const scansBySpace = new Map(scanGroups.map((g) => [g.spaceId, g._count._all]));

  return (
    <>
      <AdminPageHeader
        area="cube"
        title="KPI / 리포트"
        description=""
      />
      <section className="space-y-5 mb-10">
        <div className="space-y-2">
          <p className="text-sm font-semibold">서비스 전체 흐름 <span className="font-normal" style={{ color: "var(--a-dim)" }}>({toDotFormat(picked.from)} — {toDotFormat(picked.to)}, KST)</span></p>
          <div className="flex gap-2">
            {SERVICE_RANGES.map((r) => (
              <Link key={r.value} href={`/admin/reports?range=${r.value}`} className={adminButtonClass(r.value === preset ? "secondary" : "ghost", "sm")}>{r.label}</Link>
            ))}
          </div>
        </div>
        <KpiAreaHeading step="A" caption="공간 발견 이전 · Discovery" title="공간 발견 — 공개 공간을 찾아보고 방문을 고려했나" />
        <DiscoverySection stats={discovery} scopeLabel="service" />
        <KpiAreaHeading step="B" caption="공간 방문 이후 · On-site Experience" title="공간 방문 이후 — 실제로 와서 어디까지 경험했나" />
        <PeopleSteps
          steps={[
            { key: "qr", label: "QR Scan", value: onsite.qrVisitors },
            { key: "view", label: "Story View", value: onsite.storyViewers },
            { key: "complete", label: "Story Complete", value: onsite.storyCompleters },
            { key: "record", label: "Record", value: onsite.recordUsers },
          ]}
        />
        <p className="text-xs leading-relaxed" style={{ color: "var(--a-faint)" }}>
          모두 &quot;몇 명&quot;(중복 제거) 기준이며 시연 공간 · 관리자 · 더미 계정은 제외됩니다. 방명록 · 재방문 등 세부 단계는 아래 공간별 리포트에서 확인하세요.
        </p>
      </section>
      {spaces.length === 0 ? (
        <EmptyState title="운영 공간이 없습니다" />
      ) : (
        <AdminTable head={["운영 공간", "지역", "QR 스캔 · 30일", ""]} minWidth={600}>
          {spaces.map((s) => (
            <tr key={s.id}>
              <td>
                <Link href={`/admin/${s.id}/report`} className="font-semibold hover:underline underline-offset-4">{s.name}</Link>
                {!s.isActive && <span className="ml-2"><StatusBadge tone="off">비공개</StatusBadge></span>}
                {s.isDemo && <span className="ml-2"><StatusBadge tone="draft">시연</StatusBadge></span>}
              </td>
              <td style={{ color: "var(--a-dim)" }}>{s.district ?? "—"}</td>
              <td className="tabular-nums">{scansBySpace.get(s.id) ?? 0}</td>
              <td className="text-right space-x-1 whitespace-nowrap">
                <Link href={`/admin/${s.id}/report/story`} className={adminButtonClass("ghost", "sm")}>스토리 분석</Link>
                <Link href={`/admin/${s.id}/report`} className={adminButtonClass("secondary", "sm")}>리포트 열기</Link>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
      <p className="mt-3 text-[11px]" style={{ color: "var(--a-faint)" }}>QR 스캔 수는 원시 스캔 기준이며 로그인한 관리자 계정·더미 계정만 제외됩니다. 시연 공간은 Overview 합계에서 빠집니다. 정식 지표는 각 리포트의 방문자 퍼널을 기준으로 하세요.</p>
    </>
  );
}
