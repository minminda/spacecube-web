"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TagRow {
  tagId: string;
  name: string;
  category: string | null;
  linked: boolean;
  weight: number;
  isPrimary: boolean;
  visibleToUsers: boolean;
}

export default function SpaceTagManager({ spaceId, tags }: { spaceId: string; tags: TagRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(tags);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(tagId: string, patch: Partial<TagRow>) {
    setRows((prev) => prev.map((r) => (r.tagId === tagId ? { ...r, ...patch } : r)));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const links = rows
      .filter((r) => r.linked)
      .map((r) => ({ tagId: r.tagId, weight: r.weight, isPrimary: r.isPrimary, visibleToUsers: r.visibleToUsers }));

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

  const grouped = groupByCategory(rows);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs" style={{ color: "var(--dim)" }}>
        연결한 태그만 사용자 기록 화면과 추천 계산에 사용됩니다. 예) 조용한: 1.0, 집중되는: 0.8, 따뜻한: 0.4
      </p>

      {tags.length === 0 && (
        <p className="text-sm" style={{ color: "var(--dim)" }}>활성화된 태그가 없습니다. 먼저 태그 관리에서 태그를 추가해주세요.</p>
      )}

      {grouped.map(([category, group]) => (
        <div key={category} className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{category}</p>
          <div className="space-y-2">
            {group.map((row) => (
              <div key={row.tagId} className="p-3 border space-y-2" style={{ borderColor: "var(--border)", opacity: row.linked ? 1 : 0.5 }}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={row.linked} onChange={(e) => update(row.tagId, { linked: e.target.checked })} />
                    {row.name}
                  </label>
                </div>
                {row.linked && (
                  <div className="flex flex-wrap items-center gap-4 pl-6">
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
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={save}
        disabled={saving}
        className="py-3 text-sm font-medium border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
        style={{ borderColor: "var(--fg)" }}
      >
        {saving ? "저장 중..." : saved ? "저장됨 ✓" : "태그 연결 저장"}
      </button>
    </div>
  );
}

function groupByCategory(rows: TagRow[]): [string, TagRow[]][] {
  const map = new Map<string, TagRow[]>();
  for (const row of rows) {
    const key = row.category || "미분류";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return [...map.entries()];
}
