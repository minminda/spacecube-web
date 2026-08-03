"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import type { EpisodeTemplateData } from "./InterviewLibrary";
import { pickRandomQuestion, buildSelectedQuestionsText, type QuestionSelectionMap } from "@/lib/interviewQuestionnaire";

type Step = "template" | "questions";

interface Props {
  templates: EpisodeTemplateData[];
  onClose: () => void;
}

/**
 * 인터뷰 시작 — 질문 라이브러리 내부에서 독립적으로 동작하는 "질문 선택" 도구.
 * 질문지를 만들거나 공간/운영자와 연결하지 않는다. 관리자는 여기서 에피소드별로
 * Scene 소재당 질문 1개씩 뽑고(무작위/직접 선택), 선택 결과를 클립보드로 복사해
 * Google Docs에서 직접 질문지를 작성한다. 선택 상태는 이 화면에서만 유지되고
 * 저장되지 않는다.
 */
export default function InterviewQuestionPicker({ templates, onClose }: Props) {
  const activeTemplates = templates.filter((t) => t.isActive);

  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<EpisodeTemplateData | null>(null);
  const [selections, setSelections] = useState<QuestionSelectionMap>({});
  const [manualPickerFor, setManualPickerFor] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function selectTemplate(template: EpisodeTemplateData) {
    setSelectedTemplate(template);
    const initial: QuestionSelectionMap = {};
    for (const sceneTopic of template.sceneTopics) {
      initial[sceneTopic.id] = pickRandomQuestion(sceneTopic.questions, [])?.id ?? null;
    }
    setSelections(initial);
    setManualPickerFor(null);
    setStep("questions");
  }

  function rerollAll() {
    if (!selectedTemplate) return;
    setSelections((prev) => {
      const next: QuestionSelectionMap = {};
      for (const sceneTopic of selectedTemplate.sceneTopics) {
        const current = prev[sceneTopic.id];
        next[sceneTopic.id] = pickRandomQuestion(sceneTopic.questions, current ? [current] : [])?.id ?? null;
      }
      return next;
    });
  }

  function rerollOne(sceneTopicId: string) {
    const sceneTopic = selectedTemplate?.sceneTopics.find((s) => s.id === sceneTopicId);
    if (!sceneTopic) return;
    const current = selections[sceneTopicId];
    const picked = pickRandomQuestion(sceneTopic.questions, current ? [current] : []);
    setSelections((prev) => ({ ...prev, [sceneTopicId]: picked?.id ?? null }));
  }

  function pickManually(sceneTopicId: string, questionId: string) {
    setSelections((prev) => ({ ...prev, [sceneTopicId]: questionId }));
    setManualPickerFor(null);
  }

  function restart() {
    setSelectedTemplate(null);
    setSelections({});
    setManualPickerFor(null);
    setStep("template");
  }

  async function copySelected() {
    if (!selectedTemplate) return;
    const text = buildSelectedQuestionsText(selectedTemplate, selections);
    try {
      await navigator.clipboard.writeText(text);
      showToast("선택된 질문을 복사했습니다.");
    } catch {
      showToast("복사에 실패했어요.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
          인터뷰 시작 — {step === "template" ? "에피소드 선택" : "질문 선택"}
        </p>
        <button
          onClick={onClose}
          className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] flex-shrink-0"
          style={{ borderColor: "var(--fg)" }}
        >
          닫기
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6">
        {step === "template" && (
          <div className="max-w-lg mx-auto space-y-4">
            <p className="text-sm" style={{ color: "var(--dim)" }}>어떤 에피소드의 질문을 준비할까요?</p>
            {activeTemplates.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--dim)" }}>활성화된 에피소드 템플릿이 없어요.</p>
            ) : (
              <div className="space-y-2">
                {activeTemplates.map((template) => {
                  const activeQuestionCount = template.sceneTopics.reduce(
                    (sum, s) => sum + s.questions.filter((q) => q.isActive).length,
                    0
                  );
                  return (
                    <button
                      key={template.id}
                      onClick={() => selectTemplate(template)}
                      className="w-full text-left text-sm px-4 py-3 border transition-colors hover:border-[var(--fg)] space-y-1"
                      style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                    >
                      <p>[EP.{template.episodeNumber}] {template.title}</p>
                      {template.description && (
                        <p className="text-xs break-keep" style={{ color: "var(--dim)" }}>{template.description}</p>
                      )}
                      <p className="text-xs" style={{ color: "var(--dim)" }}>
                        Scene 소재 {template.sceneTopics.length}개 · 활성 질문 {activeQuestionCount}개
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === "questions" && selectedTemplate && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm" style={{ color: "var(--dim)" }}>
                EP.{selectedTemplate.episodeNumber} {selectedTemplate.title}
              </p>
              <button
                onClick={rerollAll}
                className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                style={{ borderColor: "var(--fg)" }}
              >
                전체 다시 뽑기
              </button>
            </div>

            {selectedTemplate.sceneTopics.map((sceneTopic, i) => {
              const activeQuestions = sceneTopic.questions.filter((q) => q.isActive);
              const selectedId = selections[sceneTopic.id] ?? null;
              const selectedQuestion = activeQuestions.find((q) => q.id === selectedId) ?? null;
              const pickerOpen = manualPickerFor === sceneTopic.id;

              return (
                <div key={sceneTopic.id} className="border p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
                  <p className="text-sm">{i + 1}. {sceneTopic.title}</p>

                  {activeQuestions.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--dim)" }}>사용 가능한(활성) 질문이 없어요.</p>
                  ) : pickerOpen ? (
                    <div className="space-y-1.5">
                      {activeQuestions.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => pickManually(sceneTopic.id, q.id)}
                          className="w-full text-left text-sm px-3 py-2 border transition-colors break-keep"
                          style={{
                            borderColor: q.id === selectedId ? "var(--fg)" : "var(--border)",
                            background: q.id === selectedId ? "var(--tag-bg)" : "transparent",
                            color: "var(--fg)",
                          }}
                        >
                          {q.content}
                        </button>
                      ))}
                      <button
                        onClick={() => setManualPickerFor(null)}
                        className="text-xs px-3 py-1.5 border"
                        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm px-3 py-2 break-keep" style={{ background: "var(--tag-bg)" }}>
                        {selectedQuestion?.content ?? "선택된 질문이 없어요."}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => rerollOne(sceneTopic.id)}
                          className="text-xs px-3 py-1.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                        >
                          다시 뽑기
                        </button>
                        <button
                          onClick={() => setManualPickerFor(sceneTopic.id)}
                          className="text-xs px-3 py-1.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                        >
                          직접 선택
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setStep("template")} className="text-xs px-3 py-2 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                &lt; 에피소드 선택으로 돌아가기
              </button>
              <button onClick={restart} className="text-xs px-3 py-2 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                처음부터 다시 시작
              </button>
              <button
                onClick={copySelected}
                className="flex-1 text-sm py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                style={{ borderColor: "var(--fg)" }}
              >
                선택된 질문 복사
              </button>
            </div>
          </div>
        )}
      </div>

      <Toast message={toast} />
    </div>
  );
}
