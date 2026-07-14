"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface GuestbookCommentData {
  id: string;
  userId: string;
  nickname: string | null;
  content: string;
  createdAt: string; // ISO
}

const MAX_CONTENT = 200;

function formatDots(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  noteId: string;
  initialCount: number;
  isLoggedIn: boolean;
  currentUserId: string | null;
  ink?: string;
  inkDim?: string;
  /** 이번 방문에 이미 답글을 남겼으면(어느 포스트잇이든) 작성창 대신 이 안내 문구를 보여준다 */
  disabledReason?: string;
  /** 이 스레드에 댓글 작성이 성공했을 때 호출 — 다른 포스트잇의 작성창도 함께 잠그기 위한 훅 */
  onCommentPosted?: () => void;
}

/* 포스트잇 하단에 붙는 1단계 댓글 스레드 — 대댓글 없음, 본인 댓글만 수정/삭제 가능.
   방문자용 캔버스 오버레이·아카이브 상세 모달 양쪽에서 공용으로 쓴다. */
export default function GuestbookCommentThread({
  noteId,
  initialCount,
  isLoggedIn,
  currentUserId,
  ink = "#3d3524",
  inkDim = "#8a7d5c",
  disabledReason,
  onCommentPosted,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [comments, setComments] = useState<GuestbookCommentData[]>([]);
  const [count, setCount] = useState(initialCount);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) {
      const res = await fetch(`/api/guestbook/${noteId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
        setCount(data.comments.length);
      }
      setLoaded(true);
    }
  }

  async function submit() {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (disabledReason) return;
    const text = draft.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guestbook/${noteId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) return;
      const created = await res.json();
      setComments((prev) => [...prev, created]);
      setCount((c) => c + 1);
      setDraft("");
      onCommentPosted?.();
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(c: GuestbookCommentData) {
    setEditingId(c.id);
    setEditDraft(c.content);
  }

  async function saveEdit(commentId: string) {
    const text = editDraft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/guestbook/${noteId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) return;
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, content: text } : c)));
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(commentId: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/guestbook/${noteId}/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) return;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCount((c) => Math.max(0, c - 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={toggle} className="text-xs" style={{ color: inkDim }}>
        댓글 보기 ({count})
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs" style={{ color: inkDim }}>아직 댓글이 없습니다.</p>
          ) : (
            <div className="space-y-2.5">
              {comments.map((c) => (
                <div key={c.id} className="space-y-0.5">
                  {editingId === c.id ? (
                    <div className="space-y-1.5">
                      <textarea
                        autoFocus
                        value={editDraft}
                        onChange={(e) => { if (e.target.value.length <= MAX_CONTENT) setEditDraft(e.target.value); }}
                        rows={2}
                        className="w-full text-xs p-2 resize-none outline-none"
                        style={{ background: "rgba(255,255,255,0.45)", color: ink }}
                      />
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setEditingId(null)} className="text-[11px]" style={{ color: inkDim }}>취소</button>
                        <button type="button" onClick={() => saveEdit(c.id)} disabled={busy} className="text-[11px] font-medium" style={{ color: ink }}>저장</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs leading-relaxed break-keep" style={{ color: ink }}>{c.content}</p>
                      <div className="flex items-center gap-2 text-[10px]" style={{ color: inkDim }}>
                        <span>{c.nickname ?? "익명"}</span>
                        <span>·</span>
                        <span>{formatDots(c.createdAt)}</span>
                        {c.userId === currentUserId && (
                          <>
                            <button type="button" onClick={() => startEdit(c)} className="underline underline-offset-2">수정</button>
                            <button type="button" onClick={() => remove(c.id)} className="underline underline-offset-2">삭제</button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {disabledReason ? (
            <p className="text-xs leading-relaxed pt-1" style={{ color: inkDim }}>{disabledReason}</p>
          ) : (
            <div className="space-y-1.5 pt-1">
              <textarea
                value={draft}
                onChange={(e) => { if (e.target.value.length <= MAX_CONTENT) setDraft(e.target.value); }}
                placeholder={isLoggedIn ? "댓글을 남겨보세요." : "로그인하면 댓글을 남길 수 있어요."}
                rows={2}
                className="w-full text-xs p-2 resize-none outline-none"
                style={{ background: "rgba(255,255,255,0.45)", color: ink }}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={submit}
                  disabled={!draft.trim() || submitting}
                  className="text-xs px-3 py-1 border disabled:opacity-40"
                  style={{ borderColor: ink, color: ink }}
                >
                  {submitting ? "등록 중..." : "등록"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
