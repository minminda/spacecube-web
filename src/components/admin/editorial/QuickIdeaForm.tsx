"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminFormField, adminButtonClass } from "@/components/admin/ui";
import { EDITORIAL_PRIORITIES, PIPELINE_KIND_LABEL, PRIORITY_LABEL, type EditorialPriorityValue, type PipelineKind } from "@/lib/editorial/pipeline";

const KINDS: PipelineKind[] = ["people", "thoughts", "curations"];

/**
 * 백로그 [아이디어 추가] — 유형 · 제목/아이디어 · 메모 · 참고 링크 · 우선순위 · 담당자만 받아 IDEA 단계 초안을 만든다.
 * 대표 이미지·본문·공간은 강제하지 않는다(제작을 시작할 때 전체 편집 화면에서 채운다).
 */
export default function QuickIdeaForm({ assigneeOptions }: { assigneeOptions: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PipelineKind>("people");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [links, setLinks] = useState("");
  const [priority, setPriority] = useState<EditorialPriorityValue>("MEDIUM");
  const [assignee, setAssignee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/admin/editorial/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, note, referenceLinks: links.split(/\s+/).filter(Boolean), priority, assignee }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 401 ? "로그인이 만료되었어요. 다시 로그인해주세요." : data.error ?? "저장하지 못했어요.");
        return;
      }
      setDone(`“${title.trim()}” 아이디어를 ${PIPELINE_KIND_LABEL[kind]}로 추가했어요.`);
      setTitle("");
      setNote("");
      setLinks("");
      setPriority("MEDIUM");
      router.refresh();
    } catch {
      setError("네트워크 오류로 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className={adminButtonClass("primary")}>+ 아이디어 추가</button>
        {done && <p className="text-xs" style={{ color: "var(--a-dim)" }}>{done}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="a-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold">아이디어 추가</h2>
        <button type="button" onClick={() => setOpen(false)} className={adminButtonClass("ghost", "sm")}>닫기</button>
      </div>
      <AdminFormField label="유형" required>
        <div className="flex gap-1.5" role="radiogroup" aria-label="유형">
          {KINDS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={kind === k ? "a-btn a-btn-primary a-btn-sm" : "a-btn a-btn-sm"}>
              {PIPELINE_KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </AdminFormField>
      <AdminFormField label="제목 / 아이디어" required>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="a-input" placeholder={kind === "curations" ? "혼자 오래 머물고 싶은 연남" : kind === "people" ? "북눅 연남 운영자 인터뷰" : "왜 어떤 공간은 오래 기억에 남을까"} required />
      </AdminFormField>
      <AdminFormField label="메모" optional>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="a-input" style={{ height: "auto", padding: "10px 12px", resize: "vertical" }} />
      </AdminFormField>
      <AdminFormField label="참고 링크" optional help="한 줄에 하나 — Instagram, 웹사이트, 기사, 공간 홈페이지.">
        <textarea value={links} onChange={(e) => setLinks(e.target.value)} rows={2} className="a-input" style={{ height: "auto", padding: "10px 12px", resize: "vertical" }} placeholder="https://" />
      </AdminFormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminFormField label="우선순위">
          <div className="flex gap-1.5" role="radiogroup" aria-label="우선순위">
            {EDITORIAL_PRIORITIES.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={priority === p} onClick={() => setPriority(p)} className={priority === p ? "a-btn a-btn-primary a-btn-sm" : "a-btn a-btn-sm"}>
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
        </AdminFormField>
        <AdminFormField label="담당자" optional>
          <input value={assignee} onChange={(e) => setAssignee(e.target.value)} list="idea-assignees" className="a-input" placeholder="이름" />
          <datalist id="idea-assignees">{assigneeOptions.map((a) => <option key={a} value={a} />)}</datalist>
        </AdminFormField>
      </div>
      {error && <p className="text-xs" style={{ color: "var(--a-danger)" }}>{error}</p>}
      {done && <p className="text-xs" style={{ color: "var(--a-dim)" }}>{done}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={busy || !title.trim()} className={adminButtonClass("primary")}>{busy ? "저장 중..." : "아이디어로 저장"}</button>
      </div>
    </form>
  );
}
