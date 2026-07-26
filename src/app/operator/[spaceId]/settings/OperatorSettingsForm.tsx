"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ToggleSwitch from "@/components/ToggleSwitch";

interface Initial {
  operatorContactName: string | null;
  operatorContactEmail: string | null;
  operatorReportEmail: string | null;
  operatorReportEmailEnabled: boolean;
}

const inputStyle = { borderColor: "var(--border)", color: "var(--fg)" } as const;

export default function OperatorSettingsForm({ spaceId, initial }: { spaceId: string; initial: Initial }) {
  const router = useRouter();

  const [profile, setProfile] = useState({
    operatorContactName: initial.operatorContactName ?? "",
    operatorContactEmail: initial.operatorContactEmail ?? "",
    operatorReportEmail: initial.operatorReportEmail ?? "",
    operatorReportEmailEnabled: initial.operatorReportEmailEnabled,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    const res = await fetch(`/api/operator/spaces/${spaceId}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await res.json().catch(() => ({}));
    setProfileSaving(false);
    if (!res.ok) {
      setProfileError(data.error ?? "저장에 실패했습니다.");
      return;
    }
    setProfileSaved(true);
    router.refresh();
    setTimeout(() => setProfileSaved(false), 2500);
  }

  async function changePin() {
    setPinError(null);
    setPinSaved(false);
    if (currentPin.length !== 4 || newPin.length !== 4) {
      setPinError("비밀번호는 숫자 4자리여야 해요.");
      return;
    }
    if (newPin !== newPinConfirm) {
      setPinError("새 비밀번호가 서로 일치하지 않아요.");
      return;
    }
    setPinSaving(true);
    const res = await fetch(`/api/operator/spaces/${spaceId}/pin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin, newPin }),
    });
    const data = await res.json().catch(() => ({}));
    setPinSaving(false);
    if (!res.ok) {
      setPinError(data.error === "INVALID_CURRENT" ? "현재 비밀번호가 올바르지 않아요." : data.error ?? "변경에 실패했습니다.");
      return;
    }
    setCurrentPin("");
    setNewPin("");
    setNewPinConfirm("");
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 2500);
  }

  async function logout() {
    await fetch("/api/operator/logout", { method: "POST" });
    router.push("/operator");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>운영자 정보</p>

        <Field label="운영자명">
          <input
            value={profile.operatorContactName}
            onChange={(e) => setProfile((p) => ({ ...p, operatorContactName: e.target.value }))}
            className="w-full text-sm px-3 py-2.5 border bg-transparent"
            style={inputStyle}
          />
        </Field>

        <Field label="연락 이메일">
          <input
            type="email"
            value={profile.operatorContactEmail}
            onChange={(e) => setProfile((p) => ({ ...p, operatorContactEmail: e.target.value }))}
            className="w-full text-sm px-3 py-2.5 border bg-transparent"
            style={inputStyle}
          />
        </Field>

        <div style={{ borderTop: "1px solid var(--border)" }} />

        <ToggleSwitch
          label="월간 리포트 이메일 수신"
          checked={profile.operatorReportEmailEnabled}
          onChange={(v) => setProfile((p) => ({ ...p, operatorReportEmailEnabled: v }))}
        />

        <Field label="수신 이메일">
          <input
            type="email"
            value={profile.operatorReportEmail}
            onChange={(e) => setProfile((p) => ({ ...p, operatorReportEmail: e.target.value }))}
            placeholder="example@email.com"
            className="w-full text-sm px-3 py-2.5 border bg-transparent"
            style={inputStyle}
          />
        </Field>

        {profileError && <p className="text-xs" style={{ color: "#f66" }}>{profileError}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveProfile}
            disabled={profileSaving}
            className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
            style={{ borderColor: "var(--fg)" }}
          >
            {profileSaving ? "저장 중..." : "저장"}
          </button>
          {profileSaved && <span className="text-xs" style={{ color: "var(--dim)" }}>저장되었습니다.</span>}
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>운영 비밀번호 변경</p>

        <Field label="현재 비밀번호">
          <PinInput value={currentPin} onChange={setCurrentPin} />
        </Field>
        <Field label="새 비밀번호">
          <PinInput value={newPin} onChange={setNewPin} />
        </Field>
        <Field label="새 비밀번호 확인">
          <PinInput value={newPinConfirm} onChange={setNewPinConfirm} />
        </Field>

        {pinError && <p className="text-xs" style={{ color: "#f66" }}>{pinError}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={changePin}
            disabled={pinSaving}
            className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
            style={{ borderColor: "var(--fg)" }}
          >
            {pinSaving ? "변경 중..." : "비밀번호 변경"}
          </button>
          {pinSaved && <span className="text-xs" style={{ color: "var(--dim)" }}>변경되었습니다.</span>}
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <button
        type="button"
        onClick={logout}
        className="text-sm px-4 py-2.5 border transition-colors self-start"
        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
      >
        로그아웃
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs" style={{ color: "var(--dim)" }}>{label}</span>
      {children}
    </label>
  );
}

function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      pattern="\d*"
      maxLength={4}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
      placeholder="••••"
      className="w-full text-center text-lg tracking-[0.5em] px-3 py-2.5 border bg-transparent"
      style={inputStyle}
    />
  );
}
