"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";

interface Props {
  spaceId: string;
  spaceName: string;
}

export default function DeleteSpaceButton({ spaceId, spaceName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast, showToast } = useToast();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/spaces/${spaceId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      setOpen(false);
      showToast("공간이 삭제되었습니다.");
      setTimeout(() => router.refresh(), 500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border px-3 py-1 transition-colors hover:border-red-500 hover:text-red-500"
        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
      >
        [삭제]
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-sm p-6 space-y-5 border"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold">정말 이 공간을 삭제하시겠습니까?</p>
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                &ldquo;{spaceName}&rdquo;의 모든 기록, 스캔 데이터, 대기자 정보가 함께 삭제됩니다.
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 py-2 text-sm border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2 text-sm border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
              >
                {loading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </>
  );
}
