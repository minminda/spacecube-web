"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminFormField, adminButtonClass } from "@/components/admin/ui";
import type { EditorialStatusValue } from "@/lib/editorial/types";

/** 발행 ↔ 초안 전환(서버 응답 후 새로고침 — 공개 여부가 화면과 어긋나지 않게). */
export default function CuratorAdminControls({ kind, id, status }: { kind: "curators" | "curator-collections"; id: string; status: EditorialStatusValue }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next: EditorialStatusValue = status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  async function change() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/${kind}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(data.error ?? "변경하지 못했어요.");
      else router.refresh();
    } catch {
      setError("네트워크 오류로 변경하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className={adminButtonClass("ghost", "sm")} disabled={busy} onClick={change}>
        {busy ? "변경 중…" : next === "PUBLISHED" ? "발행" : "초안으로"}
      </button>
      {error && <span className="text-xs" style={{ color: "var(--a-danger)" }}>{error}</span>}
    </span>
  );
}

export function NewCuratorForm() {
  const router = useRouter();
  const [v, setV] = useState({ identifier: "", slug: "", name: "", bio: "", tasteTags: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/curators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, tasteTags: v.tasteTags.split(",").map((t) => t.trim()).filter(Boolean) }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setMsg(data.error ?? "만들지 못했어요.");
      else {
        setV({ identifier: "", slug: "", name: "", bio: "", tasteTags: "" });
        setMsg("초안 큐레이터 프로필을 만들었어요.");
        router.refresh();
      }
    } catch {
      setMsg("네트워크 오류로 만들지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="a-card p-4 grid gap-4 sm:grid-cols-2 max-w-3xl">
      <AdminFormField label="사용자" required help="이메일 또는 닉네임(정확히 일치)">
        <input className="a-input" value={v.identifier} onChange={set("identifier")} />
      </AdminFormField>
      <AdminFormField label="주소(slug)" required help="/curators/…">
        <input className="a-input" value={v.slug} onChange={set("slug")} placeholder="minji" />
      </AdminFormField>
      <AdminFormField label="큐레이터 이름" required>
        <input className="a-input" value={v.name} onChange={set("name")} />
      </AdminFormField>
      <AdminFormField label="대표 취향" optional help="쉼표로 구분, 최대 6개">
        <input className="a-input" value={v.tasteTags} onChange={set("tasteTags")} placeholder="조용한, 책, 혼자" />
      </AdminFormField>
      <div className="sm:col-span-2">
        <AdminFormField label="한 줄 소개" required>
          <input className="a-input" value={v.bio} onChange={set("bio")} />
        </AdminFormField>
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" className={adminButtonClass("primary")} disabled={busy}>{busy ? "만드는 중…" : "초안으로 만들기"}</button>
        {msg && <span className="text-xs" style={{ color: "var(--a-dim)" }}>{msg}</span>}
      </div>
    </form>
  );
}
