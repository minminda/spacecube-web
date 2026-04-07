"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Lang } from "@/lib/i18n";

type Visibility = "PRIVATE" | "PARTIAL" | "LINK_ONLY";

interface Props { nickname: string | null; visibility: Visibility; userId: string; lang: Lang; }

export default function SettingsPanel({ nickname, visibility, userId, lang }: Props) {
  const [open, setOpen] = useState(false);
  const [nickValue, setNickValue] = useState(nickname ?? "");
  const [vis, setVis] = useState<Visibility>(visibility);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const VISIBILITY_LABELS: Record<Visibility, string> =
    lang === "ko" ? { PRIVATE: "나만 보기",  LINK_ONLY: "링크로만 공개",   PARTIAL: "일부 공개" }
    : lang === "ja" ? { PRIVATE: "自分のみ", LINK_ONLY: "リンクのみ公開",  PARTIAL: "一部公開" }
    : lang === "zh" ? { PRIVATE: "仅自己",  LINK_ONLY: "仅链接可见",      PARTIAL: "部分公开" }
    : { PRIVATE: "Only Me", LINK_ONLY: "Link Only", PARTIAL: "Partially Public" };

  const VIS_HINT: Record<Visibility, string> =
    lang === "ko" ? { PRIVATE: "나만 볼 수 있어", LINK_ONLY: "링크를 아는 사람만 볼 수 있어", PARTIAL: "비슷한 취향에서 발견될 수 있어" }
    : lang === "ja" ? { PRIVATE: "自分だけが見られます", LINK_ONLY: "リンクを知っている人だけが見られます", PARTIAL: "似た好みの人から発見される可能性があります" }
    : lang === "zh" ? { PRIVATE: "只有你自己可以看", LINK_ONLY: "只有知道链接的人可以看", PARTIAL: "可能被品味相似的人发现" }
    : { PRIVATE: "Only you can see this", LINK_ONLY: "Only people with the link can see this", PARTIAL: "You can be discovered by similar tastes" };

  const t = {
    settings:   lang === "ko" ? "설정"       : lang === "ja" ? "設定"          : lang === "zh" ? "设置"      : "Settings",
    nickname:   lang === "ko" ? "닉네임"     : lang === "ja" ? "ニックネーム"   : lang === "zh" ? "昵称"      : "Nickname",
    nickMax:    lang === "ko" ? "최대 20자"  : lang === "ja" ? "最大20文字"     : lang === "zh" ? "最多20个字符" : "Max 20 characters",
    visibility: lang === "ko" ? "공개 범위"  : lang === "ja" ? "公開設定"       : lang === "zh" ? "公开设置"   : "Visibility",
    copyLink:   lang === "ko" ? "공유 링크 복사 _" : lang === "ja" ? "共有リンクをコピー _" : lang === "zh" ? "复制分享链接 _" : "Copy Share Link _",
    linkCopied: lang === "ko" ? "링크 복사됨 ✓"    : lang === "ja" ? "リンクをコピーしました ✓" : lang === "zh" ? "链接已复制 ✓" : "Link Copied ✓",
    save:       lang === "ko" ? "[[ 저장 ]]" : lang === "ja" ? "[[ 保存 ]]"     : lang === "zh" ? "[[ 保存 ]]" : "[[ Save ]]",
    signOut:    lang === "ko" ? "로그아웃 _" : lang === "ja" ? "ログアウト _"   : lang === "zh" ? "退出登录 _" : "Sign Out _",
  };

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: nickValue, visibility: vis }) });
    setSaving(false); setOpen(false); router.refresh();
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/u/${userId}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs" style={{ color: "var(--dim)" }} aria-label={t.settings}>⚙</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-sm p-6 space-y-6" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
            <div className="flex justify-between items-center">
              <p className="text-xs" style={{ color: "var(--dim)" }}>{t.settings}</p>
              <button onClick={() => setOpen(false)} className="text-xs" style={{ color: "var(--dim)" }}>[✕]</button>
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>{t.nickname}</p>
              <input ref={inputRef} value={nickValue} onChange={(e) => setNickValue(e.target.value.slice(0, 20))}
                placeholder={t.nickMax} maxLength={20}
                className="w-full text-sm bg-transparent border-b outline-none pb-1"
                style={{ borderColor: "var(--dim)", color: "var(--fg)" }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }} />
            </div>

            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>{t.visibility}</p>
              <div className="space-y-1">
                {(["PRIVATE", "LINK_ONLY", "PARTIAL"] as Visibility[]).map((v) => (
                  <button key={v} onClick={() => setVis(v)} className="w-full text-left text-xs py-1.5 px-2 border transition-colors"
                    style={{ borderColor: vis === v ? "var(--fg)" : "var(--border)", color: vis === v ? "var(--fg)" : "var(--dim)" }}>
                    {vis === v ? "▸ " : "  "}{VISIBILITY_LABELS[v]}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: "var(--dim)" }}>{VIS_HINT[vis]}</p>
            </div>

            {vis !== "PRIVATE" && (
              <button onClick={copyLink} className="w-full text-left text-xs py-2 px-2 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                {copied ? t.linkCopied : t.copyLink}
              </button>
            )}

            <button onClick={handleSave} disabled={saving} className="w-full text-sm py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--fg)", color: "var(--fg)" }}>
              {saving ? "..." : t.save}
            </button>

            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-xs w-full text-left py-2 border-t" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
              {t.signOut}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
