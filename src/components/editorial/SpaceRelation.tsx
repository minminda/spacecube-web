"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SaveButton from "./SaveButton";
import { hasArchiveRecord, relationText } from "@/lib/archive/spaceRelation";

interface Props {
  /** EditorialSpace.id */
  spaceId: string;
  spaceName: string;
  loggedIn: boolean;
  initialSaved: boolean;
  /** 내 기록 방문 + Cube 방문(서버의 myStateOf 기준, 방문 없으면 0) */
  initialVisits: number;
  /** 저장 해제 뒤에도 남아 있는 내 기록(가보고 싶어요)이 있는지 */
  hasEntry: boolean;
  /** 아카이브 상세 주소(/archive/p/s-<slug>) */
  archiveHref: string;
  /** 임시(fixture) 공간 — 서버에 요청하지 않는다 */
  mock?: boolean;
}

/**
 * 공간 상세의 "내 공간" 줄 — 이 공간과 나의 관계(또 간 곳 > 다녀온 곳 > 저장)와 저장 · 다녀왔어요 · 내 기록 보기.
 * 다녀왔어요 / 또 갔어요는 아카이브의 공간 추가 API(POST /api/archive/entries, status VISITED)를 그대로 쓴다 —
 * 내 기록이 없으면 만들고 있으면 덧붙이며, 방문 1건(날짜 없음 = 기록한 날)을 남긴다. 날짜 · 사진 · 메모는 내 기록에서.
 * 한 화면에서 방문은 한 번만 남긴다(연속 탭으로 방문이 여러 건 쌓이지 않게).
 */
export default function SpaceRelation({ spaceId, spaceName, loggedIn, initialSaved, initialVisits, hasEntry, archiveHref, mock }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [visits, setVisits] = useState(initialVisits);
  const [entry, setEntry] = useState(hasEntry);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const toLogin = () => router.push(`/login?callbackUrl=${encodeURIComponent(`${pathname}${window.location.search}`)}`);

  async function visit() {
    if (busy || done) return;
    if (mock) {
      setVisits((v) => v + 1);
      setDone(true);
      return;
    }
    if (!loggedIn) return toLogin();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/archive/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId, status: "VISITED" }),
      });
      if (res.status === 401) return toLogin();
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "기록하지 못했어요.");
      setVisits((v) => v + 1);
      setEntry(true);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "기록하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  const savedLike = saved || entry;
  const text = relationText(visits, savedLike);
  const linkable = !mock && hasArchiveRecord(visits, savedLike);

  return (
    <div className="space-y-3">
      {(text || linkable) && (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          {text && <span className="font-semibold break-keep">{text}</span>}
          {linkable && (
            <Link href={archiveHref} className="underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>
              내 기록 보기 →
            </Link>
          )}
        </p>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <SaveButton spaceId={spaceId} spaceName={spaceName} initialSaved={initialSaved} loggedIn={loggedIn} variant="text" mock={mock} onChange={setSaved} />
        <button
          type="button"
          onClick={visit}
          disabled={busy || done}
          className="tap-target inline-flex items-center px-4 text-sm font-semibold rounded-[var(--ed-radius)] disabled:opacity-60"
          style={{ border: "1px solid var(--ed-fg)" }}
        >
          {busy ? "기록 중…" : done ? "방문을 남겼어요" : visits > 0 ? "또 갔어요" : "다녀왔어요"}
        </button>
      </div>
      <p aria-live="polite" className="text-xs" style={{ color: error ? "#a1271b" : "var(--ed-dim)" }}>
        {error ?? (done && !mock ? "날짜 · 사진 · 메모는 내 기록에서 더할 수 있어요." : "")}
      </p>
    </div>
  );
}
