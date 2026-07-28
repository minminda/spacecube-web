"use client";

import { useEffect, useRef } from "react";

interface Props {
  episodeId: string;
  enabled: boolean;
}

/**
 * 스토리 완독/체류시간 계측 — 화면엔 보이지 않는 1px 감시 지점만 렌더한다.
 * 완독 판정은 이 컴포넌트가 스토리 본문의 맨 아래(마지막 Scene 다음)에 렌더된다는 전제로,
 * 감시 지점이 뷰포트에 한 번이라도 들어오면 "마지막 섹션까지 스크롤"로 본다.
 * 체류시간은 페이지를 벗어나는 시점(tab 전환/닫기/이동)에 한 번만 sendBeacon으로 보고한다.
 */
export default function StoryReadTracker({ episodeId, enabled }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const reachedEndRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const sentRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) reachedEndRef.current = true;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const send = () => {
      if (sentRef.current) return;
      sentRef.current = true;
      const durationMs = Date.now() - startedAtRef.current;
      const payload = JSON.stringify({ durationMs, completed: reachedEndRef.current });
      const url = `/api/episode-reads/${episodeId}/finish`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
      } else {
        fetch(url, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") send();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", send);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", send);
    };
  }, [enabled, episodeId]);

  return <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />;
}
