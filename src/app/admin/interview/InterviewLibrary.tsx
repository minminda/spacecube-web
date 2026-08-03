"use client";

import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import CubeGlyph from "@/components/CubeGlyph";
import {
  INTERVIEW_EPISODE_TITLE_MAX,
  INTERVIEW_EPISODE_DESCRIPTION_MAX,
  INTERVIEW_SCENE_TOPIC_TITLE_MAX,
  INTERVIEW_SCENE_TOPIC_DESCRIPTION_MAX,
  INTERVIEW_QUESTION_MAX,
  validateEpisodeTemplateTitle,
  validateSceneTopicTitle,
  validateQuestionContent,
  isDuplicateQuestion,
} from "@/lib/interviewInput";
import InterviewQuestionnaireBuilder from "./InterviewQuestionnaireBuilder";

export interface QuestionData {
  id: string;
  content: string;
  isActive: boolean;
}

export interface SceneTopicData {
  id: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  questions: QuestionData[];
}

export interface EpisodeTemplateData {
  id: string;
  episodeNumber: number;
  title: string;
  description: string | null;
  isActive: boolean;
  sceneTopics: SceneTopicData[];
}

export interface SpaceOption {
  id: string;
  name: string;
}

interface Props {
  initialEpisodeTemplates: EpisodeTemplateData[];
  spaces: SpaceOption[];
}

