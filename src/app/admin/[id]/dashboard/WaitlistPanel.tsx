"use client";

import { useCallback, useEffect, useState } from "react";

interface Entry {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

interface Props {
  spaceId: string;
  spaceSlug: string;
  initialFullyBooked: boolean;
}

export default function WaitlistPanel({ spaceId, spaceSlug, initialFullyBooked }: Props) {
  const [isFullyBooked, setIsFullyBooked] = useState(initialFullyBooked);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [toggling, setToggling] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`/api/waitlist?spaceId=${spaceId}`);
    if (res.ok) setEntries(await res.json());
  }, [spaceId]);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 30_000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  async function toggleFull() {
    setToggling(true);
    const res = await fetch(`/api/spaces/${spaceId}/full`, { method: "PATCH" });
    if (res.ok) {
      const data = await res.json();
      setIsFullyBooked(data.isFullyBooked);
    }
    setToggling(false);
  }

  async function removeEntry(id: string) {
    setRemoving(id);
    await fetch(`/api/waitlist/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setRemoving(null);
  }

  const waitlistUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/space/${spaceSlug}/waitlist`;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 대기 관리</p>
        <button
          onClick={toggleFull}
          disabled={toggling}
          className="text-xs px-3 py-1.5 border transition-colors disabled:opacity-40"
          style={
            isFullyBooked
              ? { borderColor: "var(--fg)", background: "var(--fg)", color: "var(--bg)" }
              : { borderColor: "var(--border)", color: "var(--dim)" }
          }
        >
          {toggling ? "…" : isFullyBooked ? "● 만석" : "○ 여유 있음"}
        </button>
      </div>

      {isFullyBooked && (
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          NFC / QR 링크&nbsp;
          <span
            className="underline cursor-pointer"
            onClick={() => navigator.clipboard?.writeText(waitlistUrl)}
            title="클릭하면 복사됩니다"
          >
            {waitlistUrl}
          </span>
        </p>
      )}

      {entries.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          {isFullyBooked ? "아직 대기자가 없습니다." : "만석 상태가 아닙니다."}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--dim)" }}>대기 중 — {entries.length}명</p>
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-4 py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs flex-shrink-0" style={{ color: "var(--dim)" }}>{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-xs" style={{ color: "var(--dim)" }}>{entry.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`tel:${entry.phone.replace(/-/g, "")}`}
                  className="text-xs px-3 py-1.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  전화
                </a>
                <button
                  onClick={() => removeEntry(entry.id)}
                  disabled={removing === entry.id}
                  className="text-xs px-2 py-1.5 border transition-colors disabled:opacity-40"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                  title="대기 완료 처리"
                >
                  {removing === entry.id ? "…" : "✕"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
