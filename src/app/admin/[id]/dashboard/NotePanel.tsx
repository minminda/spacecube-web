"use client";

import { useState } from "react";

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface Props {
  spaceId: string;
  initialNote: Note | null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function NotePanel({ spaceId, initialNote }: Props) {
  const [latestNote, setLatestNote] = useState<Note | null>(initialNote);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!input.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/spaces/${spaceId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input.trim() }),
    });
    if (res.ok) {
      const note = await res.json();
      setLatestNote(note);
      setInput("");
    }
    setSaving(false);
  }

  return (
    <section className="space-y-4">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 공간 노트</p>

      {/* 최신 노트 */}
      {latestNote ? (
        <div className="space-y-1">
          <p
            className="text-sm leading-relaxed pl-3"
            style={{ borderLeft: "2px solid var(--border)", color: "var(--fg)" }}
          >
            &ldquo;{latestNote.content}&rdquo;
          </p>
          <p className="text-xs pl-3" style={{ color: "var(--border)" }}>
            {formatDate(latestNote.createdAt)}
          </p>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--border)" }}>
          아직 작성한 노트가 없습니다.
        </p>
      )}

      {/* 새 노트 입력 */}
      <div className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"오늘의 공간을 한 문장으로 남겨보세요.\n예) 오늘은 비가 와서 유난히 조용하네요."}
          maxLength={200}
          rows={3}
          className="w-full bg-transparent border px-3 py-2.5 text-xs outline-none focus:border-[var(--fg)] transition-colors resize-none"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--border)" }}>{input.length}/200</span>
          <button
            onClick={save}
            disabled={saving || !input.trim()}
            className="text-xs px-3 py-1.5 border transition-colors disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            {saving ? "저장 중…" : "노트 남기기"}
          </button>
        </div>
      </div>
    </section>
  );
}
