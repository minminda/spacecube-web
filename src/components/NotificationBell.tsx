"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/time";

interface NotificationItem {
  id: string;
  type: "LIKE" | "COMMENT";
  isRead: boolean;
  createdAt: string;
  senderNickname: string;
  commentPreview: string | null;
  url: string;
}

function messageFor(n: NotificationItem): string {
  if (n.type === "LIKE") return `${n.senderNickname}님이 회원님의 방명록에 공감했습니다`;
  return `${n.senderNickname}님이 댓글을 남겼습니다`;
}

/* 아카이브 상단 알림 벨 — SNS 피드가 아니라 "내 흔적에 새 반응이 생겼다" 정도만 알려주는
   차분한 목적이라 실시간 폴링 없이 클릭 시점에만 조회한다. 열면 그 시점의 미읽음을 전부 읽음 처리. */
export default function NotificationBell({ initialUnreadCount }: { initialUnreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function togglePanel() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const [listRes] = await Promise.all([
          fetch("/api/notifications"),
          fetch("/api/notifications/read-all", { method: "POST" }),
        ]);
        if (listRes.ok) {
          const data = await listRes.json();
          setItems(data.notifications);
        }
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={togglePanel} className="relative text-sm" style={{ color: "var(--dim)" }} aria-label="알림">
        🔔
        {unreadCount > 0 && (
          <span
            className="absolute -top-1.5 -right-2.5 text-[10px] px-1 min-w-[1rem] text-center leading-tight rounded-full"
            style={{ background: "var(--fg)", color: "var(--bg)" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto z-50 border p-3 space-y-3"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}
          >
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>알림</p>
            {loading ? (
              <p className="text-xs" style={{ color: "var(--dim)" }}>불러오는 중...</p>
            ) : !items || items.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--dim)" }}>아직 알림이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.url}
                    onClick={() => setOpen(false)}
                    className="block space-y-1 pb-3"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <p className="text-xs leading-relaxed">{messageFor(n)}</p>
                    {n.type === "COMMENT" && n.commentPreview && (
                      <p className="text-xs" style={{ color: "var(--dim)" }}>&ldquo;{n.commentPreview}&rdquo;</p>
                    )}
                    <p className="text-[10px]" style={{ color: "var(--border)" }}>{formatRelativeTime(new Date(n.createdAt))}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
