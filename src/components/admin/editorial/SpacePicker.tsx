"use client";

import { useMemo, useState } from "react";
import { adminButtonClass } from "@/components/admin/ui";
import type { EditorialStatusValue } from "@/lib/editorial/types";
import { EditorialStatusBadge } from "./EditorialControls";

export interface SpaceOption {
  id: string;
  name: string;
  area: string;
  category: string;
  status: EditorialStatusValue;
}

export interface LinkedSpaceValue {
  spaceId: string;
  note: string;
}

/**
 * 연결 공간 선택 — 공간 콘텐츠(EditorialSpace)만 고를 수 있다(운영 공간·Cube와 무관).
 * 순서 ↑↓, 메모, 제거. 발행되지 않은 공간은 공개 화면에서 자동으로 빠진다는 점을 표시한다.
 */
export default function SpacePicker({ options, value, onChange, notePlaceholder = "카드에 붙일 한 줄 메모(선택)" }: { options: SpaceOption[]; value: LinkedSpaceValue[]; onChange: (v: LinkedSpaceValue[]) => void; notePlaceholder?: string }) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const selected = new Set(value.map((v) => v.spaceId));
  const candidates = options
    .filter((o) => !selected.has(o.id) && o.status !== "ARCHIVED")
    .filter((o) => !query.trim() || `${o.name} ${o.area} ${o.category}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8);

  function move(i: number, d: -1 | 1) {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {value.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--a-dim)" }}>아직 연결한 공간이 없어요.</p>
      ) : (
        <ol className="a-card divide-y">
          {value.map((item, i) => {
            const o = byId.get(item.spaceId);
            return (
              <li key={item.spaceId} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center" style={{ borderColor: "var(--a-line)" }}>
                <span className="w-6 text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium flex items-center gap-2">
                    {o?.name ?? "(삭제된 공간)"}
                    {o && o.status !== "PUBLISHED" && <EditorialStatusBadge status={o.status} />}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>{o ? `${o.area} · ${o.category}` : ""}</p>
                </div>
                <input
                  value={item.note}
                  onChange={(e) => onChange(value.map((v, k) => (k === i ? { ...v, note: e.target.value } : v)))}
                  placeholder={notePlaceholder}
                  className="a-input sm:max-w-[260px]"
                  style={{ height: 32, fontSize: 13 }}
                />
                <span className="flex gap-0.5 shrink-0">
                  <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">↑</button>
                  <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="아래로">↓</button>
                  <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="연결 해제">✕</button>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="space-y-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="공간 이름 · 지역 · 유형으로 검색해서 추가" className="a-input max-w-sm" />
        {candidates.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {candidates.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => { onChange([...value, { spaceId: o.id, note: "" }]); setQuery(""); }} className={adminButtonClass("secondary", "sm")}>
                  + {o.name}
                  <span className="text-[11px]" style={{ color: "var(--a-dim)" }}>{o.area}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>
            {options.length === 0 ? "먼저 공간 콘텐츠를 등록해주세요." : "추가할 수 있는 공간이 없어요."}
          </p>
        )}
      </div>
    </div>
  );
}
