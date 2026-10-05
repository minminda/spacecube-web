"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ProfileSettingsValue {
  public: boolean;
  handle: string | null;
  bio: string | null;
}

/**
 * 설정 › 프로필 공개 — [공개 | 비공개] 세그먼트(누르면 바로 저장, 기본 공개) + 주소 · 한 줄 소개.
 * 비공개여도 /@주소는 열리고 "비공개 아카이브입니다."만 보인다(공유와 공개 설정은 별개).
 * 공개면 아카이브 공간이 기본으로 보이고(숨기고 싶은 공간은 각 공간에서 끈다), 내 사진·메모는 기본 비공개.
 */
export default function ProfileSettingsSection({ initial }: { initial: ProfileSettingsValue }) {
  const router = useRouter();
  const [isPublic, setPublic] = useState(initial.public);
  const [handle, setHandle] = useState(initial.handle ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = handle.trim() !== (initial.handle ?? "") || bio.trim() !== (initial.bio ?? "");

  async function setVisibility(next: boolean) {
    if (next === isPublic || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profilePublic: next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "저장하지 못했어요.");
        return;
      }
      setPublic(next);
      router.refresh();
    } catch {
      setMsg("네트워크 오류로 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(handle.trim() ? { handle } : {}), bio }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "저장하지 못했어요.");
        return;
      }
      setMsg("저장됨 ✓");
      router.refresh();
    } catch {
      setMsg("네트워크 오류로 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  const savedHandle = initial.handle;
  return (
    <div className="space-y-4 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
      <p className="text-xs uppercase tracking-widest pt-2" style={{ color: "var(--fg)" }}>프로필 공개</p>
      <div role="radiogroup" aria-label="프로필 공개" className="grid grid-cols-2" style={{ border: "1px solid var(--fg)" }}>
        {[{ v: true, label: "공개" }, { v: false, label: "비공개" }].map(({ v, label }, i) => {
          const on = isPublic === v;
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={busy}
              onClick={() => setVisibility(v)}
              className="h-[46px] text-sm font-semibold transition-colors disabled:opacity-60"
              style={{ background: on ? "var(--fg)" : "var(--bg)", color: on ? "var(--bg)" : "var(--fg)", borderLeft: i > 0 ? "1px solid var(--fg)" : undefined }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
        {isPublic ? "내 아카이브 공간이 보여요. 사진·메모는 보이지 않아요." : "주소로 들어와도 “비공개 아카이브입니다.”만 보여요."}
      </p>

      <div className="space-y-1.5">
        <p className="text-xs" style={{ color: "var(--dim)" }}>프로필 주소</p>
        <div className="flex items-baseline gap-1 border-b pb-2" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--dim)" }}>/@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().slice(0, 24))}
            placeholder="dongmin"
            className="flex-1 min-w-0 text-sm bg-transparent outline-none"
            style={{ color: "var(--fg)" }}
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
        <p className="text-[11px]" style={{ color: "var(--dim)" }}>영문 소문자·숫자·._- 3~24자. 공유 링크가 되므로 바꾸면 예전 링크가 끊겨요.</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs" style={{ color: "var(--dim)" }}>한 줄 소개</p>
        <input
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 120))}
          placeholder="조용한 공간에서 오래 머무는 시간을 좋아합니다."
          className="w-full text-sm bg-transparent border-b outline-none pb-2"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        {savedHandle ? <a href={`/@${savedHandle}`} className="text-xs underline underline-offset-4" style={{ color: "var(--fg)" }}>내 프로필 보기 →</a> : <span />}
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy}
          className="text-sm font-medium px-4 py-2 border transition-colors disabled:opacity-40"
          style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
        >
          {busy ? "저장 중..." : "프로필 저장"}
        </button>
      </div>
      {msg && <p className="text-xs" style={{ color: "var(--dim)" }}>{msg}</p>}
    </div>
  );
}
