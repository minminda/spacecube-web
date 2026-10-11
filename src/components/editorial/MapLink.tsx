"use client";

import type { ReactNode } from "react";

/** "지도에서 보기" 링크 — 새 탭으로 열면서 MAP_CLICK을 기록한다(keepalive라 이동 중에도 전송). track=false면 기록하지 않는다. */
export default function MapLink({ href, spaceId, track, className, children }: { href: string; spaceId: string; track: boolean; className?: string; children: ReactNode }) {
  function onClick() {
    if (!track) return;
    fetch("/api/discovery-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId, type: "MAP_CLICK" }),
      keepalive: true,
    }).catch(() => {/* silent */});
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
      {children}
    </a>
  );
}
