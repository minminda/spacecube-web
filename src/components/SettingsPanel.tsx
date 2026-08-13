"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import SettingsIcon from "@/components/SettingsIcon";
import { canChangeNickname, nextNicknameChangeAt } from "@/lib/nickname";
import { formatDotDate } from "@/lib/time";

interface Props {
  nickname: string | null;
  /** 마지막 닉네임 변경 시각(ISO) — 30일 쿨다운 판정·표시에 쓴다. 없으면 즉시 변경 가능. */
  nicknameUpdatedAt: string | null;
}

export default function SettingsPanel({ nickname, nicknameUpdatedAt }: Props) {
  const [open, setOpen] = useState(false);
  const [nickValue, setNickValue] = useState(nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

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
    setTimeout(() => { setSavedFlash(false); setOpen(false); }, 900);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-11 h-11 -m-2.5 flex-shrink-0"
        style={{ color: "var(--dim)" }}
        aria-label="설정"
      >
        <SettingsIcon className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-sm p-6 space-y-6" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>설정</p>
              <button onClick={() => setOpen(false)} className="text-lg leading-none" style={{ color: "var(--dim)" }}>×</button>
            </div>

            <div className="space-y-5">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--fg)" }}>프로필</p>

              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--dim)" }}>닉네임</p>
                <input
                  ref={inputRef}
                  value={nickValue}
                  onChange={(e) => setNickValue(e.target.value.slice(0, 12))}
                  placeholder="2~12자"
                  maxLength={12}
                  className="w-full text-sm bg-transparent border-b outline-none pb-2"
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
        </div>
      )}
    </>
  );
}
