"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDotDate } from "@/lib/time";
import { CLUSTER_LABELS } from "@/lib/guestbookClusterStyle";

interface Note {
  id: string;
  content: string;
  nickname: string | null;
  clusterType: string;
  createdAt: string;
  reactionCount: number;
  isHidden: boolean;
  isActive: boolean;
}

type Mode = "newest" | "oldest" | "hidden";

const MODES: { key: Mode; label: string }[] = [
  { key: "newest", label: "최신순" },
  { key: "oldest", label: "오래된 순" },
  { key: "hidden", label: "숨김된 글" },
];

export default function GuestbookManageList({ spaceId, notes }: { spaceId: string; notes: Note[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("newest");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const sorted = [...notes].sort((a, b) =>
      mode === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
    );
    return mode === "hidden" ? sorted.filter((n) => n.isHidden) : sorted;
  }, [notes, mode]);

  const openNote = notes.find((n) => n.id === openId) ?? null;

  async function toggleHidden(id: string, next: boolean) {
    setBusyId(id);
    await fetch(`/api/operator/spaces/${spaceId}/guestbook-notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: next }),
    });
    setBusyId(null);
    router.refresh();
  }

  async function deleteNote(id: string) {
    setBusyId(id);
    await fetch(`/api/operator/spaces/${spaceId}/guestbook-notes/${id}`, { method: "DELETE" });
    setBusyId(null);
    setConfirmDeleteId(null);
    setOpenId(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className="text-xs px-3 py-1.5 border transition-colors"
            style={{
              borderColor: mode === m.key ? "var(--fg)" : "var(--border)",
              background: mode === m.key ? "var(--fg)" : "transparent",
              color: mode === m.key ? "var(--bg)" : "var(--dim)",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>표시할 기록이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setOpenId(note.id)}
              className="text-left p-3 border space-y-1.5 transition-colors"
              style={{ borderColor: "var(--border)", opacity: note.isHidden ? 0.5 : 1 }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] px-1.5 py-0.5" style={{ background: "var(--border)", color: "var(--dim)" }}>
                  {CLUSTER_LABELS[note.clusterType] ?? note.clusterType}
                </span>
                {!note.isActive && (
                  <span className="text-[10px] px-1.5 py-0.5" style={{ border: "1px solid var(--border)", color: "var(--dim)" }}>
                    지난 방명록
                  </span>
                )}
                {note.isHidden && (
                  <span className="text-[10px] px-1.5 py-0.5" style={{ border: "1px solid var(--border)", color: "var(--dim)" }}>
                    숨김
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed break-keep line-clamp-2">{note.content}</p>
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                {note.nickname ?? "익명"} · {formatDotDate(note.createdAt)} · 공감 {note.reactionCount}
              </p>
            </button>
          ))}
        </div>
      )}

      {openNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}
        >
          <div className="w-full max-w-sm p-6 space-y-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5" style={{ background: "var(--border)", color: "var(--dim)" }}>
                {CLUSTER_LABELS[openNote.clusterType] ?? openNote.clusterType}
              </span>
              {openNote.isHidden && (
                <span className="text-[10px] px-1.5 py-0.5" style={{ border: "1px solid var(--border)", color: "var(--dim)" }}>
                  숨김
                </span>
              )}
            </div>
            <p className="text-base leading-relaxed break-keep">{openNote.content}</p>
            <p className="text-sm" style={{ color: "var(--dim)" }}>
              {openNote.nickname ?? "익명"} · {formatDotDate(openNote.createdAt)} · 공감 {openNote.reactionCount}
            </p>

            <div className="flex gap-2 flex-wrap pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                disabled={busyId === openNote.id}
                onClick={() => toggleHidden(openNote.id, !openNote.isHidden)}
                className="flex-1 text-xs py-2.5 border transition-colors disabled:opacity-40"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {busyId === openNote.id ? "처리 중..." : openNote.isHidden ? "숨김 해제" : "숨김"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(openNote.id)}
                className="flex-1 text-xs py-2.5 border transition-colors"
                style={{ borderColor: "var(--border)", color: "#f66" }}
              >
                삭제
              </button>
            </div>
            <button type="button" onClick={() => setOpenId(null)} className="w-full text-xs py-2" style={{ color: "var(--dim)" }}>
              닫기
            </button>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-8"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteId(null); }}
        >
          <div className="w-full max-w-xs p-6 space-y-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <p className="text-sm leading-relaxed">
              이 방명록을 삭제하시겠어요?<br />삭제하면 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={busyId === confirmDeleteId}
                className="flex-1 text-xs py-2 border"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => deleteNote(confirmDeleteId)}
                disabled={busyId === confirmDeleteId}
                className="flex-1 text-xs py-2 border"
                style={{ borderColor: "#f66", color: "#f66" }}
              >
                {busyId === confirmDeleteId ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
