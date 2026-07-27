"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";

type SelectionType = "SINGLE" | "MULTI";

interface TagRow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  useForRecommendation: boolean;
  usageCount: number;
}

interface CategoryRow {
  id: string;
  name: string;
  selectionType: SelectionType;
  isActive: boolean;
  tags: TagRow[];
}

interface Props {
  initialCategories: CategoryRow[];
  initialUnclassified: TagRow[];
}

const UNCLASSIFIED = "__unclassified__";

export default function TagManager({ initialCategories, initialUnclassified }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [unclassified, setUnclassified] = useState(initialUnclassified);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<SelectionType>("MULTI");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const { toast, showToast } = useToast();
  const router = useRouter();

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, selectionType: newCategoryType }),
    });
    setCreatingCategory(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "카테고리 생성에 실패했어요.");
      return;
    }
    const created = await res.json();
    setCategories((prev) => [...prev, { id: created.id, name: created.name, selectionType: created.selectionType, isActive: true, tags: [] }]);
    setNewCategoryName("");
  }

  async function moveCategory(id: string, direction: "up" | "down") {
    const res = await fetch(`/api/categories/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) return showToast("순서 변경에 실패했어요.");
    setCategories((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function patchCategory(id: string, data: Partial<Pick<CategoryRow, "name" | "selectionType" | "isActive">>) {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "변경에 실패했어요.");
    }
    return res.ok;
  }

  async function removeCategory(category: CategoryRow) {
    if (category.tags.length > 0) {
      showToast("하위 태그가 있는 카테고리는 삭제할 수 없어요. 태그를 먼저 옮기거나 삭제해주세요.");
      return;
    }
    const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      showToast("카테고리가 삭제되었습니다.");
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "삭제에 실패했어요.");
    }
  }

  function tagListSetter(categoryId: string | null) {
    return categoryId === null ? setUnclassified : (updater: (tags: TagRow[]) => TagRow[]) => {
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, tags: updater(c.tags) } : c)));
    };
  }

  async function createTag(categoryId: string | null, name: string) {
    if (!name.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), categoryId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "태그 생성에 실패했어요.");
      return;
    }
    const created = await res.json();
    const row: TagRow = { id: created.id, name: created.name, description: created.description ?? "", isActive: true, useForRecommendation: true, usageCount: 0 };
    tagListSetter(categoryId)((prev) => [...prev, row]);
  }

  async function moveTag(categoryId: string | null, tagId: string, direction: "up" | "down") {
    const res = await fetch(`/api/tags/${tagId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) return showToast("순서 변경에 실패했어요.");
    tagListSetter(categoryId)((prev) => {
      const i = prev.findIndex((t) => t.id === tagId);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function patchTag(categoryId: string | null, id: string, data: Partial<Pick<TagRow, "name" | "description" | "isActive" | "useForRecommendation">>) {
    const res = await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      tagListSetter(categoryId)((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
    } else {
      showToast("변경에 실패했어요.");
    }
    return res.ok;
  }

  async function removeOrDeactivateTag(categoryId: string | null, tag: TagRow) {
    if (tag.usageCount > 0) {
      await patchTag(categoryId, tag.id, { isActive: false });
      showToast("이미 사용된 태그라 비활성화했습니다.");
      return;
    }
    const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
    if (res.ok) {
      tagListSetter(categoryId)((prev) => prev.filter((t) => t.id !== tag.id));
      showToast("태그가 삭제되었습니다.");
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "삭제에 실패했어요.");
    }
  }

  async function reassignTag(fromCategoryId: string | null, tag: TagRow, toCategoryId: string | null) {
    if (toCategoryId === fromCategoryId) return;
    const res = await fetch(`/api/tags/${tag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: toCategoryId }),
    });
    if (!res.ok) {
      showToast("카테고리 이동에 실패했어요.");
      return;
    }
    tagListSetter(fromCategoryId)((prev) => prev.filter((t) => t.id !== tag.id));
    tagListSetter(toCategoryId)((prev) => [...prev, tag]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 새 카테고리 추가 */}
      <div className="flex gap-3 flex-wrap p-4 border" style={{ borderColor: "var(--border)" }}>
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="새 카테고리 이름 (예: 분위기)"
          className="flex-1 min-w-[10rem] bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          onKeyDown={(e) => { if (e.key === "Enter") createCategory(); }}
        />
        <select
          value={newCategoryType}
          onChange={(e) => setNewCategoryType(e.target.value as SelectionType)}
          className="bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        >
          <option value="MULTI">다중 선택</option>
          <option value="SINGLE">단일 선택</option>
        </select>
        <button
          onClick={createCategory}
          disabled={creatingCategory || !newCategoryName.trim()}
          className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {creatingCategory ? "추가 중..." : "+ 카테고리 추가"}
        </button>
      </div>

      {categories.map((category, i) => (
        <CategorySection
          key={category.id}
          category={category}
          index={i}
          total={categories.length}
          categoryOptions={categoryOptions}
          onMove={(dir) => moveCategory(category.id, dir)}
          onPatch={(data) => patchCategory(category.id, data)}
          onRemove={() => removeCategory(category)}
          onCreateTag={(name) => createTag(category.id, name)}
          onMoveTag={(tagId, dir) => moveTag(category.id, tagId, dir)}
          onPatchTag={(tagId, data) => patchTag(category.id, tagId, data)}
          onRemoveTag={(tag) => removeOrDeactivateTag(category.id, tag)}
          onReassignTag={(tag, toCategoryId) => reassignTag(category.id, tag, toCategoryId)}
        />
      ))}

      {unclassified.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>미분류</p>
          <p className="text-xs" style={{ color: "var(--dim)" }}>카테고리를 정해주지 않은 태그입니다. 아래에서 카테고리를 골라 옮겨주세요.</p>
          <div className="space-y-3">
            {unclassified.map((tag) => (
              <TagCard
                key={tag.id}
                tag={tag}
                index={0}
                total={1}
                categoryOptions={categoryOptions}
                currentCategoryId={null}
                onMove={() => {}}
                onPatch={(data) => patchTag(null, tag.id, data)}
                onRemove={() => removeOrDeactivateTag(null, tag)}
                onReassign={(toCategoryId) => reassignTag(null, tag, toCategoryId)}
                hideMove
              />
            ))}
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}

function CategorySection({
  category, index, total, categoryOptions, onMove, onPatch, onRemove,
  onCreateTag, onMoveTag, onPatchTag, onRemoveTag, onReassignTag,
}: {
  category: CategoryRow;
  index: number;
  total: number;
  categoryOptions: { id: string; name: string }[];
  onMove: (direction: "up" | "down") => void;
  onPatch: (data: Partial<Pick<CategoryRow, "name" | "selectionType" | "isActive">>) => Promise<boolean>;
  onRemove: () => void;
  onCreateTag: (name: string) => void;
  onMoveTag: (tagId: string, direction: "up" | "down") => void;
  onPatchTag: (tagId: string, data: Partial<Pick<TagRow, "name" | "description" | "isActive" | "useForRecommendation">>) => Promise<boolean>;
  onRemoveTag: (tag: TagRow) => void;
  onReassignTag: (tag: TagRow, toCategoryId: string | null) => void;
}) {
  const [name, setName] = useState(category.name);
  const [newTagName, setNewTagName] = useState("");

  const dirty = name !== category.name;

  return (
    <div className="space-y-4 p-4 border" style={{ borderColor: "var(--border)", opacity: category.isActive ? 1 : 0.5 }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 text-xs">
            <button onClick={() => onMove("up")} disabled={index === 0} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▲</button>
            <button onClick={() => onMove("down")} disabled={index === total - 1} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▼</button>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => dirty && name.trim() && onPatch({ name: name.trim() })}
            className="bg-transparent border px-3 py-1.5 text-sm font-medium outline-none focus:border-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          />
          <select
            value={category.selectionType}
            onChange={(e) => onPatch({ selectionType: e.target.value as SelectionType })}
            className="bg-transparent border px-2 py-1.5 text-xs outline-none focus:border-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            <option value="MULTI">다중 선택</option>
            <option value="SINGLE">단일 선택</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--dim)" }}>
            <input type="checkbox" checked={category.isActive} onChange={(e) => onPatch({ isActive: e.target.checked })} />
            활성화
          </label>
          <button
            onClick={onRemove}
            className="text-xs px-3 py-1 border transition-colors hover:border-red-500 hover:text-red-500"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            카테고리 삭제
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="새 태그 이름"
          className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          onKeyDown={(e) => { if (e.key === "Enter") { onCreateTag(newTagName); setNewTagName(""); } }}
        />
        <button
          onClick={() => { onCreateTag(newTagName); setNewTagName(""); }}
          disabled={!newTagName.trim()}
          className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          + 태그 추가
        </button>
      </div>

      {category.tags.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>아직 태그가 없어요.</p>
      ) : (
        <div className="space-y-3">
          {category.tags.map((tag, i) => (
            <TagCard
              key={tag.id}
              tag={tag}
              index={i}
              total={category.tags.length}
              categoryOptions={categoryOptions}
              currentCategoryId={category.id}
              onMove={(dir) => onMoveTag(tag.id, dir)}
              onPatch={(data) => onPatchTag(tag.id, data)}
              onRemove={() => onRemoveTag(tag)}
              onReassign={(toCategoryId) => onReassignTag(tag, toCategoryId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TagCard({
  tag, index, total, categoryOptions, currentCategoryId, onMove, onPatch, onRemove, onReassign, hideMove,
}: {
  tag: TagRow;
  index: number;
  total: number;
  categoryOptions: { id: string; name: string }[];
  currentCategoryId: string | null;
  onMove: (direction: "up" | "down") => void;
  onPatch: (data: Partial<Pick<TagRow, "name" | "description" | "isActive" | "useForRecommendation">>) => Promise<boolean>;
  onRemove: () => void;
  onReassign: (toCategoryId: string | null) => void;
  hideMove?: boolean;
}) {
  const [name, setName] = useState(tag.name);
  const [description, setDescription] = useState(tag.description);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const dirty = name !== tag.name || description !== tag.description;

  async function save() {
    setSaving(true);
    await onPatch({ name, description: description || undefined });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="p-3 border space-y-3" style={{ borderColor: "var(--border)", opacity: tag.isActive ? 1 : 0.5 }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 text-xs items-center">
          {!hideMove && (
            <div className="flex gap-1">
              <button onClick={() => onMove("up")} disabled={index === 0} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▲</button>
              <button onClick={() => onMove("down")} disabled={index === total - 1} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▼</button>
            </div>
          )}
          <select
            value={currentCategoryId ?? UNCLASSIFIED}
            onChange={(e) => onReassign(e.target.value === UNCLASSIFIED ? null : e.target.value)}
            className="bg-transparent border px-2 py-1 text-xs outline-none focus:border-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            <option value={UNCLASSIFIED}>미분류</option>
            {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <span className="text-xs" style={{ color: "var(--dim)" }}>
          사용됨 {tag.usageCount}건 {!tag.isActive && "· 비활성"}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="태그 이름"
          className="bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명 (선택)"
          className="bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
      </div>

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
