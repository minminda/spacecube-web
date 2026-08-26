"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import { formatFileSize, MAX_MATERIAL_FILE_SIZE } from "@/lib/materials/validation";

interface MaterialItem {
  id: string;
  title: string;
  fileUrl: string;
  originalFileName: string;
  fileSize: number;
}

interface Props {
  initialMaterials: MaterialItem[];
}

export default function MaterialsManager({ initialMaterials }: Props) {
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [materials, setMaterials] = useState(initialMaterials);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [replacingId, setReplacingId] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [pendingReplaceId, setPendingReplaceId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<MaterialItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function pickFile(f: File | undefined | null): boolean {
    if (!f) return false;
    // 일부 Windows 환경은 .pdf의 File.type을 빈 문자열로 보고하는 경우가 있어(레지스트리 MIME 연결
    // 문제), MIME 대신 확장자로 1차 체크한다 — 진짜 내용물 검증은 서버가 매직 바이트로 한다.
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      showToast("PDF 파일만 올릴 수 있어요.");
      return false;
    }
    if (f.size > MAX_MATERIAL_FILE_SIZE) {
      showToast(`파일이 너무 커요. 최대 ${MAX_MATERIAL_FILE_SIZE / 1024 / 1024}MB까지 가능해요.`);
      return false;
    }
    return true;
  }

  async function handleUpload() {
    if (!title.trim()) {
      showToast("제목을 입력해주세요.");
      return;
    }
    if (!file) {
      showToast("PDF 파일을 선택해주세요.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("file", file);
      const res = await fetch("/api/admin/materials", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error ?? "업로드에 실패했어요.");
        return;
      }
      setMaterials((prev) => [data, ...prev]);
      setTitle("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showToast("업로드 완료!");
    } finally {
      setUploading(false);
    }
  }

  async function handleReplaceFile(id: string, newFile: File) {
    if (!pickFile(newFile)) return;
    setReplacingId(id);
    try {
      const form = new FormData();
      form.append("file", newFile);
      const res = await fetch(`/api/admin/materials/${id}`, { method: "PATCH", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error ?? "교체에 실패했어요.");
        return;
      }
      setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)));
      showToast("파일이 교체됐어요. 링크는 그대로예요.");
    } finally {
      setReplacingId(null);
      setPendingReplaceId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/materials/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error ?? "삭제에 실패했어요.");
        return;
      }
      setMaterials((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast("삭제됐어요.");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      showToast("링크를 복사했어요.");
    } catch {
      showToast("복사에 실패했어요. 링크를 직접 선택해 복사해주세요.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 border space-y-3" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 새 자료 업로드</p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="자료 제목 (예: 공간큐브 설치 안내)"
          className="w-full px-3 py-2 text-sm border bg-transparent"
          style={{ borderColor: "var(--border)" }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && !pickFile(f)) {
              e.target.value = "";
              setFile(null);
              return;
            }
            setFile(f);
          }}
          className="w-full text-sm"
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="py-2 px-4 text-sm border transition-colors disabled:opacity-50 hover:bg-[var(--fg)] hover:text-[var(--bg)]"
          style={{ borderColor: "var(--fg)" }}
        >
          {uploading ? "업로드 중..." : "업로드"}
        </button>
      </div>

      {materials.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>&gt; 업로드된 자료가 없어.</p>
      ) : (
        <div className="space-y-3">
          {materials.map((m) => (
            <div key={m.id} className="p-4 border space-y-3" style={{ borderColor: "var(--border)" }}>
              <div className="space-y-1 text-xs" style={{ color: "var(--dim)" }}>
                <p style={{ color: "var(--fg)" }}>&gt; {m.title}</p>
                <p>파일     : {m.originalFileName} ({formatFileSize(m.fileSize)})</p>
                <p className="break-all">
                  링크     : <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--fg)" }}>{m.fileUrl}</a>
                </p>
              </div>
              <div className="flex gap-3 text-xs flex-wrap items-center">
                <button
                  onClick={() => copyLink(m.fileUrl)}
                  className="border px-3 py-1 transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                  style={{ borderColor: "var(--fg)" }}
                >
                  [링크 복사]
                </button>
                <button
                  onClick={() => {
                    setPendingReplaceId(m.id);
                    replaceInputRef.current?.click();
                  }}
                  disabled={replacingId === m.id}
                  className="border px-3 py-1 transition-colors disabled:opacity-50"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  {replacingId === m.id ? "교체 중..." : "[파일 교체]"}
                </button>
                <button
                  onClick={() => setDeleteTarget(m)}
                  className="border px-3 py-1 transition-colors hover:border-red-500 hover:text-red-500"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [삭제]
                </button>
              </div>
              {pendingReplaceId === m.id && (
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleReplaceFile(m.id, f);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="w-full max-w-sm p-6 space-y-5 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <div className="space-y-2">
              <p className="text-sm font-semibold">정말 이 자료를 삭제하시겠습니까?</p>
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                &ldquo;{deleteTarget.title}&rdquo; 링크가 즉시 사라지고, 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2 text-sm border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