export default function InterviewLibrary({ initialEpisodeTemplates, spaces }: Props) {
  const [templates, setTemplates] = useState<EpisodeTemplateData[]>(initialEpisodeTemplates);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [collapsedTemplateIds, setCollapsedTemplateIds] = useState<Set<string>>(new Set());
  const [collapsedTopicIds, setCollapsedTopicIds] = useState<Set<string>>(new Set());
  const [builderOpen, setBuilderOpen] = useState(false);
  const { toast, showToast } = useToast();

  async function createTemplate() {
    const title = newTemplateTitle.trim();
    const validation = validateEpisodeTemplateTitle(title);
    if (!validation.ok) return;
    setCreatingTemplate(true);
    const res = await fetch(`/api/interview/episode-templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setCreatingTemplate(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "에피소드 추가에 실패했어요.");
      return;
    }
    const created = await res.json();
    setNewTemplateTitle("");
    setTemplates((prev) => [
      ...prev,
      { id: created.id, episodeNumber: created.episodeNumber, title: created.title, description: created.description, isActive: created.isActive, sceneTopics: [] },
    ]);
  }

  async function updateTemplate(templateId: string, patch: { title?: string; description?: string; isActive?: boolean }): Promise<boolean> {
    const res = await fetch(`/api/interview/episode-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "저장에 실패했어요.");
      return false;
    }
    setTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...t, ...patch } : t)));
    return true;
  }

  async function moveTemplate(templateId: string, direction: "up" | "down") {
    const res = await fetch(`/api/interview/episode-templates/${templateId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      showToast("순서 변경에 실패했어요.");
      return;
    }
    setTemplates((prev) => {
      const i = prev.findIndex((t) => t.id === templateId);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((t, idx) => ({ ...t, episodeNumber: idx + 1 }));
    });
  }

  async function deleteTemplate(templateId: string) {
    const res = await fetch(`/api/interview/episode-templates/${templateId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("삭제에 실패했어요.");
      return;
    }
    setTemplates((prev) => prev.filter((t) => t.id !== templateId).map((t, idx) => ({ ...t, episodeNumber: idx + 1 })));
    showToast("에피소드가 삭제되었습니다.");
  }

  async function createSceneTopic(templateId: string, title: string): Promise<boolean> {
    const validation = validateSceneTopicTitle(title);
    if (!validation.ok) {
      showToast(validation.error!);
      return false;
    }
    const res = await fetch(`/api/interview/episode-templates/${templateId}/scene-topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Scene 소재 추가에 실패했어요.");
      return false;
    }
    const created = await res.json();
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? { ...t, sceneTopics: [...t.sceneTopics, { id: created.id, title: created.title, description: created.description, isRequired: created.isRequired, questions: [] }] }
          : t
      )
    );
    return true;
  }

  async function updateSceneTopic(templateId: string, sceneTopicId: string, patch: { title?: string; description?: string; isRequired?: boolean }): Promise<boolean> {
    const res = await fetch(`/api/interview/scene-topics/${sceneTopicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "저장에 실패했어요.");
      return false;
    }
    setTemplates((prev) =>
      prev.map((t) =>
        t.id !== templateId
          ? t
          : { ...t, sceneTopics: t.sceneTopics.map((s) => (s.id === sceneTopicId ? { ...s, ...patch } : s)) }
      )
    );
    return true;
  }

  async function moveSceneTopic(templateId: string, sceneTopicId: string, direction: "up" | "down") {
    const res = await fetch(`/api/interview/scene-topics/${sceneTopicId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      showToast("순서 변경에 실패했어요.");
      return;
    }
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        const i = t.sceneTopics.findIndex((s) => s.id === sceneTopicId);
        const j = direction === "up" ? i - 1 : i + 1;
        if (i === -1 || j < 0 || j >= t.sceneTopics.length) return t;
        const sceneTopics = [...t.sceneTopics];
        [sceneTopics[i], sceneTopics[j]] = [sceneTopics[j], sceneTopics[i]];
        return { ...t, sceneTopics };
      })
    );
  }

  async function deleteSceneTopic(templateId: string, sceneTopicId: string) {
    const res = await fetch(`/api/interview/scene-topics/${sceneTopicId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("삭제에 실패했어요.");
      return;
    }
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, sceneTopics: t.sceneTopics.filter((s) => s.id !== sceneTopicId) } : t))
    );
    showToast("Scene 소재가 삭제되었습니다.");
  }

  async function addQuestion(templateId: string, sceneTopicId: string, content: string): Promise<boolean> {
    const trimmed = content.trim();
    const template = templates.find((t) => t.id === templateId);
    const sceneTopic = template?.sceneTopics.find((s) => s.id === sceneTopicId);
    const validation = validateQuestionContent(trimmed);
    if (!validation.ok) {
      showToast(validation.error!);
      return false;
    }
    if (sceneTopic && isDuplicateQuestion(trimmed, sceneTopic.questions.map((q) => q.content))) {
      showToast("이미 같은 질문이 있어요.");
      return false;
    }
    const res = await fetch(`/api/interview/scene-topics/${sceneTopicId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "질문 추가에 실패했어요.");
      return false;
    }
    const created = await res.json();
    setTemplates((prev) =>
      prev.map((t) =>
        t.id !== templateId
          ? t
          : {
              ...t,
              sceneTopics: t.sceneTopics.map((s) =>
                s.id === sceneTopicId ? { ...s, questions: [...s.questions, { id: created.id, content: created.content, isActive: created.isActive }] } : s
              ),
            }
      )
    );
    return true;
  }

  async function updateQuestion(templateId: string, sceneTopicId: string, questionId: string, patch: { content?: string; isActive?: boolean }): Promise<boolean> {
    const res = await fetch(`/api/interview/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "저장에 실패했어요.");
      return false;
    }
    setTemplates((prev) =>
      prev.map((t) =>
        t.id !== templateId
          ? t
          : {
              ...t,
              sceneTopics: t.sceneTopics.map((s) =>
                s.id !== sceneTopicId
                  ? s
                  : { ...s, questions: s.questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)) }
              ),
            }
      )
    );
    return true;
  }

  async function moveQuestion(templateId: string, sceneTopicId: string, questionId: string, direction: "up" | "down") {
    const res = await fetch(`/api/interview/questions/${questionId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      showToast("순서 변경에 실패했어요.");
      return;
    }
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          sceneTopics: t.sceneTopics.map((s) => {
            if (s.id !== sceneTopicId) return s;
            const i = s.questions.findIndex((q) => q.id === questionId);
            const j = direction === "up" ? i - 1 : i + 1;
            if (i === -1 || j < 0 || j >= s.questions.length) return s;
            const questions = [...s.questions];
            [questions[i], questions[j]] = [questions[j], questions[i]];
            return { ...s, questions };
          }),
        };
      })
    );
  }

  async function deleteQuestion(templateId: string, sceneTopicId: string, questionId: string) {
    const res = await fetch(`/api/interview/questions/${questionId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("삭제에 실패했어요.");
      return;
    }
    setTemplates((prev) =>
      prev.map((t) =>
        t.id !== templateId
          ? t
          : {
              ...t,
              sceneTopics: t.sceneTopics.map((s) =>
                s.id === sceneTopicId ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) } : s
              ),
            }
      )
    );
  }

  function toggleTemplateCollapsed(templateId: string) {
    setCollapsedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  }

  function toggleTopicCollapsed(sceneTopicId: string) {
    setCollapsedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(sceneTopicId)) next.delete(sceneTopicId);
      else next.add(sceneTopicId);
      return next;
    });
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setBuilderOpen(true)}
          disabled={templates.length === 0}
          className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] flex items-center gap-2 flex-shrink-0 disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24"><CubeGlyph /></svg>
          인터뷰 시작
        </button>
      </div>

      {/* 새 에피소드 추가 */}
      <div className="flex gap-3">
        <input
          value={newTemplateTitle}
          onChange={(e) => setNewTemplateTitle(e.target.value)}
          placeholder="예: 첫 만남"
          maxLength={INTERVIEW_EPISODE_TITLE_MAX}
          className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          onKeyDown={(e) => { if (e.key === "Enter") createTemplate(); }}
        />
        <button
          onClick={createTemplate}
          disabled={creatingTemplate || !newTemplateTitle.trim()}
          className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {creatingTemplate ? "추가 중..." : "+ 에피소드 추가"}
        </button>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>&gt; 아직 등록된 에피소드가 없어. 위에서 추가해봐.</p>
      ) : (
        <div className="space-y-3">
          {templates.map((template, i) => (
            <EpisodeTemplateCard
              key={template.id}
              template={template}
              index={i}
              total={templates.length}
              collapsed={collapsedTemplateIds.has(template.id)}
              collapsedTopicIds={collapsedTopicIds}
              onToggleCollapsed={() => toggleTemplateCollapsed(template.id)}
              onToggleTopicCollapsed={toggleTopicCollapsed}
              onMove={(dir) => moveTemplate(template.id, dir)}
              onUpdate={(patch) => updateTemplate(template.id, patch)}
              onDelete={() => deleteTemplate(template.id)}
              onCreateSceneTopic={(title) => createSceneTopic(template.id, title)}
              onUpdateSceneTopic={(sceneTopicId, patch) => updateSceneTopic(template.id, sceneTopicId, patch)}
              onMoveSceneTopic={(sceneTopicId, dir) => moveSceneTopic(template.id, sceneTopicId, dir)}
              onDeleteSceneTopic={(sceneTopicId) => deleteSceneTopic(template.id, sceneTopicId)}
              onAddQuestion={(sceneTopicId, content) => addQuestion(template.id, sceneTopicId, content)}
              onUpdateQuestion={(sceneTopicId, questionId, patch) => updateQuestion(template.id, sceneTopicId, questionId, patch)}
              onMoveQuestion={(sceneTopicId, questionId, dir) => moveQuestion(template.id, sceneTopicId, questionId, dir)}
              onDeleteQuestion={(sceneTopicId, questionId) => deleteQuestion(template.id, sceneTopicId, questionId)}
            />
          ))}
        </div>
      )}

      {builderOpen && <InterviewQuestionnaireBuilder templates={templates} spaces={spaces} onClose={() => setBuilderOpen(false)} />}

      <Toast message={toast} />
    </section>
  );
}

