"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  content: string;
  nickname: string | null;
  createdAt: string;
  reactionCount: number;
  reactedByMe: boolean;
}

export default function ArchiveSessionView({ notes: initialNotes, isLoggedIn }: { notes: Note[]; isLoggedIn: boolean }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [openId, setOpenId] = useState<string | null>(null);
  const openNote = notes.find((n) => n.id === openId) ?? null;

  async function toggleReaction(noteId: string) {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const res = await fetch(`/api/guestbook/${noteId}/reactions`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, reactionCount: data.reactionCount, reactedByMe: data.reacted } : n)));
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => setOpenId(note.id)}
            className="text-left p-3 space-y-2 transition-transform hover:-translate-y-0.5"
            style={{ background: "#F6E7A8", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <p className="text-[13px] leading-relaxed break-keep line-clamp-3" style={{ color: "#3d3524" }}>{note.content}</p>
            <p className="text-[10px]" style={{ color: "#8a7d5c" }}>
              — {note.nickname ?? "익명"} · {note.createdAt}{note.reactionCount > 0 ? ` · 공감 ${note.reactionCount}` : ""}
            </p>
          </button>
        ))}
      </div>

      {openNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}
        >
          <div className="w-full max-w-xs p-6" style={{ background: "#F6E7A8", boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
            <p className="text-base leading-relaxed break-keep" style={{ color: "#3d3524" }}>{openNote.content}</p>
            <p className="text-sm mt-3" style={{ color: "#8a7d5c" }}>— {openNote.nickname ?? "익명"} · {openNote.createdAt}</p>
            <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.12)" }}>
              <button
                type="button"
                onClick={() => toggleReaction(openNote.id)}
                className="flex-1 text-xs py-2 border"
                style={{ borderColor: "#3d3524", color: "#3d3524", background: openNote.reactedByMe ? "rgba(61,53,36,0.15)" : "transparent" }}
              >
                공감 {openNote.reactionCount > 0 ? openNote.reactionCount : ""}
              </button>
              <button type="button" onClick={() => setOpenId(null)} className="flex-1 text-xs py-2 border" style={{ borderColor: "#3d3524", color: "#3d3524" }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
