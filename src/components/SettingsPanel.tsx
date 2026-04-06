"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Lang } from "@/lib/i18n";

type Visibility = "PRIVATE" | "PARTIAL" | "LINK_ONLY";

interface Props {
  nickname: string | null;
  visibility: Visibility;
  userId: string;
  lang: Lang;
}

export default function SettingsPanel({ nickname, visibility, userId, lang }: Props) {
  const ko = lang === "ko";
  const [open, setOpen] = useState(false);
  const [nickValue, setNickValue] = useState(nickname ?? "");
  const [vis, setVis] = useState<Visibility>(visibility);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const VISIBILITY_LABELS: Record<Visibility, string> = ko
    ? { PRIVATE: "나만 보기", LINK_ONLY: "링크로만 공개", PARTIAL: "일부 공개" }
    : { PRIVATE: "Only Me", LINK_ONLY: "Link Only", PARTIAL: "Partially Public" };

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nickValue, visibility: vis }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  function copyLink() {
    const url = `${window.location.origin}/u/${userId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs"
        style={{ color: "var(--dim)" }}
        aria-label={ko ? "설정" : "Settings"}
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
            {/* 헤더 */}
            <div className="flex justify-between items-center">
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                {ko ? "설정" : "Settings"}
              </p>
              <button onClick={() => setOpen(false)} className="text-xs" style={{ color: "var(--dim)" }}>
                [✕]
              </button>
            </div>

            {/* 닉네임 */}
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                {ko ? "닉네임" : "Nickname"}
              </p>
              <input
                ref={inputRef}
                value={nickValue}
                onChange={(e) => setNickValue(e.target.value.slice(0, 20))}
                placeholder={ko ? "최대 20자" : "Max 20 characters"}
                maxLength={20}
                className="w-full text-sm bg-transparent border-b outline-none pb-1"
                style={{ borderColor: "var(--dim)", color: "var(--fg)" }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
            </div>

            {/* 공개 범위 */}
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                {ko ? "공개 범위" : "Visibility"}
              </p>
              <div className="space-y-1">
                {(["PRIVATE", "LINK_ONLY", "PARTIAL"] as Visibility[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVis(v)}
                    className="w-full text-left text-xs py-1.5 px-2 border transition-colors"
                    style={{
                      borderColor: vis === v ? "var(--fg)" : "var(--border)",
                      color: vis === v ? "var(--fg)" : "var(--dim)",
                    }}
                  >
                    {vis === v ? "▸ " : "  "}{VISIBILITY_LABELS[v]}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                {vis === "PRIVATE"   && (ko ? "나만 볼 수 있어" : "Only you can see this")}
                {vis === "LINK_ONLY" && (ko ? "링크를 아는 사람만 볼 수 있어" : "Only people with the link can see this")}
                {vis === "PARTIAL"   && (ko ? "비슷한 취향에서 발견될 수 있어" : "You can be discovered by similar tastes")}
              </p>
            </div>

            {/* 링크 복사 */}
            {vis !== "PRIVATE" && (
              <button
                onClick={copyLink}
                className="w-full text-left text-xs py-2 px-2 border"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {copied
                  ? (ko ? "링크 복사됨 ✓" : "Link Copied ✓")
                  : (ko ? "공유 링크 복사 _" : "Copy Share Link _")}
              </button>
            )}

            {/* 저장 */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full text-sm py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
              style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
            >
              {saving ? "..." : (ko ? "[[ 저장 ]]" : "[[ Save ]]")}
            </button>

            {/* 로그아웃 */}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs w-full text-left py-2 border-t"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              {ko ? "로그아웃 _" : "Sign Out _"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
