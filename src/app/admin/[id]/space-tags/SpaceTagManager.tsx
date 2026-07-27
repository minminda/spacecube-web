"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TagRow {
  tagId: string;
  name: string;
  weight: number;
  isPrimary: boolean;
  visibleToUsers: boolean;
}

interface Group {
  categoryName: string;
  rows: TagRow[];
}

export default function SpaceTagManager({ spaceId, groups }: { spaceId: string; groups: Group[] }) {
  const router = useRouter();
  const [state, setState] = useState(groups);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(tagId: string, patch: Partial<TagRow>) {
    setState((prev) => prev.map((g) => ({ ...g, rows: g.rows.map((r) => (r.tagId === tagId ? { ...r, ...patch } : r)) })));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const links = state.flatMap((g) => g.rows).map((r) => ({ tagId: r.tagId, weight: r.weight, isPrimary: r.isPrimary, visibleToUsers: r.visibleToUsers }));

    const res = await fetch(`/api/spaces/${spaceId}/space-tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ links }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs" style={{ color: "var(--dim)" }}>
        예) 조용한: 1.0, 집중되는: 0.8, 따뜻한: 0.4 — 가중치가 높을수록 추천 계산에서 더 크게 반영됩니다.
      </p>

      {state.length === 0 && (
        <p className="text-sm" style={{ color: "var(--dim)" }}>연결된 태그가 없습니다. 공간 수정에서 태그를 먼저 골라주세요.</p>
      )}

      {state.map((group) => (
        <div key={group.categoryName} className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{group.categoryName}</p>
          <div className="space-y-2">
            {group.rows.map((row) => (
              <div key={row.tagId} className="p-3 border space-y-2" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm">{row.name}</p>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs" style={{ color: "var(--dim)" }}>
                    가중치
                    <input
                      type="number" min={0} max={2} step={0.1}
                      value={row.weight}
                      onChange={(e) => update(row.tagId, { weight: Number(e.target.value) })}
                      className="w-16 bg-transparent border px-2 py-1 text-xs outline-none focus:border-[var(--fg)]"
                      style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--dim)" }}>
                    <input type="checkbox" checked={row.isPrimary} onChange={(e) => update(row.tagId, { isPrimary: e.target.checked })} />
                    주요 태그
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--dim)" }}>
                    <input type="checkbox" checked={row.visibleToUsers} onChange={(e) => update(row.tagId, { visibleToUsers: e.target.checked })} />
                    사용자 화면 노출
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {state.length > 0 && (
        <button
          onClick={save}
          disabled={saving}
          className="py-3 text-sm font-medium border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {saving ? "저장 중..." : saved ? "저장됨 ✓" : "가중치 저장"}
        </button>
      )}
    </div>
  );
}
