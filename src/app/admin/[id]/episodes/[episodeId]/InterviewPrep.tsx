"use client";

import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import CubeGlyph from "@/components/CubeGlyph";
import {
  INTERVIEW_TOPIC_TITLE_MAX,
  INTERVIEW_QUESTION_MAX,
  validateTopicTitle,
  validateQuestionContent,
  isDuplicateQuestion,
} from "@/lib/interviewInput";
import RandomDrawModal from "./RandomDrawModal";
import InterviewMode from "./InterviewMode";

export interface QuestionData {
  id: string;
  content: string;
  interviewNote: string;
}

export interface TopicData {
  id: string;
  title: string;
  questions: QuestionData[];
}

interface Props {
  episodeId: string;
  episodeTitle: string;
  initialTopics: TopicData[];
}

export default function InterviewPrep({ episodeId, episodeTitle, initialTopics }: Props) {
  const [topics, setTopics] = useState<TopicData[]>(initialTopics);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [drawTopicId, setDrawTopicId] = useState<string | null>(null);
  const [interviewModeOpen, setInterviewModeOpen] = useState(false);
  const { toast, showToast } = useToast();

  function updateQuestion(topicId: string, questionId: string, patch: Partial<QuestionData>) {
    setTopics((prev) =>
      prev.map((t) =>
        t.id !== topicId
          ? t
          : { ...t, questions: t.questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)) }
      )
    );
  }

  async function createTopic() {
    const title = newTopicTitle.trim();
    const validation = validateTopicTitle(title);
    if (!validation.ok) return;
    setCreatingTopic(true);
    const res = await fetch(`/api/episodes/${episodeId}/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setCreatingTopic(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "주제 추가에 실패했어요.");
      return;
    }
    const created = await res.json();
    setNewTopicTitle("");
    setTopics((prev) => [...prev, { id: created.id, title: created.title, questions: [] }]);
  }

  async function renameTopic(topicId: string, title: string): Promise<boolean> {
    const res = await fetch(`/api/topics/${topicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "저장에 실패했어요.");
      return false;
    }
    setTopics((prev) => prev.map((t) => (t.id === topicId ? { ...t, title } : t)));
    return true;
  }

  async function moveTopic(topicId: string, direction: "up" | "down") {
    const res = await fetch(`/api/topics/${topicId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      showToast("순서 변경에 실패했어요.");
      return;
    }
    setTopics((prev) => {
      const i = prev.findIndex((t) => t.id === topicId);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function deleteTopic(topicId: string) {
    const res = await fetch(`/api/topics/${topicId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("삭제에 실패했어요.");
      return;
    }
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    showToast("주제가 삭제되었습니다.");
  }

  async function addQuestion(topicId: string, content: string): Promise<boolean> {
    const trimmed = content.trim();
    const topic = topics.find((t) => t.id === topicId);
    const validation = validateQuestionContent(trimmed);
    if (!validation.ok) {
      showToast(validation.error!);
      return false;
    }
    if (topic && isDuplicateQuestion(trimmed, topic.questions.map((q) => q.content))) {
      showToast("이미 같은 질문이 있어요.");
      return false;
    }
    const res = await fetch(`/api/topics/${topicId}/questions`, {
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
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? { ...t, questions: [...t.questions, { id: created.id, content: created.content, interviewNote: "" }] }
          : t
      )
    );
    return true;
  }

  async function editQuestion(topicId: string, questionId: string, content: string): Promise<boolean> {
    const res = await fetch(`/api/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "저장에 실패했어요.");
      return false;
    }
    updateQuestion(topicId, questionId, { content });
    return true;
  }

  async function saveInterviewNote(topicId: string, questionId: string, note: string): Promise<boolean> {
    const res = await fetch(`/api/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewNote: note }),
    });
    if (!res.ok) {
      showToast("메모 저장에 실패했어요.");
      return false;
    }
    updateQuestion(topicId, questionId, { interviewNote: note });
    return true;
  }

  async function moveQuestion(topicId: string, questionId: string, direction: "up" | "down") {
    const res = await fetch(`/api/questions/${questionId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      showToast("순서 변경에 실패했어요.");
      return;
    }
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        const i = t.questions.findIndex((q) => q.id === questionId);
        const j = direction === "up" ? i - 1 : i + 1;
        if (i === -1 || j < 0 || j >= t.questions.length) return t;
        const questions = [...t.questions];
        [questions[i], questions[j]] = [questions[j], questions[i]];
        return { ...t, questions };
      })
    );
  }

  async function deleteQuestion(topicId: string, questionId: string) {
    const res = await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("삭제에 실패했어요.");
      return;
    }
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, questions: t.questions.filter((q) => q.id !== questionId) } : t))
    );
  }

  function toggleCollapsed(topicId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  const drawTopic = topics.find((t) => t.id === drawTopicId) ?? null;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>인터뷰 질문 준비</p>
          <p className="text-sm leading-relaxed break-keep" style={{ color: "var(--dim)" }}>
            사람 이야기 자체보다, 그 이야기를 알고 난 뒤 공간이 다르게 보일 수 있는 질문을 준비해주세요.
          </p>
          <p className="text-xs leading-relaxed break-keep" style={{ color: "var(--border)" }}>
            이미 검색하면 알 수 있는 정보보다, 이 공간에서만 발견할 수 있는 선택·장면·고민을 담아주세요.
          </p>
        </div>
        <button
          onClick={() => setInterviewModeOpen(true)}
          className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] flex items-center gap-1.5 flex-shrink-0"
          style={{ borderColor: "var(--fg)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24"><CubeGlyph /></svg>
          인터뷰 모드 열기
        </button>
      </div>

      {/* 새 주제 추가 */}
      <div className="flex gap-3">
        <input
          value={newTopicTitle}
          onChange={(e) => setNewTopicTitle(e.target.value)}
          placeholder="예: 시작 이전의 이야기"
          maxLength={INTERVIEW_TOPIC_TITLE_MAX}
          className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          onKeyDown={(e) => { if (e.key === "Enter") createTopic(); }}
        />
        <button
          onClick={createTopic}
          disabled={creatingTopic || !newTopicTitle.trim()}
          className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {creatingTopic ? "추가 중..." : "+ 주제 추가"}
        </button>
      </div>

      {topics.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>&gt; 아직 등록된 주제가 없어. 위에서 추가해봐.</p>
      ) : (
        <div className="space-y-3">
          {topics.map((topic, i) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              index={i}
              total={topics.length}
              collapsed={collapsedIds.has(topic.id)}
              onToggleCollapsed={() => toggleCollapsed(topic.id)}
              onMove={(dir) => moveTopic(topic.id, dir)}
              onRename={(title) => renameTopic(topic.id, title)}
              onDelete={() => deleteTopic(topic.id)}
              onAddQuestion={(content) => addQuestion(topic.id, content)}
              onEditQuestion={(questionId, content) => editQuestion(topic.id, questionId, content)}
              onMoveQuestion={(questionId, dir) => moveQuestion(topic.id, questionId, dir)}
              onDeleteQuestion={(questionId) => deleteQuestion(topic.id, questionId)}
              onDraw={() => setDrawTopicId(topic.id)}
            />
          ))}
        </div>
      )}

      {drawTopic && (
        <RandomDrawModal
          topicTitle={drawTopic.title}
          questions={drawTopic.questions}
          onSaveNote={(questionId, note) => saveInterviewNote(drawTopic.id, questionId, note)}
          onClose={() => setDrawTopicId(null)}
        />
      )}

      {interviewModeOpen && (
        <InterviewMode
          episodeTitle={episodeTitle}
          topics={topics}
          onSaveNote={(topicId, questionId, note) => saveInterviewNote(topicId, questionId, note)}
          onClose={() => setInterviewModeOpen(false)}
        />
      )}

      <Toast message={toast} />
    </section>
  );
}

function TopicCard({
  topic, index, total, collapsed, onToggleCollapsed, onMove, onRename, onDelete,
  onAddQuestion, onEditQuestion, onMoveQuestion, onDeleteQuestion, onDraw,
}: {
  topic: TopicData;
  index: number;
  total: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onMove: (direction: "up" | "down") => void;
  onRename: (title: string) => Promise<boolean>;
  onDelete: () => void;
  onAddQuestion: (content: string) => Promise<boolean>;
  onEditQuestion: (questionId: string, content: string) => Promise<boolean>;
  onMoveQuestion: (questionId: string, direction: "up" | "down") => void;
  onDeleteQuestion: (questionId: string) => void;
  onDraw: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(topic.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);

  async function commitTitle() {
    const trimmed = titleDraft.trim();
    setEditingTitle(false);
    if (!trimmed || trimmed === topic.title) {
      setTitleDraft(topic.title);
      return;
    }
    const validation = validateTopicTitle(trimmed);
    if (!validation.ok) {
      setTitleDraft(topic.title);
      return;
    }
    const ok = await onRename(trimmed);
    if (!ok) setTitleDraft(topic.title);
  }

  async function submitNewQuestion() {
    if (!newQuestion.trim() || addingQuestion) return;
    setAddingQuestion(true);
    const ok = await onAddQuestion(newQuestion);
    setAddingQuestion(false);
    if (ok) setNewQuestion("");
  }

  return (
    <div className="border" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
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
              maxLength={INTERVIEW_TOPIC_TITLE_MAX}
              className="min-w-0 flex-1 bg-transparent border px-2 py-1 text-sm outline-none focus:border-[var(--fg)]"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-sm text-left truncate"
              title="클릭해서 주제명 수정"
            >
              {topic.title}
            </button>
          )}
          <span className="text-xs flex-shrink-0" style={{ color: "var(--dim)" }}>질문 {topic.questions.length}개</span>
        </div>
        <div className="flex gap-1.5 text-xs flex-shrink-0">
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
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="pt-3 flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: "var(--border)" }}>
              현장에서 무작위로 하나를 골라 보여줍니다.
            </p>
            <button
              onClick={onDraw}
              disabled={topic.questions.length === 0}
              className="text-xs px-3 py-1.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24"><CubeGlyph /></svg>
              이 주제에서 질문 뽑기
            </button>
          </div>
          {topic.questions.length === 0 && (
            <p className="text-xs" style={{ color: "var(--dim)" }}>질문을 먼저 추가해주세요.</p>
          )}

          <div className="space-y-2">
            {topic.questions.map((q, i) => (
              <QuestionRow
                key={q.id}
                question={q}
                index={i}
                total={topic.questions.length}
                onMove={(dir) => onMoveQuestion(q.id, dir)}
                onEdit={(content) => onEditQuestion(q.id, content)}
                onDelete={() => onDeleteQuestion(q.id)}
              />
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="예: 사람들이 이 공간에 대해 가장 오해하는 것은 무엇인가요?"
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
  question, index, total, onMove, onEdit, onDelete,
}: {
  question: QuestionData;
  index: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  onEdit: (content: string) => Promise<boolean>;
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
    <div className="flex items-start gap-2 px-3 py-2 text-sm" style={{ background: "var(--tag-bg)" }}>
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
          {question.interviewNote.trim() && (
            <span className="ml-2 text-xs" style={{ color: "var(--dim)" }}>· 메모 있음</span>
          )}
        </button>
      )}
      <div className="flex gap-1.5 text-xs flex-shrink-0">
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
