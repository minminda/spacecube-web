"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteRecordButton({ recordId }: { recordId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/records/${recordId}`, { method: "DELETE" });
    router.push("/archive");
    router.refresh();
  }

  if (confirm) {
    return (
      <div className="flex gap-3 items-center">
        <p className="text-xs" style={{ color: "var(--dim)" }}>정말 삭제할까?</p>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs"
          style={{ color: "var(--fg)" }}
        >
          {loading ? "..." : "[삭제]"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs"
          style={{ color: "var(--dim)" }}
        >
          [취소]
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs"
      style={{ color: "var(--dim)" }}
    >
      기록 삭제 _
    </button>
  );
}
