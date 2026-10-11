"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import AdminModal from "@/components/admin/ui/AdminModal";

type SelectionType = "SINGLE" | "MULTI";

export interface TagRow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  useForRecommendation: boolean;
  /** 방문 기록에 붙은 횟수 */
  recordCount: number;
  /** 이 태그를 쓰는 공간(운영 공간 + 공간 등록, slug 기준 중복 제거) */
  spaces: { name: string; slug: string; where: string }[];
}

export interface CategoryRow {
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

async function errorOf(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) return "로그인이 만료되었어요. 다시 로그인해주세요.";
  return data.error ?? fallback;
}

export default function TagManager({ initialCategories, initialUnclassified }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [unclassified, setUnclassified] = useState(initialUnclassified);
  const [q, setQ] = useState("");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<SelectionType>("MULTI");
  const [deleteTarget, setDeleteTarget] = useState<{ tag: TagRow; categoryId: string | null } | null>(null);
  const { toast, showToast } = useToast();
  const router = useRouter();

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));
  const allTags = [...categories.flatMap((c) => c.tags), ...unclassified];
  const unusedCount = allTags.filter((t) => t.spaces.length === 0 && t.recordCount === 0).length;
  const needle = q.trim();
  const matches = (t: TagRow) => (!needle || t.name.includes(needle)) && (!unusedOnly || (t.spaces.length === 0 && t.recordCount === 0));

  const setList = (categoryId: string | null) =>
    categoryId === null
      ? setUnclassified
      : (updater: (tags: TagRow[]) => TagRow[]) => setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, tags: updater(c.tags) } : c)));

  async function api(url: string, method: string, body?: unknown) {
    return fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  }

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const res = await api("/api/categories", "POST", { name, selectionType: newCategoryType });
    if (!res.ok) return showToast(await errorOf(res, "카테고리를 만들지 못했어요."));
    const created = await res.json();
    setCategories((prev) => [...prev, { id: created.id, name: created.name, selectionType: created.selectionType, isActive: true, tags: [] }]);
    setNewCategoryName("");
  }

  async function moveCategory(id: string, direction: "up" | "down") {
    const res = await api(`/api/categories/${id}/move`, "POST", { direction });
    if (!res.ok) return showToast("순서를 바꾸지 못했어요.");
    setCategories((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function patchCategory(id: string, data: Partial<Pick<CategoryRow, "name" | "selectionType" | "isActive">>) {
    const res = await api(`/api/categories/${id}`, "PATCH", data);
    if (!res.ok) { showToast(await errorOf(res, "변경하지 못했어요.")); return false; }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    return true;
  }

  async function removeCategory(c: CategoryRow) {
    if (c.tags.length > 0) return showToast("태그가 들어 있는 분류는 삭제할 수 없어요. 태그를 먼저 옮기거나 삭제해주세요.");
    const res = await api(`/api/categories/${c.id}`, "DELETE");
    if (!res.ok) return showToast(await errorOf(res, "삭제하지 못했어요."));
    setCategories((prev) => prev.filter((x) => x.id !== c.id));
  }

  async function createTag(categoryId: string | null, name: string): Promise<boolean> {
    const res = await api("/api/tags", "POST", { name, categoryId });
    if (!res.ok) { showToast(await errorOf(res, "태그를 추가하지 못했어요.")); return false; }
    const created = await res.json();
    setList(categoryId)((prev) => [...prev, { id: created.id, name: created.name, description: "", isActive: true, useForRecommendation: true, recordCount: 0, spaces: [] }]);
    return true;
  }

  async function moveTag(categoryId: string | null, tagId: string, direction: "up" | "down") {
    const res = await api(`/api/tags/${tagId}/move`, "POST", { direction });
    if (!res.ok) return showToast("순서를 바꾸지 못했어요.");
    setList(categoryId)((prev) => {
      const i = prev.findIndex((t) => t.id === tagId);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function patchTag(categoryId: string | null, id: string, data: Partial<Pick<TagRow, "name" | "description" | "isActive" | "useForRecommendation">>) {
    const res = await api(`/api/tags/${id}`, "PATCH", data);
    if (!res.ok) { showToast(await errorOf(res, "변경하지 못했어요.")); return false; }
    const updated = await res.json();
    setList(categoryId)((prev) => prev.map((t) => (t.id === id ? { ...t, ...data, name: updated.name ?? t.name } : t)));
    if (data.name && updated.renamedSpaces > 0) showToast(`이름을 바꾸고 공간 ${updated.renamedSpaces}곳의 태그도 함께 바꿨어요.`);
    return true;
  }

  async function reassignTag(from: string | null, tag: TagRow, to: string | null) {
    if (from === to) return;
    const res = await api(`/api/tags/${tag.id}`, "PATCH", { categoryId: to });
    if (!res.ok) return showToast(await errorOf(res, "분류를 옮기지 못했어요."));
    setList(from)((prev) => prev.filter((t) => t.id !== tag.id));
    setList(to)((prev) => [...prev, tag]);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { tag, categoryId } = deleteTarget;
    const inUse = tag.spaces.length > 0 || tag.recordCount > 0;
    if (inUse) {
      // 쓰는 곳이 있으면 지우지 않고 비활성화(새로 고를 수 없게)만 한다
      if (await patchTag(categoryId, tag.id, { isActive: false })) showToast("사용 중인 태그라 비활성화했어요.");
    } else {
      const res = await api(`/api/tags/${tag.id}`, "DELETE");
      if (!res.ok) { showToast(await errorOf(res, "삭제하지 못했어요.")); return; }
      setList(categoryId)((prev) => prev.filter((t) => t.id !== tag.id));
      showToast("태그를 삭제했어요.");
    }
    setDeleteTarget(null);
  }

  const rowProps = (categoryId: string | null) => ({
    categoryOptions,
    categoryId,
    onPatch: (id: string, d: Parameters<typeof patchTag>[2]) => patchTag(categoryId, id, d),
    onMove: (id: string, dir: "up" | "down") => moveTag(categoryId, id, dir),
    onDelete: (tag: TagRow) => setDeleteTarget({ tag, categoryId }),
    onReassign: (tag: TagRow, to: string | null) => reassignTag(categoryId, tag, to),
  });

  return (
    <div className="flex flex-col gap-8">
      {/* 한눈에 보기 */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="전체 태그" value={allTags.length} />
        <Stat label="사용 중" value={allTags.length - unusedCount} />
        <Stat label="미사용" value={unusedCount} hint={unusedCount > 0 ? "정리 후보" : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="태그 검색" aria-label="태그 검색" className="a-input" style={{ maxWidth: 240, height: 40 }} />
        <label className="flex items-center gap-2 text-sm cursor-pointer px-1" style={{ minHeight: 40 }}>
          <input type="checkbox" checked={unusedOnly} onChange={(e) => setUnusedOnly(e.target.checked)} />
          사용되지 않는 태그만 ({unusedCount})
        </label>
      </div>

      {categories.map((category, i) => (
        <CategorySection
          key={category.id}
          category={category}
          index={i}
          total={categories.length}
          visibleTags={category.tags.filter(matches)}
          rowProps={rowProps(category.id)}
          onMove={(dir) => moveCategory(category.id, dir)}
          onPatch={(d) => patchCategory(category.id, d)}
          onRemove={() => removeCategory(category)}
          onCreateTag={(name) => createTag(category.id, name)}
        />
      ))}

      {unclassified.length > 0 && (
        <section className="a-card p-4 sm:p-5 space-y-3">
          <div className="space-y-1">
            <h2 className="text-[15px] font-semibold">미분류</h2>
            <p className="text-xs" style={{ color: "var(--a-dim)" }}>분류가 정해지지 않은 태그예요. 오른쪽의 분류 선택에서 알맞은 곳으로 옮겨주세요.</p>
          </div>
          <ul className="divide-y" style={{ borderColor: "var(--a-line)" }}>
            {unclassified.filter(matches).map((tag, i, arr) => (
              <TagItem key={tag.id} tag={tag} index={i} total={arr.length} hideMove {...rowProps(null)} />
            ))}
          </ul>
        </section>
      )}

      {/* 새 분류 */}
      <section className="a-card p-4 sm:p-5 space-y-3">
        <h2 className="text-[15px] font-semibold">분류 추가</h2>
        <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); void createCategory(); }}>
          <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="분류 이름 (예: 분위기)" aria-label="새 분류 이름" className="a-input" style={{ height: 44 }} />
          <select value={newCategoryType} onChange={(e) => setNewCategoryType(e.target.value as SelectionType)} aria-label="선택 방식" className="a-input" style={{ height: 44, width: "auto" }}>
            <option value="MULTI">여러 개 선택</option>
            <option value="SINGLE">하나만 선택</option>
          </select>
          <button type="submit" className="a-btn a-btn-primary" style={{ height: 44, minWidth: 96 }} disabled={!newCategoryName.trim()}>추가</button>
        </form>
      </section>

      <AdminModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget && (deleteTarget.tag.spaces.length > 0 || deleteTarget.tag.recordCount > 0) ? `'${deleteTarget.tag.name}' 태그를 비활성화할까요?` : `'${deleteTarget?.tag.name}' 태그를 삭제할까요?`}
        footer={
          <>
            <button type="button" className="a-btn" onClick={() => setDeleteTarget(null)}>취소</button>
            <button type="button" className="a-btn a-btn-danger" onClick={confirmDelete}>
              {deleteTarget && (deleteTarget.tag.spaces.length > 0 || deleteTarget.tag.recordCount > 0) ? "비활성화" : "삭제"}
            </button>
          </>
        }
      >
        {deleteTarget && (deleteTarget.tag.spaces.length > 0 || deleteTarget.tag.recordCount > 0)
          ? `이 태그는 현재 ${deleteTarget.tag.spaces.length}개 공간${deleteTarget.tag.recordCount > 0 ? `과 방문 기록 ${deleteTarget.tag.recordCount}건` : ""}에서 사용 중입니다. 지우지 않고 비활성화만 해서, 새 공간에는 고를 수 없지만 기존 연결은 유지돼요.`
          : "쓰는 곳이 없는 태그예요."}
      </AdminModal>

      <Toast message={toast} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="a-card p-4 flex flex-col gap-2 min-h-[88px]">
      <p className="text-xs" style={{ color: "var(--a-dim)" }}>{label}</p>
      <p className="text-[26px] font-bold tracking-tight leading-none tabular-nums">{value}</p>
      {hint && <p className="text-[11px]" style={{ color: "var(--a-faint)" }}>{hint}</p>}
    </div>
  );
}

interface RowShared {
  categoryOptions: { id: string; name: string }[];
  categoryId: string | null;
  onPatch: (id: string, d: Partial<Pick<TagRow, "name" | "description" | "isActive" | "useForRecommendation">>) => Promise<boolean>;
  onMove: (id: string, dir: "up" | "down") => void;
  onDelete: (tag: TagRow) => void;
  onReassign: (tag: TagRow, to: string | null) => void;
}

function CategorySection({
  category, index, total, visibleTags, rowProps, onMove, onPatch, onRemove, onCreateTag,
}: {
  category: CategoryRow;
  index: number;
  total: number;
  visibleTags: TagRow[];
  rowProps: RowShared;
  onMove: (d: "up" | "down") => void;
  onPatch: (d: Partial<Pick<CategoryRow, "name" | "selectionType" | "isActive">>) => Promise<boolean>;
  onRemove: () => void;
  onCreateTag: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(category.name);
  const [newTag, setNewTag] = useState("");
  const [open, setOpen] = useState(false);

  async function add() {
    const v = newTag.trim();
    if (!v) return;
    if (await onCreateTag(v)) setNewTag("");
  }

  return (
    <section className="a-card p-4 sm:p-5 space-y-4" style={{ opacity: category.isActive ? 1 : 0.6 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold">{category.name} <span className="font-normal text-sm" style={{ color: "var(--a-dim)" }}>{category.tags.length}개 · {category.selectionType === "SINGLE" ? "하나만 선택" : "여러 개 선택"}{!category.isActive && " · 비활성"}</span></h2>
        </div>
        <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? "분류 설정 닫기" : "분류 설정"}</button>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-md" style={{ background: "var(--a-soft)" }}>
          <button type="button" className="a-btn a-btn-sm" disabled={index === 0} onClick={() => onMove("up")} aria-label="분류 위로">▲</button>
          <button type="button" className="a-btn a-btn-sm" disabled={index === total - 1} onClick={() => onMove("down")} aria-label="분류 아래로">▼</button>
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name.trim() !== category.name && onPatch({ name: name.trim() })} aria-label="분류 이름" className="a-input" style={{ maxWidth: 180, height: 34 }} />
          <select value={category.selectionType} onChange={(e) => onPatch({ selectionType: e.target.value as SelectionType })} aria-label="선택 방식" className="a-input" style={{ width: "auto", height: 34, fontSize: 12 }}>
            <option value="MULTI">여러 개 선택</option>
            <option value="SINGLE">하나만 선택</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={category.isActive} onChange={(e) => onPatch({ isActive: e.target.checked })} />활성</label>
          <button type="button" className="a-btn a-btn-danger a-btn-sm ml-auto" onClick={onRemove}>분류 삭제</button>
        </div>
      )}

      {visibleTags.length === 0 ? (
        <p className="text-sm py-2" style={{ color: "var(--a-dim)" }}>{category.tags.length === 0 ? "아직 태그가 없어요." : "조건에 맞는 태그가 없어요."}</p>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--a-line)" }}>
          {visibleTags.map((tag, i) => (
            <TagItem key={tag.id} tag={tag} index={i} total={visibleTags.length} {...rowProps} />
          ))}
        </ul>
      )}

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder={`${category.name}에 태그 추가`} aria-label={`${category.name} 새 태그`} className="a-input" style={{ height: 42 }} />
        <button type="submit" className="a-btn a-btn-primary" style={{ height: 42, minWidth: 80 }} disabled={!newTag.trim()}>추가</button>
      </form>
    </section>
  );
}

function TagItem({ tag, index, total, hideMove, categoryOptions, categoryId, onPatch, onMove, onDelete, onReassign }: RowShared & { tag: TagRow; index: number; total: number; hideMove?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(tag.name);
  const [description, setDescription] = useState(tag.description);
  const [saving, setSaving] = useState(false);
  const spaceCount = tag.spaces.length;
  const unused = spaceCount === 0 && tag.recordCount === 0;
  const dirty = name.trim() !== tag.name || description !== tag.description;
  const spacesLabel = useMemo(() => tag.spaces.map((s) => s.name).join(", "), [tag.spaces]);

  async function save() {
    setSaving(true);
    await onPatch(tag.id, { name: name.trim(), description });
    setSaving(false);
  }

  return (
    <li className="py-3" style={{ opacity: tag.isActive ? 1 : 0.55 }}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex-1 min-w-0 text-left flex flex-wrap items-center gap-x-3 gap-y-1" style={{ minHeight: 40 }}>
          <span className="text-[15px] font-medium">{tag.name}</span>
          <span className="text-xs" style={{ color: unused ? "var(--a-faint)" : "var(--a-dim)" }}>
            {unused ? "사용 안 함" : `공간 ${spaceCount}곳${tag.recordCount > 0 ? ` · 기록 ${tag.recordCount}건` : ""}`}
          </span>
          {!tag.isActive && <span className="text-[11px] px-1.5 rounded" style={{ background: "var(--a-soft)", color: "var(--a-dim)" }}>비활성</span>}
        </button>
        <button type="button" className="a-btn a-btn-sm shrink-0" onClick={() => setOpen((v) => !v)}>{open ? "닫기" : "관리"}</button>
      </div>

      {open && (
        <div className="mt-3 space-y-4 p-3 sm:p-4 rounded-md" style={{ background: "var(--a-soft)" }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs" style={{ color: "var(--a-dim)" }}>이름
              <input value={name} onChange={(e) => setName(e.target.value)} className="a-input" style={{ color: "var(--a-fg)" }} />
            </label>
            <label className="space-y-1 text-xs" style={{ color: "var(--a-dim)" }}>설명 (선택)
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="a-input" style={{ color: "var(--a-fg)" }} />
            </label>
          </div>
          {spaceCount > 0 && name.trim() !== tag.name && (
            <p className="text-xs" style={{ color: "#b54708" }}>이 태그는 현재 {spaceCount}개 공간에서 사용 중이에요. 이름을 바꾸면 공간에 붙은 태그도 함께 바뀌어요.</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={tag.useForRecommendation} onChange={(e) => onPatch(tag.id, { useForRecommendation: e.target.checked })} />추천 계산에 포함</label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={tag.isActive} onChange={(e) => onPatch(tag.id, { isActive: e.target.checked })} />활성 (공간 등록에서 선택 가능)</label>
            <select value={categoryId ?? UNCLASSIFIED} onChange={(e) => onReassign(tag, e.target.value === UNCLASSIFIED ? null : e.target.value)} aria-label="분류" className="a-input" style={{ width: "auto", height: 32, fontSize: 12 }}>
              <option value={UNCLASSIFIED}>미분류</option>
              {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!hideMove && (
              <span className="flex gap-1">
                <button type="button" className="a-btn a-btn-sm" disabled={index === 0} onClick={() => onMove(tag.id, "up")} aria-label="위로">▲</button>
                <button type="button" className="a-btn a-btn-sm" disabled={index === total - 1} onClick={() => onMove(tag.id, "down")} aria-label="아래로">▼</button>
              </span>
            )}
          </div>

          <div className="text-xs space-y-1">
            <p className="font-medium">사용 중인 공간 {spaceCount}곳</p>
            {spaceCount === 0 ? <p style={{ color: "var(--a-dim)" }}>이 태그를 쓰는 공간이 없어요.</p> : (
              <ul className="space-y-0.5" style={{ color: "var(--a-dim)" }} title={spacesLabel}>
                {tag.spaces.map((s) => <li key={s.slug}>{s.name} <span style={{ color: "var(--a-faint)" }}>· {s.where}</span></li>)}
              </ul>
            )}
          </div>

          <div className="flex justify-between gap-2">
            <button type="button" className="a-btn a-btn-danger a-btn-sm" onClick={() => onDelete(tag)}>{unused ? "삭제" : "비활성화"}</button>
            <button type="button" className="a-btn a-btn-primary a-btn-sm" onClick={save} disabled={saving || !dirty || !name.trim()}>{saving ? "저장 중..." : "저장"}</button>
          </div>
        </div>
      )}
    </li>
  );
}
