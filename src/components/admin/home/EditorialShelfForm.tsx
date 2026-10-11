"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminButtonClass } from "@/components/admin/ui";
import SpacePicker, { type LinkedSpaceValue, type SpaceOption } from "@/components/admin/editorial/SpacePicker";

/** 편집 선반 수정 — 제목 · 설명 · 노출 · 포함 공간(순서 · 카드에 붙는 선정 이유). */
export default function EditorialShelfForm({
  id, initial, spaceOptions,
}: {
  id: string;
  initial: { title: string; description: string; visible: boolean; spaces: LinkedSpaceValue[] };
  spaceOptions: SpaceOption[];
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function set<K extends keyof typeof v>(k: K, x: (typeof v)[K]) {
    setV((p) => ({ ...p, [k]: x }));
    setDirty(true);
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/home-shelves/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: v.title, description: v.description, visible: v.visible, spaces: v.spaces.map((s) => ({ spaceId: s.spaceId, note: s.note })) }),
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

  async function remove() {
    if (!window.confirm("이 선반을 삭제할까요? 담긴 공간 자체는 지워지지 않아요.")) return;
    const res = await fetch(`/api/admin/home-shelves/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/content/home");
    else setMsg({ ok: false, text: "삭제하지 못했어요." });
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold">선반 제목</span>
          <input value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={60} className="a-input w-full" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold">한 줄 설명 <span style={{ color: "var(--a-dim)" }} className="font-normal">(선택)</span></span>
          <input value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={200} className="a-input w-full" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={v.visible} onChange={(e) => set("visible", e.target.checked)} className="w-4 h-4" />
          HOME에 노출
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">담을 공간 <span className="text-xs font-normal" style={{ color: "var(--a-dim)" }}>{v.spaces.length}/30 · 순서가 HOME 카드 순서예요</span></p>
        <SpacePicker
          options={spaceOptions}
          value={v.spaces}
          onChange={(x) => set("spaces", x)}
          notePlaceholder="선정 이유(비우면 큐레이션 이유 → 한 줄 소개)"
        />
        <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>공개(발행)된 공간만 HOME에 나와요. 초안 · 보관 공간은 자동으로 빠집니다.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={!dirty || saving} className={adminButtonClass("primary")}>{saving ? "저장 중…" : "저장"}</button>
        <a href="/" target="_blank" rel="noreferrer" className={adminButtonClass("secondary")}>HOME에서 보기 ↗</a>
        <button type="button" onClick={remove} className={adminButtonClass("ghost")}>선반 삭제</button>
        {msg && <span className="text-xs" style={{ color: msg.ok ? "var(--a-fg)" : "#b42318" }} role="status">{msg.text}</span>}
      </div>
    </div>
  );
}
