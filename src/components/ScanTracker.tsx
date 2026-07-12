"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ScanTracker({ spaceId }: { spaceId: string }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("src") !== "qr") return;
    // logged=1: 큐브(/c/[code]) 경유 방문은 그 경로에서 이미 SpaceScan을 기록했으므로
    // 여기서 또 남기면 같은 방문이 두 번 집계된다 — 건너뛴다.
    if (searchParams.get("logged") === "1") return;
    fetch("/api/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId }),
    }).catch(() => {/* silent */});
  }, [spaceId, searchParams]);

  return null;
}
