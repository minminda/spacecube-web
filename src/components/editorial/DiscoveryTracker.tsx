"use client";

import { useEffect } from "react";

/** 공간 상세 조회(SPACE_VIEW) 1회 기록 — 서버가 30분 안 중복을 거른다. 임시(fixture) 공간은 렌더하지 않는다. */
export default function DiscoveryTracker({ spaceId }: { spaceId: string }) {
  useEffect(() => {
    fetch("/api/discovery-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId, type: "SPACE_VIEW" }),
      keepalive: true,
    }).catch(() => {/* silent */});
  }, [spaceId]);
  return null;
}
