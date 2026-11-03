"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminButtonClass } from "@/components/admin/ui";

/** 졸업전시 KPI 시뮬레이션 켜기/끄기(관리자 전용 API 호출, 쿠키만 바뀜 — DB 무변경). */
export default function KpiSimulationToggle({ active }: { active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/kpi-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !active }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} className={adminButtonClass(active ? "secondary" : "ghost", "sm")}>
      {active ? "시연 모드 끄기 (실데이터 보기)" : "졸업전시 시연 모드 켜기"}
    </button>
  );
}
