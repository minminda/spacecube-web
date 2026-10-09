"use client";
import { useState, useRef, useId } from "react";
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
  const nicknameId = useId();

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
    <div className="space-y-8 md:space-y-10">
      <div className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>프로필</h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>공간큐브에서 사용할 이름이에요. 30일마다 바꿀 수 있어요.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor={nicknameId} className="block text-sm font-medium" style={{ color: "var(--fg)" }}>닉네임</label>
          <input
            id={nicknameId}
            ref={inputRef}
            autoFocus={autoFocus}
            value={nickValue}
            onChange={(e) => setNickValue(e.target.value.slice(0, 12))}
            placeholder="2~12자"
            maxLength={12}
            className="w-full min-h-12 text-base bg-transparent border-b outline-none py-3"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
          {nextChangeAt && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
              다음 변경 가능일: {formatDotDate(nextChangeAt)}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleSave}
          disabled={!dirty || saving || !changeAllowed}
          className="w-full min-h-12 text-base font-medium px-5 py-3 border transition-colors disabled:opacity-40 hover:enabled:bg-[var(--tag-bg)]"
          style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
        >
          {saving ? "저장 중..." : savedFlash ? "저장됨 ✓" : "저장"}
        </button>
        {error && <p role="alert" className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{error}</p>}
      </div>

      {profile && <ProfileSettingsSection initial={profile} />}

      <div className="space-y-5 pt-8 md:pt-10" style={{ borderTop: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>계정</h2>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full min-h-12 px-5 py-3 text-base font-medium border transition-colors hover:bg-[var(--tag-bg)]"
          style={{ color: "var(--fg)", borderColor: "var(--border)" }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
