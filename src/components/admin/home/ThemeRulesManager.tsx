"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge, adminButtonClass } from "@/components/admin/ui";
import type { ThemeDiagnosis } from "@/lib/home/themeRules";

const STATUS = {
  ok: { tone: "live", label: "노출 가능" },
  short: { tone: "draft", label: "공간 부족" },
  none: { tone: "neutral", label: "해당 공간 없음" },
} as const;

/**
 * 테마 선반 ↔ 유형/태그 연결 — 각 테마가 어떤 말(키워드)로 공간을 모으는지, 지금 몇 곳이 모이는지, 선반이 나올 수 있는지.
 * 키워드는 공간의 유형 · 태그 · 이름과 맞춘다(소개 문장은 보지 않는다). 운영자는 키워드만 바꾸고, 테마 목록 · 제목은 코드가 정한다.
 */
export default function ThemeRulesManager({ themes }: { themes: ThemeDiagnosis[] }) {
  const router = useRouter();
  const [text, setText] = useState<Record<string, string>>(() => Object.fromEntries(themes.map((t) => [t.key, t.keywords.join(", ")])));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ key: string; ok: boolean; text: string } | null>(null);

  async function save(t: ThemeDiagnosis, value: string) {
    setBusy(t.key);
    setMsg(null);
    const res = await fetch("/api/admin/home-shelves/theme-rules", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: t.key, keywords: value }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok) {
      setText((x) => ({ ...x, [t.key]: (data.keywords as string[]).join(", ") }));
      setMsg({ key: t.key, ok: true, text: "저장했어요. HOME에 바로 반영됩니다." });
      router.refresh();
    } else setMsg({ key: t.key, ok: false, text: res.status === 401 ? "로그인이 만료되었어요." : (data.error ?? "저장하지 못했어요.") });
  }

  return (
    <ol className="a-card divide-y">
      {themes.map((t) => {
        const st = STATUS[t.status];
        const value = text[t.key] ?? "";
        const changed = value.trim() !== t.keywords.join(", ");
        return (
          <li key={t.key} className="px-3 py-3 space-y-2" style={{ borderColor: "var(--a-line)" }} data-testid={`theme-${t.key}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-medium w-16 shrink-0">{t.chip}</span>
              <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
              <span className="text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>현재 공간 {t.count}곳 / 최소 {t.min}곳</span>
              {t.customized && <span className="text-[11px]" style={{ color: "var(--a-dim)" }}>· 기본값에서 수정됨</span>}
            </div>
            <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>선반 제목: {t.title}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={value}
                onChange={(e) => setText((x) => ({ ...x, [t.key]: e.target.value }))}
                className="a-input flex-1"
                style={{ height: 32, fontSize: 13 }}
                aria-label={`${t.chip} 연결 키워드`}
                placeholder="유형 · 태그 키워드를 쉼표로 구분"
              />
              <span className="flex gap-1.5 shrink-0">
                <button type="button" disabled={!changed || busy === t.key} onClick={() => save(t, value)} className={adminButtonClass("secondary", "sm")}>{busy === t.key ? "저장 중…" : "저장"}</button>
                {t.customized && <button type="button" disabled={busy === t.key} onClick={() => save(t, "")} className={adminButtonClass("ghost", "sm")}>기본값으로</button>}
              </span>
            </div>
            {t.sample.length > 0 && <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>모이는 공간: {t.sample.join(" · ")}{t.count > t.sample.length ? ` 외 ${t.count - t.sample.length}곳` : ""}</p>}
            {msg?.key === t.key && <p className="text-[11px]" style={{ color: msg.ok ? "var(--a-fg)" : "#b42318" }} role="status">{msg.text}</p>}
          </li>
        );
      })}
    </ol>
  );
}
