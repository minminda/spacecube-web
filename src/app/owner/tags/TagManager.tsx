"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TagRow {
  id: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  useForRecommendation: boolean;
  usageCount: number;
}

const CATEGORY_SUGGESTIONS = ["분위기", "행동", "감정", "공간 특성"];

export default function TagManager({ initialTags }: { initialTags: TagRow[] }) {
  const [tags, setTags] = useState(initialTags);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function createTag() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category: newCategory || null }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "생성에 실패했어요.");
      return;
    }
    const created = await res.json();
    setTags((prev) => [...prev, { id: created.id, name: created.name, category: created.category ?? "", description: created.description ?? "", isActive: true, useForRecommendation: true, usageCount: 0 }]);
    setNewName("");
    setNewCategory("");
  }

  async function move(id: string, direction: "up" | "down") {
    const res = await fetch(`/api/tags/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (res.ok) {
      setTags((prev) => {
        const i = prev.findIndex((t) => t.id === id);
        const j = direction === "up" ? i - 1 : i + 1;
        if (i === -1 || j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    } else {
      showToast("순서 변경에 실패했어요.");
    }
  }

  async function removeOrDeactivate(tag: TagRow) {
    if (tag.usageCount > 0) {
      // 사용 중인 태그 → 비활성화만
      await patch(tag.id, { isActive: false });
      showToast("이미 사용된 태그라 비활성화했습니다.");
      return;
    }
    const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
      showToast("태그가 삭제되었습니다.");
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "삭제에 실패했어요.");
    }
  }

  async function patch(id: string, data: Partial<Pick<TagRow, "name" | "category" | "description" | "isActive" | "useForRecommendation">>) {
    const res = await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
    } else {
      showToast("변경에 실패했어요.");
    }
    return res.ok;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 새 태그 추가 */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="새 태그 이름 (예: 조용한)"
          className="flex-1 min-w-[10rem] bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          onKeyDown={(e) => { if (e.key === "Enter") createTag(); }}
        />
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="카테고리 (선택)"
          list="tag-category-suggestions"
          className="w-40 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
        <datalist id="tag-category-suggestions">
          {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
        </datalist>
        <button
          onClick={createTag}
          disabled={creating || !newName.trim()}
          className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {creating ? "추가 중..." : "+ 태그 추가"}
        </button>
      </div>

      <div className="space-y-3">
        {tags.map((tag, i) => (
          <TagCard
            key={tag.id}
            tag={tag}
            index={i}
            total={tags.length}
            onMove={(dir) => move(tag.id, dir)}
            onPatch={(data) => patch(tag.id, data)}
            onRemove={() => removeOrDeactivate(tag)}
          />
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 text-sm border" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--fg)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function TagCard({
  tag, index, total, onMove, onPatch, onRemove,
}: {
  tag: TagRow;
  index: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  onPatch: (data: Partial<Pick<TagRow, "name" | "category" | "description" | "isActive" | "useForRecommendation">>) => Promise<boolean>;
  onRemove: () => void;
}) {
  const [name, setName] = useState(tag.name);
  const [category, setCategory] = useState(tag.category);
  const [description, setDescription] = useState(tag.description);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const dirty = name !== tag.name || category !== tag.category || description !== tag.description;

  async function save() {
    setSaving(true);
    await onPatch({ name, category: category || undefined, description: description || undefined });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="p-4 border space-y-3" style={{ borderColor: "var(--border)", opacity: tag.isActive ? 1 : 0.5 }}>
      <div className="flex items-center justify-between">
        <div className="flex gap-2 text-xs">
          <button onClick={() => onMove("up")} disabled={index === 0} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▲</button>
          <button onClick={() => onMove("down")} disabled={index === total - 1} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▼</button>
        </div>
        <span className="text-xs" style={{ color: "var(--dim)" }}>
          사용됨 {tag.usageCount}건 {!tag.isActive && "· 비활성"}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="태그 이름"
          className="bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="카테고리" list="tag-category-suggestions"
          className="bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
      </div>
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명 (선택)"
        className="w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--dim)" }}>
            <input type="checkbox" checked={tag.useForRecommendation} onChange={(e) => onPatch({ useForRecommendation: e.target.checked })} />
            추천 계산에 포함
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--dim)" }}>
            <input type="checkbox" checked={tag.isActive} onChange={(e) => onPatch({ isActive: e.target.checked })} />
            활성화
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRemove}
            className="text-xs px-3 py-1 border transition-colors hover:border-red-500 hover:text-red-500"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            {tag.usageCount > 0 ? "비활성화" : "삭제"}
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty || !name.trim()}
            className="text-xs px-3 py-1 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
            style={{ borderColor: "var(--fg)" }}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
