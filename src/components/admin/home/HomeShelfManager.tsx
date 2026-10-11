"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge, adminButtonClass } from "@/components/admin/ui";
import type { PlanItem } from "@/lib/home/shelfConfig";
import type { ShelfDiagnosis } from "@/lib/home/shelfDiagnosis";

const DIAG_COLOR = { ok: "#1f7a4a", warn: "#b54708", off: "#6b6b6b", info: "#175cd3" } as const;

const KIND_LABEL = { SYSTEM: "SYSTEM", PERSONALIZED: "PERSONALIZED", EDITORIAL: "EDITORIAL" } as const;
const KIND_TONE = { SYSTEM: "static", PERSONALIZED: "neutral", EDITORIAL: "live" } as const;

interface Row {
  key: string;
  kind: PlanItem["kind"];
  label: string;
  hint: string;
  defaultTitle: string;
  titleEditable: boolean;
  visible: boolean;
  title: string;
  editorialId?: string;
  /** 편집 선반: 지금 HOME에 실제로 나오는가(공개 공간이 없으면 숨겨진다) */
  spaceCount?: number;
}

/**
 * HOME 선반 관리 — 모든 선반의 노출 · 순서(↑↓) · 제목을 한 목록에서.
 * SYSTEM / PERSONALIZED는 내용을 지정하지 않고 노출 · 순서 · (일부) 제목만 바꾼다. EDITORIAL은 [공간 편집]으로 포함 공간을 고른다.
 */
export default function HomeShelfManager({ plan, editorialCounts, diagnoses }: { plan: PlanItem[]; editorialCounts: Record<string, number>; diagnoses: Record<string, ShelfDiagnosis> }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    plan.map((p) => ({
      key: p.key, kind: p.kind, label: p.label, hint: p.hint, defaultTitle: p.defaultTitle, titleEditable: p.titleEditable,
      visible: p.visible, title: p.titleOverride ?? (p.kind === "EDITORIAL" ? p.defaultTitle : ""), editorialId: p.editorialId, spaceCount: editorialCounts[p.key],
    })),
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");

  function patch(i: number, p: Partial<Row>) {
    setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p } : x)));
    setDirty(true);
    setMsg(null);
  }
  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    setRows((r) => {
      const n = [...r];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    setDirty(true);
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/home-shelves", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: rows.map((r) => ({ key: r.key, visible: r.visible, title: r.title.trim() || null })) }),
    });
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      setMsg({ ok: true, text: "저장했어요. HOME에 바로 반영됩니다." });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg({ ok: false, text: res.status === 401 ? "로그인이 만료되었어요." : (data.error ?? "저장하지 못했어요.") });
    }
  }

  async function create() {
    const title = newTitle.trim();
    if (!title) return;
    if (dirty && !window.confirm("저장하지 않은 변경이 있어요. 선반을 만들면 이 화면이 새로고침돼요. 계속할까요?")) return;
    const res = await fetch("/api/admin/home-shelves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) router.push(`/admin/content/home/shelves/${data.id}`);
    else setMsg({ ok: false, text: data.error ?? "선반을 만들지 못했어요." });
  }

  return (
    <div className="space-y-4">
      <ol className="a-card divide-y">
        {rows.map((r, i) => {
          const isEd = r.kind === "EDITORIAL";
          return (
            <li key={r.key} className="flex flex-col gap-2 px-3 py-3 lg:flex-row lg:items-center" style={{ borderColor: "var(--a-line)", opacity: r.visible ? 1 : 0.55 }}>
              <span className="flex items-center gap-2 lg:w-[180px] shrink-0">
                <span className="w-6 text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{isEd ? r.title || "(제목 없음)" : r.label}</span>
                  <StatusBadge tone={KIND_TONE[r.kind]}>{KIND_LABEL[r.kind]}</StatusBadge>
                </span>
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                {r.titleEditable ? (
                  <input
                    value={r.title}
                    onChange={(e) => patch(i, { title: e.target.value })}
                    placeholder={isEd ? "선반 제목" : r.defaultTitle}
                    maxLength={60}
                    className="a-input w-full"
                    style={{ height: 32, fontSize: 13 }}
                    aria-label={`${r.label} 제목`}
                  />
                ) : (
                  <p className="text-[13px]" style={{ color: "var(--a-dim)" }}>{r.defaultTitle} <span className="text-[11px]">· 제목 고정</span></p>
                )}
                <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>
                  {isEd ? `공간 ${r.spaceCount ?? 0}곳 담김` : r.hint}
                </p>
                {/* 저장 전 노출 토글은 즉시 반영해 보여 준다(서버 진단은 저장된 상태 기준) */}
                {(() => {
                  const d = diagnoses[r.key];
                  const live: ShelfDiagnosis | undefined = !r.visible ? { tone: "off", label: "관리자 숨김", detail: "노출을 켜면 HOME에 나와요" } : d && d.tone === "off" ? undefined : d;
                  if (!live) return null;
                  return (
                    <p className="text-[11px] font-medium" style={{ color: DIAG_COLOR[live.tone] }} data-testid={`diag-${r.key}`}>
                      ● {live.label}{live.detail ? <span className="font-normal" style={{ color: "var(--a-dim)" }}> · {live.detail}</span> : null}
                    </p>
                  );
                })()}
              </div>
              <span className="flex items-center gap-1 shrink-0">
                <label className="flex items-center gap-1.5 text-xs pr-2">
                  <input type="checkbox" checked={r.visible} onChange={(e) => patch(i, { visible: e.target.checked })} className="w-4 h-4" />
                  노출
                </label>
                {isEd && r.editorialId && <Link href={`/admin/content/home/shelves/${r.editorialId}`} className={adminButtonClass("secondary", "sm")}>공간 편집</Link>}
                <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">↑</button>
                <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="아래로">↓</button>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={!dirty || saving} className={adminButtonClass("primary")}>{saving ? "저장 중…" : "순서 · 노출 저장"}</button>
        {dirty && !saving && <span className="text-xs" style={{ color: "var(--a-dim)" }}>저장하지 않은 변경이 있어요.</span>}
        {msg && <span className="text-xs" style={{ color: msg.ok ? "var(--a-fg)" : "#b42318" }} role="status">{msg.text}</span>}
      </div>

      <div className="a-card p-4 space-y-2">
        <p className="text-sm font-semibold">+ 편집 선반 만들기</p>
        <p className="text-xs" style={{ color: "var(--a-dim)" }}>예: 음악을 들으러 가고 싶은 공간 · 후암에서 천천히 머물기 좋은 곳. 만들면 숨김 상태로 시작하고, 공간을 담은 뒤 노출을 켜세요.</p>
        <div className="flex gap-2">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="선반 제목" maxLength={60} className="a-input flex-1" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void create(); } }} />
          <button type="button" onClick={create} disabled={!newTitle.trim()} className={adminButtonClass("secondary")}>만들기</button>
        </div>
      </div>
    </div>
  );
}
