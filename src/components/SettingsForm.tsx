"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { canChangeNickname, nextNicknameChangeAt } from "@/lib/nickname";
import { formatDotDate } from "@/lib/time";
import ProfileSettingsSection, { type ProfileSettingsValue } from "@/components/profile/ProfileSettingsSection";

export interface SettingsFormProps {
  nickname: string | null;
  /** 마지막 닉네임 변경 시각(ISO) — 30일 쿨다운 판정·표시에 쓴다. 없으면 즉시 변경 가능. */
  nicknameUpdatedAt: string | null;
  /** 공개 취향 프로필 설정 — 넘기면 "공개 프로필" 구획을 보여준다(새 정보구조를 볼 수 있을 때만) */
  profile?: ProfileSettingsValue;
  /** 닉네임 저장 직후(패널이면 닫기) */
  onSaved?: () => void;
  autoFocus?: boolean;
}

/** 설정 내용 — 닉네임 · 공개 프로필 · 로그아웃. 설정 페이지(/settings)와 예전 화면의 설정 패널이 같은 폼을 쓴다. */
export default function SettingsForm({ nickname, nicknameUpdatedAt, profile, onSaved, autoFocus }: SettingsFormProps) {
  const [nickValue, setNickValue] = useState(nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const lastChangedAt = nicknameUpdatedAt ? new Date(nicknameUpdatedAt) : null;
  const cooldownActive = !canChangeNickname(lastChangedAt);
  const nextChangeAt = cooldownActive ? nextNicknameChangeAt(lastChangedAt) : null;
  const dirty = nickValue.trim() !== (nickname ?? "");
  const changeAllowed = !dirty || !cooldownActive;

  async function handleSave() {
    if (!dirty || saving || !changeAllowed) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: nickValue }) });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "저장에 실패했습니다");
      return;
    }
    setSavedFlash(true);
    router.refresh();
    setTimeout(() => { setSavedFlash(false); onSaved?.(); }, 900);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--fg)" }}>프로필</p>

        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--dim)" }}>닉네임</p>
          <input
            ref={inputRef}
            autoFocus={autoFocus}
            value={nickValue}
            onChange={(e) => setNickValue(e.target.value.slice(0, 12))}
            placeholder="2~12자"
            maxLength={12}
            className="w-full text-base md:text-sm bg-transparent border-b outline-none pb-2"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
          {nextChangeAt && (
            <p className="text-xs" style={{ color: "var(--dim)" }}>
              다음 변경 가능일: {formatDotDate(nextChangeAt)}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleSave}
          disabled={!dirty || saving || !changeAllowed}
          className="w-full text-sm font-medium py-3 border transition-colors disabled:opacity-40 hover:enabled:bg-[var(--fg)] hover:enabled:text-[var(--bg)]"
          style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
        >
          {saving ? "저장 중..." : savedFlash ? "저장됨 ✓" : "저장"}
        </button>
        {error && <p className="text-xs" style={{ color: "var(--dim)" }}>{error}</p>}
      </div>

      {profile && <ProfileSettingsSection initial={profile} />}

      <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--fg)" }}>계정</p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-xs w-full text-left py-2"
          style={{ color: "var(--dim)" }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
