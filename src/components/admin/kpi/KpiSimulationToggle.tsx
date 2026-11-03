"use client";

import { useState } from "react";
import { adminButtonClass } from "@/components/admin/ui";

/** 졸업전시 KPI 시뮬레이션 켜기/끄기(관리자 전용 API 호출, 쿠키만 바뀜 — DB 무변경). */
export default function KpiSimulationToggle({ active }: { active: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kpi-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !active }),
      });
      if (res.ok) {
        // 쿠키가 바뀐 직후엔 클라이언트 라우터 캐시 대신 문서를 새로 불러와 서버가 새 쿠키로 다시 그리게 한다.
        window.location.reload();
        return;
      }
      setError(res.status === 401 ? "관리자 로그인이 필요합니다. 다시 로그인해 주세요." : `시연 모드를 바꾸지 못했습니다 (${res.status}).`);
    } catch {
      setError("네트워크 오류로 시연 모드를 바꾸지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-3 flex-wrap">
    <button type="button" onClick={toggle} disabled={busy} className={adminButtonClass(active ? "secondary" : "ghost", "sm")}>
      {active ? "시연 모드 끄기 (실데이터 보기)" : "졸업전시 시연 모드 켜기"}
    </button>
    {error && <span className="text-xs" style={{ color: "#a1271b" }}>{error}</span>}
    </span>
  );
}
