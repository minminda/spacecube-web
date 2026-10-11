import { safeConversionRate } from "@/lib/reportMetrics";
import type { DiscoveryStats } from "@/lib/discoveryKpi";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const rateLabel = (cur: number, base: number) => {
  const r = safeConversionRate(cur, base);
  return r == null ? "—" : pct(r);
};

/** KPI 화면의 두 영역(공간 발견 / 공간 방문 이후) 머리말. */
export function KpiAreaHeading({ step, title, caption }: { step: "A" | "B"; title: string; caption: string }) {
  return (
    <div className="space-y-1 pt-2" style={{ borderTop: "2px solid var(--fg)" }}>
      <p className="text-xs uppercase tracking-widest pt-3" style={{ color: "var(--dim)" }}>{step}. {caption}</p>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

/** 명 단위 단계 목록 — base가 있으면 각 단계에 그 기준 대비 비율을, 없으면 직전 단계 대비 비율을 보여준다. */
export function PeopleSteps({ steps, vsFirst }: { steps: { key: string; label: string; value: number; hint?: string }[]; vsFirst?: boolean }) {
  return (
    <div className="flex flex-col">
      {steps.map((step, i) => {
        const base = i === 0 ? null : vsFirst ? steps[0].value : steps[i - 1].value;
        return (
          <div key={step.key}>
            {base != null && (
              <p className="text-xs text-center py-1" style={{ color: "var(--border)" }}>
                ↓ {rateLabel(step.value, base)}{vsFirst ? ` · ${steps[0].label} 대비` : ""}
              </p>
            )}
            <div className="flex items-center justify-between p-3 border" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm">
                {step.label}
                {step.hint && <span className="text-xs" style={{ color: "var(--dim)" }}> · {step.hint}</span>}
              </span>
              <span className="text-lg font-bold">{step.value}<span className="text-xs font-normal" style={{ color: "var(--dim)" }}> 명</span></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A. 공간 발견 — 상세 조회 · 저장 · 지도 클릭, 그리고 지도 클릭 → 7일 안 QR 스캔(방문 의도 → 실제 방문). */
export function DiscoverySection({ stats, scopeLabel }: { stats: DiscoveryStats; scopeLabel: "space" | "service" }) {
  const unit = scopeLabel === "service" ? "방문자×공간" : "명";
  return (
    <div className="space-y-4">
      <PeopleSteps
        vsFirst
        steps={[
          { key: "view", label: "Space Detail View", value: stats.viewVisitors },
          { key: "save", label: "Save", value: stats.saveUsers, hint: "로그인 사용자" },
          { key: "map", label: "Map Click", value: stats.mapClickVisitors, hint: scopeLabel === "service" ? unit : undefined },
        ]}
      />
      <div className="flex items-center justify-between p-3 border" style={{ borderColor: "var(--fg)" }}>
        <span className="text-sm">
          Map Click → 7일 안 QR 스캔
          <span className="text-xs" style={{ color: "var(--dim)" }}> · 방문 의도 → 실제 방문</span>
        </span>
        <span className="text-lg font-bold">
          {stats.mapToScanConverted}<span className="text-xs font-normal" style={{ color: "var(--dim)" }}> / {stats.mapClickVisitors} ({rateLabel(stats.mapToScanConverted, stats.mapClickVisitors)})</span>
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
        모두 &quot;몇 명&quot;(중복 제거) 기준입니다. 조회·지도 클릭은 같은 방문자·공간·종류를 30분 안에 다시 보내면 기록하지 않고(새로고침 방지),
        집계에서 한 번 더 고유 방문자로 셉니다(조회 기록 {stats.viewEvents}건 · 지도 클릭 기록 {stats.mapClickEvents}건). 저장은 기존 저장 데이터(저장 취소한 건 제외, 저장한 시각 기준)를 그대로 씁니다.
        7일 연결은 로그인했다면 계정, 아니면 같은 브라우저(sc_anon_id, 12시간 유지)로만 이어집니다 — 클릭 뒤 7일이 아직 지나지 않았거나, 쿠키가 만료·삭제되면 실제보다 적게 나옵니다.
        Discovery 계측은 이 기능 배포 이후 데이터부터 쌓입니다. 관리자·시연 계정과 시연 공간은 제외됩니다.
      </p>
    </div>
  );
}
