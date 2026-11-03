import { StatusBadge } from "@/components/admin/ui";
import { toDotFormat } from "@/lib/reportDateRange";
import { SIM_DAYS, type SimulatedSpaceScans } from "@/lib/kpiSimulation";

/** 시연 데이터임을 알리는 배너 — 시뮬레이션이 켜진 모든 관리자 화면 맨 위에 둔다. */
export function SimulationBanner() {
  return (
    <div className="no-print flex items-start gap-3 border px-4 py-3 text-xs leading-relaxed" style={{ borderColor: "#e0a030", background: "#fff6e6", color: "#8a5a00" }}>
      <StatusBadge tone="draft">시연 데이터</StatusBadge>
      <p>
        졸업전시용 예시 데이터입니다. 아래 &quot;시연&quot; 표시가 붙은 QR 스캔 수·추이는 실제 기록이 아니며 DB에 저장되지 않습니다. 시연 모드를 끄면 실제 KPI만 표시됩니다.
      </p>
    </div>
  );
}

function TrendBars({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-[2px]" style={{ height: 64 }}>
        {data.map((d) => (
          <div
            key={d.date}
            title={`${toDotFormat(d.date)} · ${d.count}회 (시연)`}
            className="flex-1"
            style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`, background: d.count > 0 ? "var(--fg)" : "var(--border)" }}
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

/** 공간 하나의 시연 QR 스캔(합계 + 최근 30일 추이 + 시연 대상 공간끼리 비교). */
export function SimulatedQrSection({ sim, spaceId, spaceName, excludedNames }: { sim: SimulatedSpaceScans[]; spaceId: string; spaceName: string; excludedNames: string[] }) {
  const mine = sim.find((s) => s.spaceId === spaceId);
  if (!mine) {
    return (
      <section className="no-print space-y-2">
        <div className="flex items-center gap-2">
          <StatusBadge tone="live">실데이터</StatusBadge>
          <p className="text-sm font-medium">{spaceName}</p>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          {excludedNames.includes(spaceName) ? "이 공간은 시연 대상에서 제외되어 실제 KPI를 그대로 표시합니다." : "이 공간은 시연 대상(운영 중인 실제 공간)이 아니라 실제 KPI를 그대로 표시합니다."}
        </p>
      </section>
    );
  }
  const maxTotal = Math.max(...sim.map((s) => s.total));
  return (
    <section className="no-print space-y-5">
      <div className="flex items-center gap-2">
        <StatusBadge tone="draft">시연 데이터</StatusBadge>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>QR 스캔 — 최근 {SIM_DAYS}일</p>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold leading-none tabular-nums">{mine.total}</p>
        <span className="text-sm" style={{ color: "var(--dim)" }}>회 (시연)</span>
      </div>
      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>최근 30일 일별 QR 스캔 추이 (시연)</p>
        <TrendBars data={mine.daily} />
      </div>
      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>공간별 비교 (시연)</p>
        <div className="flex flex-col gap-1.5">
          {[...sim].sort((a, b) => b.total - a.total).map((s) => (
            <div key={s.spaceId} className="flex items-center gap-3 text-xs">
              <span className={`w-28 truncate ${s.spaceId === spaceId ? "font-semibold" : ""}`}>{s.name}</span>
              <div className="flex-1 h-2" style={{ background: "var(--border)" }}>
                <div className="h-full" style={{ width: `${(s.total / maxTotal) * 100}%`, background: s.spaceId === spaceId ? "var(--fg)" : "#9a9a9a" }} />
              </div>
              <span className="w-8 text-right tabular-nums">{s.total}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--dim)" }}>
        계산 근거: 시연 대상 공간마다 고정 seed로 30일 합계(15~30회)를 정하고 날짜에 흩뿌린 값입니다. 스토리 조회·완독·방명록·취향 등 다른 지표는 시뮬레이션하지 않으며 아래 값은 모두 실제 기록입니다.
      </p>
    </section>
  );
}
