"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SettingsSection from "@/components/settings/SettingsSection";

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
  const field = "w-full h-12 px-3.5 text-base border outline-none focus:border-[var(--ed-fg)]";
  const fieldStyle = { borderColor: "var(--ed-line)", background: "var(--ed-bg)", color: "var(--ed-fg)" } as const;
  return (
    <SettingsSection title="공개 프로필" description="공개하면 내 아카이브의 공간이 프로필 주소에서 보여요. 사진 · 메모는 항상 나만 봐요.">
      <div role="radiogroup" aria-label="프로필 공개" className="grid grid-cols-2" style={{ border: "1px solid var(--ed-fg)" }}>
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
              className="h-12 text-[15px] font-semibold transition-colors disabled:opacity-60"
              style={{ background: on ? "var(--ed-fg)" : "var(--ed-bg)", color: on ? "var(--ed-bg)" : "var(--ed-fg)", borderLeft: i > 0 ? "1px solid var(--ed-fg)" : undefined }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="pt-2.5 text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>
        {isPublic ? "내 아카이브 공간이 보여요. 사진·메모는 보이지 않아요." : "주소로 들어와도 “비공개 아카이브입니다.”만 보여요."}
      </p>

      <div className="pt-6 space-y-2">
        <label htmlFor="settings-handle" className="block text-sm font-semibold">프로필 주소</label>
        <div className="flex items-center border focus-within:border-[var(--ed-fg)]" style={{ borderColor: "var(--ed-line)" }}>
          <span className="pl-3.5 text-base" style={{ color: "var(--ed-dim)" }}>/@</span>
          <input
            id="settings-handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().slice(0, 24))}
            placeholder="dongmin"
            className="flex-1 min-w-0 h-12 pr-3.5 pl-0.5 text-base bg-transparent outline-none"
            style={{ color: "var(--ed-fg)" }}
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--ed-dim)" }}>영문 소문자·숫자·._- 3~24자. 공유 링크가 되므로 바꾸면 예전 링크가 끊겨요.</p>
      </div>

      <div className="pt-5 space-y-2">
        <label htmlFor="settings-bio" className="block text-sm font-semibold">한 줄 소개</label>
        <input
          id="settings-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 120))}
          placeholder="조용한 공간에서 오래 머무는 시간을 좋아합니다."
          className={field}
          style={fieldStyle}
        />
      </div>

      <div className="pt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        {savedHandle ? (
          <a href={`/@${savedHandle}`} className="inline-flex items-center min-h-11 text-sm font-semibold underline underline-offset-4">내 프로필 보기 →</a>
        ) : <span />}
        <button type="button" onClick={save} disabled={!dirty || busy} className="ed-btn ed-btn-primary">
          {busy ? "저장 중..." : "프로필 저장"}
        </button>
      </div>
      {msg && <p className="pt-2 text-sm" style={{ color: "var(--ed-dim)" }}>{msg}</p>}
    </SettingsSection>
  );
}
