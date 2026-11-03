import { StatusBadge } from "@/components/admin/ui";

/** 시연 모드가 켜진 관리자 KPI 화면 맨 위 안내(인쇄 시 숨김). */
export function SimulationBanner() {
  return (
    <div className="no-print flex items-start gap-3 border px-4 py-3 text-xs leading-relaxed" style={{ borderColor: "#e0a030", background: "#fff6e6", color: "#8a5a00" }}>
      <StatusBadge tone="draft">시연 데이터</StatusBadge>
      <p>시연 데이터 — 전시를 위한 QR 스캔 예시 수치가 적용되어 있습니다. &quot;시연&quot; 표시가 붙은 값만 예시이고, 그 외 지표는 실제 기록입니다.</p>
    </div>
  );
}

/** 시연 값 옆에 붙이는 작은 표시. */
export function SimTag() {
  return <span className="ml-1.5 align-middle"><StatusBadge tone="draft">시연</StatusBadge></span>;
}