function EpisodeTemplateCard({
  template, index, total, collapsed, collapsedTopicIds, onToggleCollapsed, onToggleTopicCollapsed, onMove, onUpdate, onDelete,
  onCreateSceneTopic, onUpdateSceneTopic, onMoveSceneTopic, onDeleteSceneTopic,
  onAddQuestion, onUpdateQuestion, onMoveQuestion, onDeleteQuestion,
}: {
  template: EpisodeTemplateData;
  index: number;
  total: number;
  collapsed: boolean;
  collapsedTopicIds: Set<string>;
  onToggleCollapsed: () => void;
  onToggleTopicCollapsed: (sceneTopicId: string) => void;
  onMove: (direction: "up" | "down") => void;
  onUpdate: (patch: { title?: string; description?: string; isActive?: boolean }) => Promise<boolean>;
  onDelete: () => void;
  onCreateSceneTopic: (title: string) => Promise<boolean>;
  onUpdateSceneTopic: (sceneTopicId: string, patch: { title?: string; description?: string; isRequired?: boolean }) => Promise<boolean>;
  onMoveSceneTopic: (sceneTopicId: string, direction: "up" | "down") => void;
  onDeleteSceneTopic: (sceneTopicId: string) => void;
  onAddQuestion: (sceneTopicId: string, content: string) => Promise<boolean>;
  onUpdateQuestion: (sceneTopicId: string, questionId: string, patch: { content?: string; isActive?: boolean }) => Promise<boolean>;
  onMoveQuestion: (sceneTopicId: string, questionId: string, direction: "up" | "down") => void;
  onDeleteQuestion: (sceneTopicId: string, questionId: string) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(template.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(template.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newSceneTopicTitle, setNewSceneTopicTitle] = useState("");
  const [creatingSceneTopic, setCreatingSceneTopic] = useState(false);

  const questionCount = template.sceneTopics.reduce((sum, s) => sum + s.questions.length, 0);

  async function commitTitle() {
    const trimmed = titleDraft.trim();
    setEditingTitle(false);
    if (!trimmed || trimmed === template.title) {
      setTitleDraft(template.title);
      return;
    }
    const validation = validateEpisodeTemplateTitle(trimmed);
    if (!validation.ok) {
      setTitleDraft(template.title);
      return;
    }
    const ok = await onUpdate({ title: trimmed });
    if (!ok) setTitleDraft(template.title);
  }

  async function commitDescription() {
    const trimmed = descriptionDraft.trim();
    setEditingDescription(false);
    if (trimmed === (template.description ?? "")) return;
    const ok = await onUpdate({ description: trimmed });
    if (!ok) setDescriptionDraft(template.description ?? "");
  }

  async function submitNewSceneTopic() {
    if (!newSceneTopicTitle.trim() || creatingSceneTopic) return;
    setCreatingSceneTopic(true);
    const ok = await onCreateSceneTopic(newSceneTopicTitle);
    setCreatingSceneTopic(false);
    if (ok) setNewSceneTopicTitle("");
  }

  return (
    <div className="border" style={{ borderColor: "var(--border)", opacity: template.isActive ? 1 : 0.55 }}>
      <div className="flex items-center justify-between gap-2 px-4 py-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onToggleCollapsed}
            className="text-xs flex-shrink-0 w-5 text-center"
            style={{ color: "var(--dim)" }}
            aria-label={collapsed ? "펼치기" : "접기"}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <div className="min-w-0 flex-1 space-y-1">
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                maxLength={INTERVIEW_EPISODE_TITLE_MAX}
                className="min-w-0 w-full bg-transparent border px-2 py-1 text-sm outline-none focus:border-[var(--fg)]"
                style={{ borderColor: "var(--border)", color: "var(--fg)" }}
              />
            ) : (
              <button onClick={() => setEditingTitle(true)} className="text-sm text-left truncate block" title="클릭해서 제목 수정">
                EP.{template.episodeNumber} {template.title}
              </button>
            )}
            <p className="text-xs" style={{ color: "var(--dim)" }}>
              Scene 소재 {template.sceneTopics.length}개 · 질문 {questionCount}개
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 text-xs flex-shrink-0">
          <button
            onClick={() => onUpdate({ isActive: !template.isActive })}
            className="border px-2 py-1 transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            {template.isActive ? "[활성]" : "[비활성]"}
          </button>
          <button onClick={() => onMove("up")} disabled={index === 0} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▲</button>
          <button onClick={() => onMove("down")} disabled={index === total - 1} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▼</button>
          {confirmDelete ? (
            <>
              <button onClick={() => setConfirmDelete(false)} className="border px-2 py-1" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>취소</button>
              <button onClick={onDelete} className="border px-2 py-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors">삭제 확인</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="border px-2 py-1 transition-colors hover:border-red-500 hover:text-red-500" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>삭제</button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="pt-3 space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--dim)" }}>에피소드 설명</label>
            {editingDescription ? (
              <textarea
                autoFocus
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                onBlur={commitDescription}
                maxLength={INTERVIEW_EPISODE_DESCRIPTION_MAX}
                rows={3}
                className="w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)] break-keep"
                style={{ borderColor: "var(--border)", color: "var(--fg)", resize: "vertical" }}
              />
            ) : (
              <button
                onClick={() => setEditingDescription(true)}
                className="w-full text-left text-sm px-3 py-2 border break-keep"
                style={{ borderColor: "var(--border)", color: template.description ? "var(--fg)" : "var(--dim)" }}
                title="클릭해서 설명 수정"
              >
                {template.description || "설명 없음 (클릭해서 추가)"}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {template.sceneTopics.map((sceneTopic, i) => (
              <SceneTopicCard
                key={sceneTopic.id}
                sceneTopic={sceneTopic}
                index={i}
                total={template.sceneTopics.length}
                collapsed={collapsedTopicIds.has(sceneTopic.id)}
                onToggleCollapsed={() => onToggleTopicCollapsed(sceneTopic.id)}
                onMove={(dir) => onMoveSceneTopic(sceneTopic.id, dir)}
                onUpdate={(patch) => onUpdateSceneTopic(sceneTopic.id, patch)}
                onDelete={() => onDeleteSceneTopic(sceneTopic.id)}
                onAddQuestion={(content) => onAddQuestion(sceneTopic.id, content)}
                onUpdateQuestion={(questionId, patch) => onUpdateQuestion(sceneTopic.id, questionId, patch)}
                onMoveQuestion={(questionId, dir) => onMoveQuestion(sceneTopic.id, questionId, dir)}
                onDeleteQuestion={(questionId) => onDeleteQuestion(sceneTopic.id, questionId)}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newSceneTopicTitle}
              onChange={(e) => setNewSceneTopicTitle(e.target.value)}
              placeholder="예: 공간이 시작되기 전"
              maxLength={INTERVIEW_SCENE_TOPIC_TITLE_MAX}
              className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
              onKeyDown={(e) => { if (e.key === "Enter") submitNewSceneTopic(); }}
            />
            <button
              onClick={submitNewSceneTopic}
              disabled={creatingSceneTopic || !newSceneTopicTitle.trim()}
              className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40 flex-shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              {creatingSceneTopic ? "추가 중..." : "+ Scene 소재 추가"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SceneTopicCard({
  sceneTopic, index, total, collapsed, onToggleCollapsed, onMove, onUpdate, onDelete,
  onAddQuestion, onUpdateQuestion, onMoveQuestion, onDeleteQuestion,
}: {
  sceneTopic: SceneTopicData;
  index: number;
  total: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onMove: (direction: "up" | "down") => void;
  onUpdate: (patch: { title?: string; description?: string; isRequired?: boolean }) => Promise<boolean>;
  onDelete: () => void;
  onAddQuestion: (content: string) => Promise<boolean>;
  onUpdateQuestion: (questionId: string, patch: { content?: string; isActive?: boolean }) => Promise<boolean>;
  onMoveQuestion: (questionId: string, direction: "up" | "down") => void;
  onDeleteQuestion: (questionId: string) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(sceneTopic.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(sceneTopic.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);

  async function commitTitle() {
    const trimmed = titleDraft.trim();
    setEditingTitle(false);
    if (!trimmed || trimmed === sceneTopic.title) {
      setTitleDraft(sceneTopic.title);
      return;
    }
    const validation = validateSceneTopicTitle(trimmed);
    if (!validation.ok) {
      setTitleDraft(sceneTopic.title);
      return;
    }
    const ok = await onUpdate({ title: trimmed });
    if (!ok) setTitleDraft(sceneTopic.title);
  }

  async function commitDescription() {
    const trimmed = descriptionDraft.trim();
    setEditingDescription(false);
    if (trimmed === (sceneTopic.description ?? "")) return;
    const ok = await onUpdate({ description: trimmed });
    if (!ok) setDescriptionDraft(sceneTopic.description ?? "");
  }

  async function submitNewQuestion() {
    if (!newQuestion.trim() || addingQuestion) return;
    setAddingQuestion(true);
    const ok = await onAddQuestion(newQuestion);
    setAddingQuestion(false);
    if (ok) setNewQuestion("");
  }

  return (
    <div className="border" style={{ borderColor: "var(--border)", background: "var(--tag-bg)" }}>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onToggleCollapsed}
            className="text-xs flex-shrink-0 w-5 text-center"
            style={{ color: "var(--dim)" }}
            aria-label={collapsed ? "펼치기" : "접기"}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              maxLength={INTERVIEW_SCENE_TOPIC_TITLE_MAX}
              className="min-w-0 flex-1 bg-transparent border px-2 py-1 text-sm outline-none focus:border-[var(--fg)]"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            />
          ) : (
            <button onClick={() => setEditingTitle(true)} className="text-sm text-left truncate" title="클릭해서 소재명 수정">
              {index + 1}. {sceneTopic.title}
            </button>
          )}
          <span className="text-xs flex-shrink-0" style={{ color: "var(--dim)" }}>질문 {sceneTopic.questions.length}개</span>
        </div>
        <div className="flex gap-1.5 text-xs flex-shrink-0">
          <button
            onClick={() => onUpdate({ isRequired: !sceneTopic.isRequired })}
            className="border px-2 py-1 transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            {sceneTopic.isRequired ? "[필수]" : "[선택]"}
          </button>
          <button onClick={() => onMove("up")} disabled={index === 0} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▲</button>
          <button onClick={() => onMove("down")} disabled={index === total - 1} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▼</button>
          {confirmDelete ? (
            <>
              <button onClick={() => setConfirmDelete(false)} className="border px-2 py-1" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>취소</button>
              <button onClick={onDelete} className="border px-2 py-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors">삭제 확인</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="border px-2 py-1 transition-colors hover:border-red-500 hover:text-red-500" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>삭제</button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="pt-2.5 space-y-1">
            {editingDescription ? (
              <textarea
                autoFocus
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                onBlur={commitDescription}
                maxLength={INTERVIEW_SCENE_TOPIC_DESCRIPTION_MAX}
                rows={2}
                className="w-full bg-transparent border px-2 py-1.5 text-xs outline-none focus:border-[var(--fg)] break-keep"
                style={{ borderColor: "var(--border)", color: "var(--fg)", resize: "vertical" }}
              />
            ) : (
              <button
                onClick={() => setEditingDescription(true)}
                className="w-full text-left text-xs px-2 py-1.5 border break-keep"
                style={{ borderColor: "var(--border)", color: sceneTopic.description ? "var(--dim)" : "var(--border)" }}
                title="클릭해서 설명 수정"
              >
                {sceneTopic.description || "설명 없음 (클릭해서 추가)"}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {sceneTopic.questions.map((q, i) => (
              <QuestionRow
                key={q.id}
                question={q}
                index={i}
                total={sceneTopic.questions.length}
                onMove={(dir) => onMoveQuestion(q.id, dir)}
                onEdit={(content) => onUpdateQuestion(q.id, { content })}
                onToggleActive={() => onUpdateQuestion(q.id, { isActive: !q.isActive })}
                onDelete={() => onDeleteQuestion(q.id)}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="예: 왜 이 공간을 시작했나요?"
              maxLength={INTERVIEW_QUESTION_MAX}
              className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
              onKeyDown={(e) => { if (e.key === "Enter") submitNewQuestion(); }}
            />
            <button
              onClick={submitNewQuestion}
              disabled={addingQuestion || !newQuestion.trim()}
              className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40 flex-shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              {addingQuestion ? "추가 중..." : "+ 질문 추가"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionRow({
  question, index, total, onMove, onEdit, onToggleActive, onDelete,
}: {
  question: QuestionData;
  index: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  onEdit: (content: string) => Promise<boolean>;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.content);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === question.content) {
      setDraft(question.content);
      return;
    }
    const ok = await onEdit(trimmed);
    if (!ok) setDraft(question.content);
  }

  return (
    <div className="flex items-start gap-2 px-3 py-2 text-sm" style={{ background: "var(--bg)", opacity: question.isActive ? 1 : 0.5 }}>
      <span className="text-xs pt-0.5 flex-shrink-0" style={{ color: "var(--dim)" }}>{index + 1}.</span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          maxLength={INTERVIEW_QUESTION_MAX}
          className="min-w-0 flex-1 bg-transparent border px-2 py-1 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
      ) : (
        <button onClick={() => setEditing(true)} className="flex-1 min-w-0 text-left break-keep" title="클릭해서 질문 수정">
          {question.content}
        </button>
      )}
      <div className="flex gap-1.5 text-xs flex-shrink-0">
        <button onClick={onToggleActive} className="border px-1.5 py-0.5 transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
          {question.isActive ? "[활성]" : "[비활성]"}
        </button>
        <button onClick={() => onMove("up")} disabled={index === 0} className="border px-1.5 py-0.5 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▲</button>
        <button onClick={() => onMove("down")} disabled={index === total - 1} className="border px-1.5 py-0.5 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▼</button>
        {confirmDelete ? (
          <>
            <button onClick={() => setConfirmDelete(false)} className="border px-1.5 py-0.5" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>취소</button>
            <button onClick={onDelete} className="border px-1.5 py-0.5 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors">확인</button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="border px-1.5 py-0.5 transition-colors hover:border-red-500 hover:text-red-500" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>삭제</button>
        )}
      </div>
    </div>
  );
}
