"use client";

import { useEffect, useState } from "react";

export default function MonthlyMemo({ spaceId, reportId }: { spaceId: string; reportId: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // reportId가 바뀌면 부모가 key={reportId}로 이 컴포넌트를 새로 마운트하므로
    // loading은 항상 useState(true) 초기값에서 시작한다 — 여기서 다시 set할 필요 없음.
    fetch(`/api/operator/spaces/${spaceId}/monthly-note?reportId=${reportId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setContent(data.content ?? "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId, reportId]);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/operator/spaces/${spaceId}/monthly-note?reportId=${reportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 월간 운영 메모</p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
        운영자만 볼 수 있는 메모예요. 예) 이번 달에는 혼자 오는 손님이 많았다. 다음 달에는 음악을 조금 바꿔볼까.
      </p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={loading}
        placeholder="이번 달 공간에 대해 남기고 싶은 생각을 자유롭게 적어보세요."
        rows={4}
        className="w-full text-sm px-3 py-2.5 border resize-none outline-none"
        style={{ background: "var(--bg)", color: "var(--fg)", borderColor: "var(--border)" }}
      />
      <button
        type="button"
        onClick={save}
        disabled={saving || loading}
        className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
        style={{ borderColor: "var(--fg)" }}
      >
        {saving ? "저장 중..." : saved ? "저장됨 ✓" : "메모 저장"}
      </button>
    </div>
  );
}
