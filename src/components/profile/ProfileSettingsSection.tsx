"use client";

import { useState, useId } from "react";
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
  const handleId = useId();
  const bioId = useId();
  const handleHelpId = useId();
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
    <div className="space-y-6 pt-8 md:pt-10" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>프로필 공개</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>다른 사람에게 보여줄 아카이브와 소개를 설정해요.</p>
      </div>
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
              className="min-h-12 px-4 py-3 text-base font-semibold transition-colors disabled:opacity-60"
              style={{ background: on ? "var(--fg)" : "var(--bg)", color: on ? "var(--bg)" : "var(--fg)", borderLeft: i > 0 ? "1px solid var(--fg)" : undefined }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
        {isPublic ? "내 아카이브 공간이 보여요. 사진·메모는 보이지 않아요." : "주소로 들어와도 “비공개 아카이브입니다.”만 보여요."}
      </p>

      <div className="space-y-2">
        <label htmlFor={handleId} className="block text-sm font-medium" style={{ color: "var(--fg)" }}>프로필 주소</label>
        <div className="flex items-center gap-1 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-base" style={{ color: "var(--dim)" }}>/@</span>
          <input
            id={handleId}
            aria-describedby={handleHelpId}
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().slice(0, 24))}
            placeholder="dongmin"
            className="flex-1 min-w-0 min-h-12 py-3 text-base bg-transparent outline-none"
            style={{ color: "var(--fg)" }}
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
        <p id={handleHelpId} className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>영문 소문자·숫자·._- 3~24자. 공유 링크가 되므로 바꾸면 예전 링크가 끊겨요.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor={bioId} className="block text-sm font-medium" style={{ color: "var(--fg)" }}>한 줄 소개</label>
        <input
          id={bioId}
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 120))}
          placeholder="조용한 공간에서 오래 머무는 시간을 좋아합니다."
          className="w-full min-h-12 py-3 text-base bg-transparent border-b outline-none"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {savedHandle ? <a href={`/@${savedHandle}`} className="inline-flex items-center min-h-12 text-sm underline underline-offset-4" style={{ color: "var(--fg)" }}>내 프로필 보기 →</a> : <span />}
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy}
          className="w-full sm:w-auto min-h-12 text-base font-medium px-5 py-3 border transition-colors disabled:opacity-40 hover:enabled:bg-[var(--tag-bg)]"
          style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
        >
          {busy ? "저장 중..." : "프로필 저장"}
        </button>
      </div>
      {msg && <p role="status" className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{msg}</p>}
    </div>
  );
}
