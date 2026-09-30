"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import AdminModal from "@/components/admin/ui/AdminModal";
import { adminButtonClass } from "@/components/admin/ui";

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
      <button type="button" onClick={() => setOpen(true)} className={adminButtonClass("ghost", "sm")}>
        삭제
      </button>

      <AdminModal
        open={open}
        onClose={() => { if (!loading) setOpen(false); }}
        title="이 운영 공간을 삭제할까요?"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} disabled={loading} className={adminButtonClass("secondary")}>취소</button>
            <button type="button" onClick={handleDelete} disabled={loading} className={adminButtonClass("danger")}>
              {loading ? "삭제 중..." : "삭제"}
            </button>
          </>
        }
      >
        &ldquo;{spaceName}&rdquo;의 모든 기록, 스캔 데이터, 대기자 정보가 함께 삭제됩니다.
        이 작업은 되돌릴 수 없습니다.
      </AdminModal>

      <Toast message={toast} />
    </>
  );
}
