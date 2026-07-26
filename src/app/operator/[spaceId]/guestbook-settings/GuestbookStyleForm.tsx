"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ClusterStyleFields from "@/components/guestbook/ClusterStyleFields";
import { DEFAULT_QUESTION_FONT_SIZE, DEFAULT_QUESTION_COLOR } from "@/lib/guestbookClusterStyle";

interface Initial {
  question1: string | null;
  question2: string | null;
  question1FontSize: number;
  question2FontSize: number;
  question1Color: string;
  question2Color: string;
}

export default function GuestbookStyleForm({ spaceId, initial }: { spaceId: string; initial: Initial }) {
  const router = useRouter();
  const [fields, setFields] = useState({
    question1FontSize: initial.question1FontSize,
    question2FontSize: initial.question2FontSize,
    question1Color: initial.question1Color,
    question2Color: initial.question2Color,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetToDefault() {
    setFields({
      question1FontSize: DEFAULT_QUESTION_FONT_SIZE,
      question2FontSize: DEFAULT_QUESTION_FONT_SIZE,
      question1Color: DEFAULT_QUESTION_COLOR,
      question2Color: DEFAULT_QUESTION_COLOR,
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/operator/spaces/${spaceId}/guestbook-style`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "저장에 실패했습니다.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="flex flex-col gap-6">
      <ClusterStyleFields
        title={`질문 1 — ${initial.question1 || "(질문 없음)"}`}
        fontSize={fields.question1FontSize}
        color={fields.question1Color}
        onFontSize={(v) => setFields((p) => ({ ...p, question1FontSize: v }))}
        onColor={(v) => setFields((p) => ({ ...p, question1Color: v }))}
      />
      <ClusterStyleFields
        title={`질문 2 — ${initial.question2 || "(질문 없음)"}`}
        fontSize={fields.question2FontSize}
        color={fields.question2Color}
        onFontSize={(v) => setFields((p) => ({ ...p, question2FontSize: v }))}
        onColor={(v) => setFields((p) => ({ ...p, question2Color: v }))}
      />

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>미리보기</p>
        <div className="w-full p-6 flex flex-col items-center justify-center gap-4 min-h-[140px]" style={{ background: "#000" }}>
          <p style={{ fontSize: fields.question1FontSize, color: fields.question1Color }}>
            {initial.question1 || "질문 1 예시 문구"}
          </p>
          <p style={{ fontSize: fields.question2FontSize, color: fields.question2Color }}>
            {initial.question2 || "질문 2 예시 문구"}
          </p>
        </div>
      </div>

      {error && <p className="text-xs" style={{ color: "#f66" }}>{error}</p>}

      <div className="flex gap-2 flex-wrap items-center">
        <button
          type="button"
          onClick={resetToDefault}
          className="text-sm px-4 py-2.5 border transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          기본값으로 되돌리기
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {saving ? "저장 중..." : "변경사항 저장"}
        </button>
        {saved && <span className="text-xs" style={{ color: "var(--dim)" }}>방명록 화면 설정이 저장되었습니다.</span>}
      </div>
    </div>
  );
}
