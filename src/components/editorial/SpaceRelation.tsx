"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SaveButton from "./SaveButton";
import { hasArchiveRecord, relationText, visitAction } from "@/lib/archive/spaceRelation";

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
 * "또 갔어요"는 토글: 이 화면에서 남긴 재방문은 같은 버튼(✓)을 다시 누르면 그 1건만 취소한다
 * (DELETE /api/archive/entries/[id]/visits — 첫 방문 · 과거 방문 · Cube 방문은 지우지 않는다). 요청 중에는 버튼을 잠근다.
 */
export default function SpaceRelation({ spaceId, spaceName, loggedIn, initialSaved, initialVisits, hasEntry, archiveHref, mock }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [visits, setVisits] = useState(initialVisits);
  const [entry, setEntry] = useState(hasEntry);
  const [busy, setBusy] = useState(false);
  // 연속 탭 방지 — 상태(busy)는 다시 그려진 뒤에야 버튼을 잠그므로, 같은 순간의 두 번째 탭은 ref로 막는다
  const inFlight = useRef(false);
  // 이 화면에서 "또 갔어요"로 남긴 방문 — 다시 누르면 이 1건만 취소한다(새로고침하면 잊는다 = 과거 방문은 상세에서 지우지 않음)
  const [added, setAdded] = useState<{ entryId: string; visitId: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const action = visitAction(visits, !!added);
  const toLogin = () => router.push(`/login?callbackUrl=${encodeURIComponent(`${pathname}${window.location.search}`)}`);

  async function addVisit() {
    const first = action === "first";
    if (mock) {
      setVisits((v) => v + 1);
      if (!first) setAdded({ entryId: "mock", visitId: "mock" });
      return;
    }
    const res = await fetch("/api/archive/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId, status: "VISITED" }),
    });
    if (res.status === 401) return toLogin();
    const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string; visitId?: string | null };
    if (!res.ok) throw new Error(data.error ?? "기록하지 못했어요.");
    setVisits((v) => v + 1);
    setEntry(true);
    if (!first && data.id && data.visitId) {
      setAdded({ entryId: data.id, visitId: data.visitId });
      setMessage("방금 남긴 방문이에요. 다시 누르면 취소돼요.");
    } else {
      setMessage("날짜 · 사진 · 메모는 내 기록에서 더할 수 있어요.");
    }
  }

  async function undoVisit(target: { entryId: string; visitId: string }) {
    if (!mock) {
      const res = await fetch(`/api/archive/entries/${encodeURIComponent(target.entryId)}/visits`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId: target.visitId }),
      });
      if (res.status === 401) return toLogin();
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "취소하지 못했어요.");
    }
    setVisits((v) => Math.max(v - 1, 0));
    setAdded(null);
    setMessage("방금 남긴 방문을 취소했어요.");
  }

  async function onVisitClick() {
    if (inFlight.current) return;
    if (!mock && !loggedIn) return toLogin();
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (added) await undoVisit(added);
      else await addVisit();
    } catch (e) {
      setError(e instanceof Error ? e.message : added ? "취소하지 못했어요." : "기록하지 못했어요.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const savedLike = saved || entry;
  const text = relationText(visits, savedLike);
  const linkable = !mock && hasArchiveRecord(visits, savedLike);
  const on = action === "undo";
  const note = error ?? message;

  return (
    <div>
      {(text || linkable) && (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-2 text-sm">
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
          onClick={onVisitClick}
          disabled={busy}
          aria-pressed={action === "first" ? undefined : on}
          aria-busy={busy}
          className="tap-target inline-flex items-center px-4 text-sm font-semibold transition-colors rounded-[var(--ed-radius)] disabled:opacity-60"
          style={on ? { background: "var(--ed-fg)", color: "var(--ed-bg)", border: "1px solid var(--ed-fg)" } : { border: "1px solid var(--ed-fg)" }}
        >
          {busy ? (on ? "취소 중…" : "기록 중…") : action === "first" ? "다녀왔어요" : on ? "또 갔어요 ✓" : "또 갔어요"}
        </button>
      </div>
      <p aria-live="polite" className={note ? "pt-1.5 text-xs break-keep" : "sr-only"} style={{ color: error ? "#a1271b" : "var(--ed-dim)" }}>
        {note ?? ""}
      </p>
    </div>
  );
}
