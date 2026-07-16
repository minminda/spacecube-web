"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ToggleSwitch from "@/components/ToggleSwitch";

type DayPreset = 1 | 15 | "last";

const PRESETS: { value: DayPreset; label: string }[] = [
  { value: 1, label: "매월 1일" },
  { value: 15, label: "매월 15일" },
  { value: "last", label: "매월 마지막 날" },
];

interface Props {
  spaceId: string;
  initialEnabled: boolean;
  initialPreset: DayPreset;
  ownerEmail: string | null;
  /** 자동 이메일 발송 기능이 켜져 있는지. 파일럿 기간(false)에는 발송 활성화 토글·발송 이메일
      표시를 숨기고 "리포트 기준일"만 설정하게 한다(기준일은 수동 리포트 생성에 필요). */
  emailEnabled?: boolean;
}

export default function ReportSendSettingsForm({ spaceId, initialEnabled, initialPreset, ownerEmail, emailEnabled = false }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [preset, setPreset] = useState<DayPreset>(initialPreset);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/spaces/${spaceId}/report-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportEnabled: enabled, dayPreset: preset }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="space-y-5">
      {emailEnabled && (
        <ToggleSwitch label="이 공간의 월간 리포트 발송 활성화" checked={enabled} onChange={setEnabled} />
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{emailEnabled ? "발송 주기 · 기준일" : "리포트 기준일"}</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>매월, 선택한 날짜에 지난 한 달의 리포트가 집계됩니다.</p>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={String(p.value)}
              type="button"
              onClick={() => setPreset(p.value)}
              className="text-xs px-3 py-1.5 border transition-colors"
              style={{
                borderColor: preset === p.value ? "var(--fg)" : "var(--border)",
                background: preset === p.value ? "var(--fg)" : "transparent",
                color: preset === p.value ? "var(--bg)" : "var(--dim)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {emailEnabled && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>발송 이메일</p>
          <p className="text-sm" style={{ color: ownerEmail ? "var(--fg)" : "var(--border)" }}>
            {ownerEmail ?? "이 공간에 연결된 운영자 계정이 없습니다."}
          </p>
          <p className="text-xs" style={{ color: "var(--dim)" }}>이 공간에 연결된 운영자 계정의 이메일을 그대로 사용합니다.</p>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="py-3 px-4 text-sm font-medium border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
        style={{ borderColor: "var(--fg)" }}
      >
        {saving ? "저장 중..." : saved ? "저장됨 ✓" : emailEnabled ? "발송 설정 저장" : "기준일 저장"}
      </button>
    </div>
  );
}
