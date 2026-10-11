"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { canChangeNickname, nextNicknameChangeAt } from "@/lib/nickname";
import { formatDotDate } from "@/lib/time";
import ProfileSettingsSection, { type ProfileSettingsValue } from "@/components/profile/ProfileSettingsSection";
import SettingsSection from "@/components/settings/SettingsSection";

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

/**
 * 설정 내용 — 닉네임 · 공개 프로필 · 계정(로그아웃). 설정 페이지(/settings)에서 쓴다.
 * 저장 · 로그아웃 동작은 그대로(/api/users/me PATCH, next-auth signOut) — 화면만 사용자 화면 디자인 언어로.
 */
export default function SettingsForm({ nickname, nicknameUpdatedAt, profile, onSaved, autoFocus }: SettingsFormProps) {
  const [nickValue, setNickValue] = useState(nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
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
    <div>
      <SettingsSection title="닉네임" description="방명록과 공개 프로필에 보이는 이름이에요. 30일에 한 번 바꿀 수 있어요.">
        <label htmlFor="settings-nickname" className="sr-only">닉네임</label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            id="settings-nickname"
            ref={inputRef}
            autoFocus={autoFocus}
            value={nickValue}
            onChange={(e) => setNickValue(e.target.value.slice(0, 12))}
            placeholder="2~12자"
            maxLength={12}
            className="w-full sm:flex-1 min-w-0 h-12 px-3.5 text-base border outline-none focus:border-[var(--ed-fg)]"
            style={{ borderColor: "var(--ed-line)", background: "var(--ed-bg)", color: "var(--ed-fg)" }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
          <button type="button" onClick={handleSave} disabled={!dirty || saving || !changeAllowed} className="ed-btn ed-btn-primary sm:w-28">
            {saving ? "저장 중..." : savedFlash ? "저장됨 ✓" : "저장"}
          </button>
        </div>
        {nextChangeAt && (
          <p className="pt-2 text-sm" style={{ color: "var(--ed-dim)" }}>다음 변경 가능일: {formatDotDate(nextChangeAt)}</p>
        )}
        {error && <p className="pt-2 text-sm" role="alert" style={{ color: "#b42318" }}>{error}</p>}
      </SettingsSection>

      {profile && <ProfileSettingsSection initial={profile} />}

      <SettingsSection title="계정">
        <button
          type="button"
          onClick={() => { if (!signingOut) { setSigningOut(true); signOut({ callbackUrl: "/" }); } }}
          disabled={signingOut}
          className="ed-btn w-full sm:w-auto sm:min-w-40"
          style={{ borderColor: "var(--ed-line)" }}
        >
          {signingOut ? "로그아웃 중..." : "로그아웃"}
        </button>
      </SettingsSection>
    </div>
  );
}
