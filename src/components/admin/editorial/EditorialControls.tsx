"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminModal from "@/components/admin/ui/AdminModal";
import { StatusBadge, adminButtonClass } from "@/components/admin/ui";
import { STATUS_LABEL, type EditorialStatusValue } from "@/lib/editorial/types";

export type EditorialKind = "spaces" | "curations" | "people";

const TONE = { DRAFT: "draft", PUBLISHED: "live", ARCHIVED: "off" } as const;

export function EditorialStatusBadge({ status }: { status: EditorialStatusValue }) {
  return <StatusBadge tone={TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>;
}

async function postStatus(kind: EditorialKind, id: string, status: EditorialStatusValue): Promise<string | null> {
  const res = await fetch(`/api/admin/editorial/${kind}/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (res.ok) return null;
  if (res.status === 401) return "로그인이 만료되었어요. 다시 로그인해주세요.";
  const data = await res.json().catch(() => ({}));
  return data.error ?? "상태를 바꾸지 못했어요.";
}

interface SaveBarProps {
  kind: EditorialKind;
  id?: string;
  status?: EditorialStatusValue;
  publicHref?: string;
  dirty: boolean;
  saving: boolean;
  /** 저장 성공 여부 */
  onSave: () => Promise<boolean>;
  error?: string | null;
}

/**
 * 하단 고정 저장 바 — [미리보기 ↗] [저장] [발행하기 / 발행 취소]. 발행할 때 저장하지 않은 변경이 있으면
 * 먼저 저장한 뒤 발행한다. 새 콘텐츠는 항상 초안으로 만들어진다.
 */
export function EditorialSaveBar({ kind, id, status, publicHref, dirty, saving, onSave, error }: SaveBarProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function changeStatus(next: EditorialStatusValue) {
    if (!id) return;
    setBusy(true);
    setStatusError(null);
    try {
      if (dirty && !(await onSave())) return;
      const err = await postStatus(kind, id, next);
      if (err) setStatusError(err);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const disabled = saving || busy;
  const message = error ?? statusError;

  return (
    <div className="sticky bottom-0 z-30 -mx-4 md:mx-0 px-4 md:px-0 py-3 space-y-2" style={{ background: "var(--a-bg)", borderTop: "1px solid var(--a-line)" }}>
      {message && <p className="text-xs" style={{ color: "var(--a-danger)" }}>{message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--a-dim)" }}>
          {status ? <EditorialStatusBadge status={status} /> : <span>새 콘텐츠는 초안으로 저장됩니다</span>}
          {dirty && <span>· 저장하지 않은 변경사항</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {id && publicHref && (
            <a href={publicHref} target="_blank" rel="noopener noreferrer" className={adminButtonClass("ghost")}>
              {status === "PUBLISHED" ? "공개 페이지 ↗" : "미리보기 ↗"}
            </a>
          )}
          <button type="button" onClick={() => onSave()} disabled={disabled || (!!id && !dirty)} className={adminButtonClass("secondary")}>
            {saving ? "저장 중..." : id ? "저장" : "초안 저장"}
          </button>
          {id && status === "PUBLISHED" && (
            <button type="button" onClick={() => changeStatus("DRAFT")} disabled={disabled} className={adminButtonClass("secondary")}>
              발행 취소
            </button>
          )}
          {id && status === "DRAFT" && (
            <button type="button" onClick={() => changeStatus("PUBLISHED")} disabled={disabled} className={adminButtonClass("primary")}>
              {dirty ? "저장 후 발행" : "발행하기"}
            </button>
          )}
          {id && status === "PUBLISHED" && dirty && (
            <span className="text-[11px]" style={{ color: "var(--a-dim)" }}>저장하면 바로 공개 페이지에 반영돼요</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface Reference {
  label: string;
  href: string;
}

/** 위험 영역 — 보관(기본 삭제 동작) / 복원 / 영구 삭제(보관 + 참조 없음일 때만). */
export function EditorialDangerZone({ kind, id, status, name }: { kind: EditorialKind; id: string; status: EditorialStatusValue; name: string }) {
  const router = useRouter();
  const [modal, setModal] = useState<"archive" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);

  async function archive() {
    setBusy(true);
    const err = await postStatus(kind, id, "ARCHIVED");
    setBusy(false);
    setModal(null);
    if (err) setError(err);
    else router.refresh();
  }

  async function restore() {
    setBusy(true);
    const err = await postStatus(kind, id, "DRAFT");
    setBusy(false);
    if (err) setError(err);
    else router.refresh();
  }

  async function hardDelete() {
    setBusy(true);
    setError(null);
    setReferences([]);
    const res = await fetch(`/api/admin/editorial/${kind}/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setModal(null);
    if (res.ok) {
      router.push(`/admin/content/${kind}`);
      router.refresh();
      return;
    }
    setError(data.error ?? "삭제하지 못했어요.");
    if (Array.isArray(data.references)) setReferences(data.references);
  }

  return (
    <section className="a-card p-5 md:p-6 space-y-4" style={{ borderColor: "#f0d0cc" }}>
      <div className="space-y-1">
        <h2 className="text-[15px] font-semibold">위험 영역</h2>
        <p className="text-xs leading-relaxed" style={{ color: "var(--a-dim)" }}>
          {status === "ARCHIVED"
            ? "보관된 콘텐츠는 공개 화면에 나오지 않습니다. 초안으로 복원하거나, 어디에서도 쓰이지 않는다면 영구 삭제할 수 있어요."
            : "보관하면 공개 화면에서 내려가고 언제든 복원할 수 있어요. 영구 삭제는 보관한 뒤에만 가능합니다."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {status !== "ARCHIVED" ? (
          <button type="button" onClick={() => setModal("archive")} disabled={busy} className={adminButtonClass("secondary")}>보관하기</button>
        ) : (
          <>
            <button type="button" onClick={restore} disabled={busy} className={adminButtonClass("secondary")}>초안으로 복원</button>
            <button type="button" onClick={() => setModal("delete")} disabled={busy} className={adminButtonClass("danger")}>영구 삭제</button>
          </>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: "var(--a-danger)" }}>{error}</p>}
      {references.length > 0 && (
        <div className="text-xs space-y-1">
          <p style={{ color: "var(--a-dim)" }}>사용 중인 곳 — 연결을 먼저 해제해주세요:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {references.map((r, i) => (
              <li key={i}><Link href={r.href} className="underline underline-offset-4">{r.label}</Link></li>
            ))}
          </ul>
        </div>
      )}

      <AdminModal
        open={modal === "archive"}
        onClose={() => !busy && setModal(null)}
        title={`“${name}”을(를) 보관할까요?`}
        footer={
          <>
            <button type="button" onClick={() => setModal(null)} disabled={busy} className={adminButtonClass("secondary")}>취소</button>
            <button type="button" onClick={archive} disabled={busy} className={adminButtonClass("primary")}>{busy ? "처리 중..." : "보관"}</button>
          </>
        }
      >
        공개 화면에서 바로 내려갑니다. 데이터는 그대로 남고 언제든 초안으로 복원할 수 있어요.
      </AdminModal>
      <AdminModal
        open={modal === "delete"}
        onClose={() => !busy && setModal(null)}
        title={`“${name}”을(를) 영구 삭제할까요?`}
        footer={
          <>
            <button type="button" onClick={() => setModal(null)} disabled={busy} className={adminButtonClass("secondary")}>취소</button>
            <button type="button" onClick={hardDelete} disabled={busy} className={adminButtonClass("danger")}>{busy ? "삭제 중..." : "영구 삭제"}</button>
          </>
        }
      >
        되돌릴 수 없습니다. 다른 콘텐츠나 홈 설정에서 쓰이고 있으면 삭제되지 않아요. (업로드한 이미지 원본은 Cloudinary에 남습니다.)
      </AdminModal>
    </section>
  );
}
