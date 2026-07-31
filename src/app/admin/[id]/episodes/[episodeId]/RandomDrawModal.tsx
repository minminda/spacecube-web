"use client";

import { useEffect, useState } from "react";
import { INTERVIEW_NOTE_MAX } from "@/lib/interviewInput";
import type { QuestionData } from "./InterviewPrep";

/** 질문 배열에서 하나를 무작위로 고른다 — 2개 이상이면 직전 질문을 바로 다시 뽑지 않는다. */
export function pickRandomQuestion(questions: QuestionData[], excludeId?: string): QuestionData | null {
  if (questions.length === 0) return null;
  if (questions.length === 1) return questions[0];
  const pool = excludeId ? questions.filter((q) => q.id !== excludeId) : questions;
  const candidates = pool.length > 0 ? pool : questions;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

interface Props {
  topicTitle: string;
  questions: QuestionData[];
  onSaveNote: (questionId: string, note: string) => Promise<boolean>;
  onClose: () => void;
}

export default function RandomDrawModal({ topicTitle, questions, onSaveNote, onClose }: Props) {
  const [current, setCurrent] = useState<QuestionData | null>(() => pickRandomQuestion(questions));
  const [drawCount, setDrawCount] = useState(0);
  const [showNote, setShowNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(current?.interviewNote ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function redraw() {
    const next = pickRandomQuestion(questions, current?.id);
    setCurrent(next);
    setDrawCount((c) => c + 1);
    setShowNote(false);
    setNoteDraft(next?.interviewNote ?? "");
    setSaved(false);
  }

  async function saveNote() {
    if (!current) return;
    setSaving(true);
    const ok = await onSaveNote(current.id, noteDraft.trim());
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        key={drawCount}
        className="interview-draw-card w-full max-w-lg p-8 sm:p-10 space-y-6"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <div className="space-y-1 text-center">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>오늘의 질문</p>
          <p className="text-xs" style={{ color: "var(--border)" }}>{topicTitle}</p>
        </div>

        <p className="text-xl sm:text-2xl font-semibold leading-relaxed text-center break-keep">
          {current ? current.content : "질문을 먼저 추가해주세요."}
        </p>

        {current && showNote && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--dim)" }}>인터뷰 메모</label>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={saveNote}
              rows={4}
              maxLength={INTERVIEW_NOTE_MAX}
              placeholder="운영자의 답변을 그대로 기록하거나, 에피소드에 사용할 장면을 메모해주세요."
              className="w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
              style={{ borderColor: "var(--border)", color: "var(--fg)", resize: "vertical" }}
            />
            <p className="text-xs" style={{ color: "var(--border)" }}>
              {saving ? "저장 중..." : saved ? "저장됨 ✓" : "이 메모는 공개 화면에 노출되지 않습니다."}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={redraw}
              disabled={questions.length === 0}
              className="flex-1 text-sm py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              다시 뽑기
            </button>
            <button
              onClick={() => setShowNote((v) => !v)}
              disabled={!current}
              className="flex-1 text-sm py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              답변 기록하기
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-sm py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
            style={{ borderColor: "var(--fg)" }}
          >
            닫기
          </button>
        </div>
      </div>

      <style>{`
        @keyframes interviewDrawCardIn {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
        .interview-draw-card { animation: interviewDrawCardIn 0.22s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .interview-draw-card { animation: none; }
        }
      `}</style>
    </div>
  );
}
