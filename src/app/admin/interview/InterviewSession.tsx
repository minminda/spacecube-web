"use client";

import { useEffect, useState } from "react";
import { INTERVIEW_NOTE_MAX } from "@/lib/interviewInput";
import type { TopicData, QuestionData } from "./InterviewLibrary";

/** 질문 배열에서 하나를 무작위로 고른다 — 2개 이상이면 직전 질문을 바로 다시 뽑지 않는다. */
export function pickRandomQuestion(questions: QuestionData[], excludeId?: string): QuestionData | null {
  if (questions.length === 0) return null;
  if (questions.length === 1) return questions[0];
  const pool = excludeId ? questions.filter((q) => q.id !== excludeId) : questions;
  const candidates = pool.length > 0 ? pool : questions;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function noteStorageKey(questionId: string) {
  return `spacecube_interview_note_${questionId}`;
}

interface Props {
  topics: TopicData[];
  onClose: () => void;
}

/**
 * 인터뷰 현장(아이패드)용 전체화면 모드 — 좌측 주제 목록, 우측 질문 뽑기·카드·메모.
 * 인터뷰 메모는 서버에 저장하지 않는 임시 메모라 이 기기의 localStorage에만 남는다.
 */
export default function InterviewSession({ topics, onClose }: Props) {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(topics[0]?.id ?? null);
  const [current, setCurrent] = useState<QuestionData | null>(null);
  const [note, setNote] = useState("");

  const selectedTopic = topics.find((t) => t.id === selectedTopicId) ?? null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function selectTopic(topicId: string) {
    setSelectedTopicId(topicId);
    setCurrent(null);
    setNote("");
  }

  function draw() {
    if (!selectedTopic) return;
    const picked = pickRandomQuestion(selectedTopic.questions, current?.id);
    setCurrent(picked);
    setNote(picked ? localStorage.getItem(noteStorageKey(picked.id)) ?? "" : "");
  }

  function updateNote(value: string) {
    setNote(value);
    if (current) localStorage.setItem(noteStorageKey(current.id), value);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>인터뷰 모드</p>
        <button
          onClick={onClose}
          className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] flex-shrink-0"
          style={{ borderColor: "var(--fg)" }}
        >
          닫기
        </button>
      </div>

      <div className="flex flex-col sm:flex-row flex-1 min-h-0">
        {/* 좌측 주제 목록 */}
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

        {/* 우측: 질문 뽑기 → 카드 → 다시 뽑기 → 메모 → 다음 질문 */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-6 py-8 gap-6">
          {!selectedTopic ? (
            <p className="text-sm" style={{ color: "var(--dim)" }}>주제를 먼저 선택해주세요.</p>
          ) : selectedTopic.questions.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--dim)" }}>이 주제에는 질문이 없어요. 질문을 먼저 추가해주세요.</p>
          ) : !current ? (
            <div className="w-full max-w-lg space-y-4 text-center">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{selectedTopic.title}</p>
              <button
                onClick={draw}
                className="text-sm px-6 py-3 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                style={{ borderColor: "var(--fg)" }}
              >
                질문 뽑기
              </button>
            </div>
          ) : (
            <div className="w-full max-w-2xl space-y-6">
              <div className="space-y-1 text-center">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>오늘의 질문</p>
                <p className="text-xs" style={{ color: "var(--border)" }}>{selectedTopic.title}</p>
              </div>

              <p key={current.id} className="interview-session-card text-2xl sm:text-3xl font-semibold leading-relaxed text-center break-keep">
                {current.content}
              </p>

              <div className="flex justify-center">
                <button
                  onClick={draw}
                  className="text-sm px-5 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  다시 뽑기
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--dim)" }}>인터뷰 메모</label>
                <textarea
                  value={note}
                  onChange={(e) => updateNote(e.target.value)}
                  rows={5}
                  maxLength={INTERVIEW_NOTE_MAX}
                  placeholder="운영자의 답변을 그대로 기록하거나, 에피소드에 사용할 장면을 메모해주세요."
                  className="w-full bg-transparent border px-3 py-2.5 text-sm outline-none focus:border-[var(--fg)]"
                  style={{ borderColor: "var(--border)", color: "var(--fg)", resize: "vertical" }}
                />
                <p className="text-xs" style={{ color: "var(--border)" }}>
                  이 메모는 서버에 저장되지 않고 이 기기에만 임시로 남습니다.
                </p>
              </div>

              <button
                onClick={draw}
                className="w-full text-sm py-3 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                style={{ borderColor: "var(--fg)" }}
              >
                다음 질문
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes interviewSessionCardIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .interview-session-card { animation: interviewSessionCardIn 0.25s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .interview-session-card { animation: none; }
        }
      `}</style>
    </div>
  );
}
