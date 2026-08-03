"use client";

import { useMemo, useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import type { EpisodeTemplateData, SpaceOption } from "./InterviewLibrary";
import {
  pickRandomQuestion,
  buildQuestionnaireText,
  type SceneTopicSelection,
} from "@/lib/interviewQuestionnaire";

type Step = "space" | "template" | "questions" | "preview";

interface Props {
  templates: EpisodeTemplateData[];
  spaces: SpaceOption[];
  onClose: () => void;
}

/**
 * 인터뷰 시작 — "대상 공간 선택 → 에피소드 템플릿 선택 → Scene 소재별 질문 선택 → 미리보기"
 * 4단계 마법사. 여기서 고른 공간/질문 선택은 어디에도 저장되지 않고 텍스트 질문지를 만드는
 * 데만 쓰인다(생성 이력 없음).
 */
export default function InterviewQuestionnaireBuilder({ templates, spaces, onClose }: Props) {
  const activeTemplates = useMemo(() => templates.filter((t) => t.isActive), [templates]);

  const [step, setStep] = useState<Step>("space");
  const [spaceQuery, setSpaceQuery] = useState("");
  const [selectedSpace, setSelectedSpace] = useState<SpaceOption | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EpisodeTemplateData | null>(null);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [copied, setCopied] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const filteredSpaces = spaceQuery.trim()
    ? spaces.filter((s) => s.name.toLowerCase().includes(spaceQuery.trim().toLowerCase()))
    : spaces;

  function selectSpace(space: SpaceOption) {
    setSelectedSpace(space);
    setStep("template");
  }

  function selectTemplate(template: EpisodeTemplateData) {
    setSelectedTemplate(template);
    const initial: Record<string, string[]> = {};
    for (const sceneTopic of template.sceneTopics) {
      const picked = pickRandomQuestion(sceneTopic.questions, []);
      initial[sceneTopic.id] = picked ? [picked.id] : [];
    }
    setSelections(initial);
    setStep("questions");
  }

  function rerollTopic(sceneTopicId: string) {
    const sceneTopic = selectedTemplate?.sceneTopics.find((s) => s.id === sceneTopicId);
    if (!sceneTopic) return;
    const current = selections[sceneTopicId] ?? [];
    const picked = pickRandomQuestion(sceneTopic.questions, current);
    setSelections((prev) => ({ ...prev, [sceneTopicId]: picked ? [picked.id] : [] }));
  }

  function toggleQuestion(sceneTopicId: string, questionId: string) {
    setSelections((prev) => {
      const current = prev[sceneTopicId] ?? [];
      const next = current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId];
      return { ...prev, [sceneTopicId]: next };
    });
  }

  const canPreview =
    !!selectedTemplate &&
    selectedTemplate.sceneTopics.every((s) => !s.isRequired || (selections[s.id]?.length ?? 0) > 0);

  const questionnaireText = useMemo(() => {
    if (!selectedSpace || !selectedTemplate) return "";
    const selectionList: SceneTopicSelection[] = selectedTemplate.sceneTopics.map((s) => ({
      sceneTopicId: s.id,
      questionIds: selections[s.id] ?? [],
    }));
    return buildQuestionnaireText(selectedSpace.name, selectedTemplate, selectionList);
  }, [selectedSpace, selectedTemplate, selections]);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(questionnaireText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("복사에 실패했어요.");
    }
  }

  function downloadText() {
    const blob = new Blob([questionnaireText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedSpace?.name ?? "공간"}_EP${selectedTemplate?.episodeNumber ?? ""}_인터뷰질문지.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printText() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="no-print flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
          인터뷰 시작 — {stepLabel(step)}
        </p>
        <button
          onClick={onClose}
          className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] flex-shrink-0"
          style={{ borderColor: "var(--fg)" }}
        >
          닫기
        </button>
      </div>

      <div className="no-print flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6">
        {step === "space" && (
          <div className="max-w-lg mx-auto space-y-4">
            <p className="text-sm" style={{ color: "var(--dim)" }}>1. 대상 공간을 선택하세요.</p>
            <input
              value={spaceQuery}
              onChange={(e) => setSpaceQuery(e.target.value)}
              placeholder="공간 이름 검색"
              className="w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            />
            {filteredSpaces.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--dim)" }}>일치하는 공간이 없어요.</p>
            ) : (
              <div className="space-y-2">
                {filteredSpaces.map((space) => (
                  <button
                    key={space.id}
                    onClick={() => selectSpace(space)}
                    className="w-full text-left text-sm px-4 py-3 border transition-colors hover:border-[var(--fg)]"
                    style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                  >
                    {space.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "template" && (
          <div className="max-w-lg mx-auto space-y-4">
            <p className="text-sm" style={{ color: "var(--dim)" }}>
              2. {selectedSpace?.name} — 제작할 에피소드를 선택하세요.
            </p>
            {activeTemplates.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--dim)" }}>활성화된 에피소드 템플릿이 없어요.</p>
            ) : (
              <div className="space-y-2">
                {activeTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => selectTemplate(template)}
                    className="w-full text-left text-sm px-4 py-3 border transition-colors hover:border-[var(--fg)] space-y-1"
                    style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                  >
                    <p>EP.{template.episodeNumber} {template.title}</p>
                    <p className="text-xs break-keep" style={{ color: "var(--dim)" }}>
                      Scene 소재 {template.sceneTopics.length}개 · 질문 {template.sceneTopics.reduce((sum, s) => sum + s.questions.length, 0)}개
                    </p>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setStep("space")} className="text-xs px-3 py-2 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
              &lt; 공간 다시 선택
            </button>
          </div>
        )}

        {step === "questions" && selectedTemplate && (
          <div className="max-w-2xl mx-auto space-y-5">
            <p className="text-sm" style={{ color: "var(--dim)" }}>
              3. {selectedSpace?.name} — EP.{selectedTemplate.episodeNumber} {selectedTemplate.title} — Scene 소재별 질문 선택
            </p>

            {selectedTemplate.sceneTopics.map((sceneTopic, i) => {
              const activeQuestions = sceneTopic.questions.filter((q) => q.isActive);
              const selected = selections[sceneTopic.id] ?? [];
              return (
                <div key={sceneTopic.id} className="border p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm">{i + 1}. {sceneTopic.title}</p>
                      {sceneTopic.description && (
                        <p className="text-xs mt-0.5 break-keep" style={{ color: "var(--dim)" }}>{sceneTopic.description}</p>
                      )}
                    </div>
                    {sceneTopic.isRequired && (
                      <span className="text-[10px] px-1.5 py-0.5 border flex-shrink-0" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>필수</span>
                    )}
                  </div>

                  {activeQuestions.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--dim)" }}>사용 가능한(활성) 질문이 없어요.</p>
                  ) : (
                    <>
                      <button
                        onClick={() => rerollTopic(sceneTopic.id)}
                        className="text-xs px-3 py-1.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                        style={{ borderColor: "var(--fg)" }}
                      >
                        무작위 선택
                      </button>
                      <div className="space-y-1.5">
                        {activeQuestions.map((q) => (
                          <label key={q.id} className="flex items-start gap-2 text-sm px-3 py-2 cursor-pointer" style={{ background: "var(--tag-bg)" }}>
                            <input
                              type="checkbox"
                              checked={selected.includes(q.id)}
                              onChange={() => toggleQuestion(sceneTopic.id, q.id)}
                              className="mt-0.5 flex-shrink-0"
                            />
                            <span className="break-keep">{q.content}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                  {sceneTopic.isRequired && selected.length === 0 && (
                    <p className="text-xs" style={{ color: "#e05252" }}>필수 소재예요 — 질문을 최소 1개 선택해주세요.</p>
                  )}
                </div>
              );
            })}

            <div className="flex gap-3">
              <button onClick={() => setStep("template")} className="text-xs px-3 py-2 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                &lt; 에피소드 다시 선택
              </button>
              <button
                onClick={() => setStep("preview")}
                disabled={!canPreview}
                className="flex-1 text-sm py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
                style={{ borderColor: "var(--fg)" }}
              >
                질문지 미리보기
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-sm" style={{ color: "var(--dim)" }}>4. 미리보기 — 복사하거나 내보내세요.</p>
            <pre
              id="questionnaire-print-area"
              className="whitespace-pre-wrap break-keep text-sm px-4 py-4 border leading-relaxed"
              style={{ borderColor: "var(--border)", color: "var(--fg)", fontFamily: "inherit" }}
            >
              {questionnaireText}
            </pre>
            <div className="flex gap-2 flex-wrap">
              <button onClick={copyText} className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--fg)" }}>
                {copied ? "복사됨!" : "복사"}
              </button>
              <button onClick={downloadText} className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                다운로드
              </button>
              <button onClick={printText} className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                인쇄
              </button>
              <button onClick={() => setStep("questions")} className="text-sm px-4 py-2 border transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                &lt; 뒤로가기
              </button>
            </div>
          </div>
        )}
      </div>

      <Toast message={toast} />

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #questionnaire-print-area, #questionnaire-print-area * { visibility: visible; }
          #questionnaire-print-area { position: absolute; top: 0; left: 0; width: 100%; border: none !important; }
        }
      `}</style>
    </div>
  );
}

function stepLabel(step: Step): string {
  switch (step) {
    case "space": return "공간 선택";
    case "template": return "에피소드 선택";
    case "questions": return "질문 선택";
    case "preview": return "미리보기";
  }
}
