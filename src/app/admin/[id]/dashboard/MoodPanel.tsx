"use client";

import { useState } from "react";

const PRESETS = [
  "지금은 비교적 조용한 흐름이에요.",
  "오늘은 작업하는 손님이 많아요.",
  "대화보다는 혼자 머무는 분위기에 가까워요.",
  "지금은 여유롭게 머물기 좋은 시간이에요.",
];

interface Props {
  spaceId: string;
  initialMood: string | null;
}

export default function MoodPanel({ spaceId, initialMood }: Props) {
  const [mood, setMood] = useState(initialMood ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(value: string) {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/spaces/${spaceId}/mood`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood: value }),
    });
    if (res.ok) {
      setMood(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function clear() {
    await save("");
    setMood("");
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 지금의 공간 상태</p>
        {mood && (
          <button
            onClick={clear}
            className="text-xs"
            style={{ color: "var(--border)" }}
          >
            지우기
          </button>
        )}
      </div>

      {/* 현재 상태 미리보기 */}
      {mood ? (
        <p
          className="text-sm leading-relaxed pl-3"
          style={{ borderLeft: "2px solid var(--fg)", color: "var(--fg)" }}
        >
          &ldquo;{mood}&rdquo;
        </p>
      ) : (
        <p className="text-sm" style={{ color: "var(--border)" }}>
          현재 설정된 분위기 문장이 없습니다.
        </p>
      )}

      {/* 프리셋 */}
      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>빠른 선택</p>
        <div className="space-y-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => save(preset)}
              disabled={saving}
              className="w-full text-left text-xs px-3 py-2 border transition-colors disabled:opacity-40"
              style={
                mood === preset
                  ? { borderColor: "var(--fg)", color: "var(--fg)" }
                  : { borderColor: "var(--border)", color: "var(--dim)" }
              }
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* 직접 입력 */}
      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>직접 입력</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={!PRESETS.includes(mood) ? mood : ""}
            onChange={(e) => setMood(e.target.value)}
            placeholder="지금의 분위기를 한 문장으로…"
            maxLength={60}
            className="flex-1 bg-transparent border px-3 py-2 text-xs outline-none focus:border-[var(--fg)] transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          />
          <button
            onClick={() => save(mood)}
            disabled={saving || !mood.trim()}
            className="text-xs px-3 py-2 border transition-colors disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            {saved ? "저장됨" : saving ? "…" : "저장"}
          </button>
        </div>
      </div>
    </section>
  );
}
