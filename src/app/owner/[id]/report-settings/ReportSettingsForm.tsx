"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ToggleSwitch from "@/components/ToggleSwitch";

interface Settings {
  reportStartDate: string; // yyyy-mm-dd, 빈 문자열이면 미설정
  reportEnabled: boolean;
  operatorNotifyEmail: string;
  operatorNotifyPhone: string;
}

export default function ReportSettingsForm({ spaceId, initial }: { spaceId: string; initial: Settings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/spaces/${spaceId}/report-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportStartDate: settings.reportStartDate || null,
        reportTimezone: "Asia/Seoul",
        reportEnabled: settings.reportEnabled,
        operatorNotifyEmail: settings.operatorNotifyEmail || null,
        operatorNotifyPhone: settings.operatorNotifyPhone || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const labelClass = "text-xs uppercase tracking-widest";
  const labelStyle = { color: "var(--dim)" };
  const inputStyle = { background: "transparent", borderColor: "var(--border)", color: "var(--fg)" };

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>리포트 시작일</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          이 날짜를 기준으로 매달 집계 구간이 계산됩니다. 예) 7월 1일 시작 → 첫 구간 7/1~8/1 → 8/1 첫 리포트 공개.
        </p>
        <input
          type="date"
          value={settings.reportStartDate}
          onChange={(e) => set("reportStartDate", e.target.value)}
          className="w-full border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={inputStyle}
        />
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>리포트 사용 여부</p>
        <ToggleSwitch label="이 공간의 월간 리포트 활성화" checked={settings.reportEnabled} onChange={(v) => set("reportEnabled", v)} />
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>운영자 알림</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          현재는 실제 문자/이메일 발송을 하지 않습니다 — 이후 알림 연동을 위해 연락처만 저장해둡니다.
        </p>
        <div className="space-y-2">
          <label className="space-y-1 block">
            <span className="text-xs" style={{ color: "var(--dim)" }}>이메일</span>
            <input
              value={settings.operatorNotifyEmail}
              onChange={(e) => set("operatorNotifyEmail", e.target.value)}
              placeholder="operator@example.com"
              className="w-full border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
              style={inputStyle}
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs" style={{ color: "var(--dim)" }}>전화번호</span>
            <input
              value={settings.operatorNotifyPhone}
              onChange={(e) => set("operatorNotifyPhone", e.target.value)}
              placeholder="010-0000-0000"
              className="w-full border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
              style={inputStyle}
            />
          </label>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="py-3 text-sm font-medium border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
        style={{ borderColor: "var(--fg)" }}
      >
        {saving ? "저장 중..." : saved ? "저장됨 ✓" : "리포트 설정 저장"}
      </button>
    </div>
  );
}

