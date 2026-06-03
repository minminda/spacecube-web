"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

type Visibility = "PRIVATE" | "PARTIAL" | "LINK_ONLY";

const VISIBILITY_LABELS: Record<Visibility, string> = {
  PRIVATE: "나만 보기",
  LINK_ONLY: "링크로만 공개",
  PARTIAL: "일부 공개",
};

const VIS_HINT: Record<Visibility, string> = {
  PRIVATE: "나만 볼 수 있어",
  LINK_ONLY: "링크를 아는 사람만 볼 수 있어",
  PARTIAL: "비슷한 취향에서 발견될 수 있어",
};

interface Props { nickname: string | null; visibility: Visibility; userId: string; }

export default function SettingsPanel({ nickname, visibility, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [nickValue, setNickValue] = useState(nickname ?? "");
  const [vis, setVis] = useState<Visibility>(visibility);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: nickValue, visibility: vis }) });
    setSaving(false); setOpen(false); router.refresh();
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/taste/${userId}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs" style={{ color: "var(--dim)" }} aria-label="설정">⚙</button>

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

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>닉네임</p>
              <input
                ref={inputRef}
                value={nickValue}
                onChange={(e) => setNickValue(e.target.value.slice(0, 20))}
                placeholder="최대 20자"
                maxLength={20}
                className="w-full text-sm bg-transparent border-b outline-none pb-2"
                style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공개 범위</p>
              <div className="space-y-1">
                {(["PRIVATE", "LINK_ONLY", "PARTIAL"] as Visibility[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVis(v)}
                    className="w-full text-left text-sm py-2 px-3 border transition-colors"
                    style={{ borderColor: vis === v ? "var(--fg)" : "var(--border)", color: vis === v ? "var(--fg)" : "var(--dim)" }}
                  >
                    {VISIBILITY_LABELS[v]}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: "var(--dim)" }}>{VIS_HINT[vis]}</p>
            </div>

            {vis !== "PRIVATE" && (
              <button
                onClick={copyLink}
                className="w-full text-left text-sm py-2.5 px-3 border"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {copied ? "링크 복사됨 ✓" : "공유 링크 복사"}
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full text-sm font-medium py-3 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
              style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
            >
              {saving ? "..." : "저장"}
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs w-full text-left py-2 border-t"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </>
  );
}
