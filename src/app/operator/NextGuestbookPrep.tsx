"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  spaceId: string;
  hasDraft: boolean;
  initialDraft: { question1: string | null; question2: string | null };
}

export default function NextGuestbookPrep({ spaceId, hasDraft, initialDraft }: Props) {
  const router = useRouter();
  const [question1, setQuestion1] = useState(initialDraft.question1 ?? "");
  const [question2, setQuestion2] = useState(initialDraft.question2 ?? "");
  const [draftExists, setDraftExists] = useState(hasDraft);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle = { background: "var(--bg)", color: "var(--fg)", borderColor: "var(--border)", outline: "none" };

  async function saveDraft() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/operator/spaces/${spaceId}/guestbook/draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question1, question2 }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("저장에 실패했습니다.");
      return;
    }
    setDraftExists(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function startNewSession() {
    setActivating(true);
    setError(null);
    const res = await fetch(`/api/operator/spaces/${spaceId}/guestbook/activate`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setActivating(false);
    if (!res.ok) {
      setError(data.error ?? "시작에 실패했습니다.");
      return;
    }
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 다음 방명록 준비</p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          방문자가 방명록을 쓸 때 참고할 글감이에요. 강요가 아니라, 글을 시작하기 위한 힌트예요.
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-3 py-2.5 border" style={{ borderColor: "var(--border)", opacity: 0.6 }}>
          <span aria-hidden>■</span>
          <span className="text-sm">자유롭게 남겨주세요.</span>
          <span className="text-xs ml-auto" style={{ color: "var(--dim)" }}>고정</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs" style={{ color: "var(--dim)" }}>질문 1</label>
          <input
            value={question1}
            onChange={(e) => setQuestion1(e.target.value)}
            placeholder="오늘 가장 기억에 남는 순간은?"
            className="w-full text-sm px-3 py-2.5 border"
            style={inputStyle}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs" style={{ color: "var(--dim)" }}>질문 2</label>
          <input
            value={question2}
            onChange={(e) => setQuestion2(e.target.value)}
            placeholder="요즘 가장 자주 듣는 노래는?"
            className="w-full text-sm px-3 py-2.5 border"
            style={inputStyle}
          />
        </div>
      </div>

      {error && <p className="text-xs" style={{ color: "#f66" }}>{error}</p>}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={saveDraft}
          disabled={saving}
          className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {saving ? "저장 중..." : saved ? "저장됨 ✓" : "임시 저장"}
        </button>

        {draftExists && (
          <Link
            href={`/operator/place-clusters?spaceId=${spaceId}`}
            className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            캔버스 배치하기
          </Link>
        )}

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!draftExists}
          className="text-sm px-4 py-2.5 border transition-colors disabled:opacity-30"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          새 방명록 시작
        </button>
        {!draftExists && (
          <p className="text-xs w-full" style={{ color: "var(--border)" }}>질문을 먼저 임시 저장하면 시작할 수 있어요.</p>
        )}
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
        >
          <div className="w-full max-w-xs p-6 space-y-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <p className="text-sm leading-relaxed">
              새 방명록을 시작하면 현재 방명록에는 더 이상 글을 작성할 수 없습니다. 기존 기록은 그대로 보관됩니다.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={activating}
                className="flex-1 text-xs py-2 border"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={startNewSession}
                disabled={activating}
                className="flex-1 text-xs py-2 border"
                style={{ borderColor: "var(--fg)" }}
              >
                {activating ? "시작 중..." : "시작하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
