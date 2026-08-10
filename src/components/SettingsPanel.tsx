"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import SettingsIcon from "@/components/SettingsIcon";

type Visibility = "PRIVATE" | "PARTIAL" | "LINK_ONLY";

const VISIBILITY_LABELS: Record<Visibility, string> = {
  PRIVATE: "나만 보기",
  LINK_ONLY: "링크로만 공개",
  PARTIAL: "일부 공개",
};

// 공개 범위 설명 — PARTIAL(일부 공개)이 실제로 하는 일은 archive/taste 페이지의
// "비슷한 취향" 추천 후보 조회(visibility: "PARTIAL")뿐이므로, 그 동작과 정확히 일치하는 문구만 쓴다.
const VIS_HINT: Record<Visibility, string> = {
  PRIVATE: "나만 볼 수 있어요.",
  LINK_ONLY: "링크를 아는 사람만 볼 수 있어요.",
  PARTIAL: "일부 공개 시 비슷한 취향의 사용자에게 발견될 수 있어요.",
};

interface Props { nickname: string | null; visibility: Visibility; }

export default function SettingsPanel({ nickname, visibility }: Props) {
  const [open, setOpen] = useState(false);
  const [nickValue, setNickValue] = useState(nickname ?? "");
  const [vis, setVis] = useState<Visibility>(visibility);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const dirty = nickValue.trim() !== (nickname ?? "") || vis !== visibility;

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: nickValue, visibility: vis }) });
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
              </div>

              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--dim)" }}>공개 범위</p>
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
            </div>

            <div className="space-y-2">
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
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
