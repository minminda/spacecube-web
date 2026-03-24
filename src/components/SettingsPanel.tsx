"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface Props {
  nickname: string | null;
}

export default function SettingsPanel({ nickname }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(nickname ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: value }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs"
        style={{ color: "var(--dim)" }}
        aria-label="설정"
      >
        ⚙
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-sm p-6 space-y-6"
            style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}
          >
            <div className="flex justify-between items-center">
              <p className="text-xs" style={{ color: "var(--dim)" }}>// 설정</p>
              <button
                onClick={() => setOpen(false)}
                className="text-xs"
                style={{ color: "var(--dim)" }}
              >
                [✕]
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>닉네임</p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value.slice(0, 20))}
                  placeholder="최대 20자"
                  maxLength={20}
                  className="flex-1 text-sm bg-transparent border-b outline-none pb-1"
                  style={{ borderColor: "var(--dim)", color: "var(--fg)" }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-3 py-1 border transition-colors hover:border-[var(--fg)]"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  {saving ? "..." : "[저장]"}
                </button>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs w-full text-left py-2 border-t"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              로그아웃 _
            </button>
          </div>
        </div>
      )}
    </>
  );
}
