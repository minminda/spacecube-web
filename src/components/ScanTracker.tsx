"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ScanTracker({ spaceId }: { spaceId: string }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("src") !== "qr") return;
    fetch("/api/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId }),
    }).catch(() => {/* silent */});
  }, [spaceId, searchParams]);

  return null;
}
