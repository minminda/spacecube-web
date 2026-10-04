"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ProfileSettingsValue {
  public: boolean;
  handle: string | null;
  bio: string | null;
}

/**
 * 설정 › 공개 프로필 — 기존 설정 패널 안의 한 구획(새 설정 페이지를 만들지 않는다).
 * 공개 프로필에는 고른 공간만 보이고 사진·메모는 기본 비공개. 취향 태그·통계는 프로필에 보이지 않는다.
 * 공간 공개는 여기서가 아니라 아카이브의 각 공간에서 고른다.
 */
export default function ProfileSettingsSection({ initial }: { initial: ProfileSettingsValue }) {
  const router = useRouter();
  const [isPublic, setPublic] = useState(initial.public);
  const [handle, setHandle] = useState(initial.handle ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty =
    isPublic !== initial.public || handle.trim() !== (initial.handle ?? "") || bio.trim() !== (initial.bio ?? "");

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePublic: isPublic, ...(handle.trim() ? { handle } : {}), bio }),
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
      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--fg)" }}>공개 프로필</p>
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--fg)" }}>
          {isPublic ? "켜짐" : "꺼짐"}
          <input type="checkbox" checked={isPublic} onChange={(e) => setPublic(e.target.checked)} className="w-4 h-4" />
        </label>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
        공개 프로필에서는 선택한 공간만 다른 사람에게 보여요. 사진과 메모는 기본적으로 공개되지 않습니다.
        공간은 아카이브의 각 공간에서 하나씩 골라 공개해요.
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
