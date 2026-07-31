"use client";

import { useEffect, useMemo, useState } from "react";
import { INTERVIEW_NOTE_MAX } from "@/lib/interviewInput";
import type { TopicData } from "./InterviewPrep";
import { pickRandomQuestion } from "./RandomDrawModal";

interface Props {
  episodeTitle: string;
  topics: TopicData[];
  onSaveNote: (topicId: string, questionId: string, note: string) => Promise<boolean>;
  onClose: () => void;
}

/** 아이패드 인터뷰 현장용 전체화면 모드 — 주제 선택 → 질문 뽑기 → 메모, 세 단계를 한 화면에서 순환한다. */
export default function InterviewMode({ episodeTitle, topics, onSaveNote, onClose }: Props) {
  const firstTopic = topics[0] ?? null;
  const firstQuestion = firstTopic ? pickRandomQuestion(firstTopic.questions) : null;

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(firstTopic?.id ?? null);
  const [stack, setStack] = useState<{ topicId: string; question: typeof topics[number]["questions"][number] }[]>(
    firstTopic && firstQuestion ? [{ topicId: firstTopic.id, question: firstQuestion }] : []
  );
  const [stackIndex, setStackIndex] = useState(firstTopic && firstQuestion ? 0 : -1);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteDirty, setNoteDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedTopic = useMemo(() => topics.find((t) => t.id === selectedTopicId) ?? null, [topics, selectedTopicId]);
  const current = stackIndex >= 0 ? stack[stackIndex] : null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteDirty, noteDraft, current]);

  useEffect(() => {
    setNoteDraft(current?.question.interviewNote ?? "");
    setNoteDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.question.id]);

  async function saveCurrentNote() {
    if (!current) return true;
    setSaving(true);
    const ok = await onSaveNote(current.topicId, current.question.id, noteDraft.trim());
    setSaving(false);
    if (ok) setNoteDirty(false);
    return ok;
  }

  function selectTopic(topicId: string) {
    const topic = topics.find((t) => t.id === topicId);
    setSelectedTopicId(topicId);
    const picked = topic ? pickRandomQuestion(topic.questions) : null;
    if (picked) {
      setStack([{ topicId, question: picked }]);
      setStackIndex(0);
    } else {
      setStack([]);
      setStackIndex(-1);
    }
  }

  async function drawNext() {
    if (!selectedTopic) return;
    if (noteDirty) await saveCurrentNote();
    const picked = pickRandomQuestion(selectedTopic.questions, current?.question.id);
    if (!picked) return;
    setStack((prev) => [...prev.slice(0, stackIndex + 1), { topicId: selectedTopic.id, question: picked }]);
    setStackIndex((i) => i + 1);
  }

  async function goBack() {
    if (stackIndex <= 0) return;
    if (noteDirty) await saveCurrentNote();
    setStackIndex((i) => i - 1);
  }

  async function handleClose() {
    if (noteDirty) await saveCurrentNote();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>인터뷰 모드</p>
          <p className="text-sm font-semibold truncate">{episodeTitle}</p>
        </div>
        <button
          onClick={handleClose}
          className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] flex-shrink-0"
          style={{ borderColor: "var(--fg)" }}
        >
          닫기
        </button>
      </div>

      <div className="flex flex-col sm:flex-row flex-1 min-h-0">
        {/* 주제 목록 — 좁은 화면(세로)에서는 상단 가로 스크롤 탭, 태블릿 폭 이상에서는 좌측 목록 */}
        <div
          className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto px-4 sm:px-3 py-3 flex-shrink-0 sm:w-56"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {topics.length === 0 && (
            <p className="text-xs whitespace-nowrap sm:whitespace-normal" style={{ color: "var(--dim)" }}>등록된 주제가 없어요.</p>
          )}
          {topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => selectTopic(topic.id)}
              className="text-xs px-3 py-2 border text-left whitespace-nowrap sm:whitespace-normal flex-shrink-0 transition-colors"
              style={{
                borderColor: topic.id === selectedTopicId ? "var(--fg)" : "var(--border)",
                background: topic.id === selectedTopicId ? "var(--fg)" : "transparent",
                color: topic.id === selectedTopicId ? "var(--bg)" : "var(--dim)",
              }}
            >
              {topic.title} ({topic.questions.length})
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-6 py-8 gap-6">
          {!selectedTopic ? (
            <p className="text-sm" style={{ color: "var(--dim)" }}>주제를 먼저 선택해주세요.</p>
          ) : selectedTopic.questions.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--dim)" }}>이 주제에는 질문이 없어요. 질문을 먼저 추가해주세요.</p>
          ) : (
            <div className="w-full max-w-2xl space-y-6">
              <div className="space-y-1 text-center">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>오늘의 질문</p>
                <p className="text-xs" style={{ color: "var(--border)" }}>{selectedTopic.title}</p>
              </div>

              <p key={current?.question.id} className="interview-mode-card text-2xl sm:text-3xl font-semibold leading-relaxed text-center break-keep">
                {current?.question.content}
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--dim)" }}>인터뷰 메모</label>
                <textarea
                  value={noteDraft}
                  onChange={(e) => { setNoteDraft(e.target.value); setNoteDirty(true); }}
                  onBlur={saveCurrentNote}
                  rows={5}
                  maxLength={INTERVIEW_NOTE_MAX}
                  placeholder="운영자의 답변을 그대로 기록하거나, 에피소드에 사용할 장면을 메모해주세요."
                  className="w-full bg-transparent border px-3 py-2.5 text-sm outline-none focus:border-[var(--fg)]"
                  style={{ borderColor: "var(--border)", color: "var(--fg)", resize: "vertical" }}
                />
                <p className="text-xs" style={{ color: "var(--border)" }}>
                  {saving ? "저장 중..." : noteDirty ? "저장 안 됨 — 다른 질문으로 넘어가면 자동 저장됩니다." : "이 메모는 공개 화면에 노출되지 않습니다."}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={goBack}
                  disabled={stackIndex <= 0}
                  className="flex-1 text-sm py-3 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  이전 질문
                </button>
                <button
                  onClick={drawNext}
                  className="flex-1 text-sm py-3 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                  style={{ borderColor: "var(--fg)" }}
                >
                  다음 뽑기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes interviewModeCardIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .interview-mode-card { animation: interviewModeCardIn 0.25s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .interview-mode-card { animation: none; }
        }
      `}</style>
    </div>
  );
}
