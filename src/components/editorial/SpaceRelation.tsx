"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SaveButton from "./SaveButton";
import { hasArchiveRecord, relationText, visitAction } from "@/lib/archive/spaceRelation";
import { loginHrefWithIntent, takePendingIntent, type PendingIntentKind } from "@/lib/editorial/pendingIntent";

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
 * 비로그인으로 저장 · 다녀왔어요를 누르면 로그인 후 이 화면으로 돌아와 그 행동을 한 번 자동으로 끝낸다(pendingIntent.ts).
 * 이때 상태는 로그인한 계정 기준으로 서버가 다시 그린 값(initialSaved · initialVisits)으로 판단한다 —
 * 이미 저장된 곳이면 저장 요청 없이 안내만, 이미 다녀온 곳(내 기록 · Cube 방문 1회 이상)이면 방문을 더 만들지 않는다.
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
  // 로그인 후 자동 저장이 끝나면 저장 버튼을 새 상태로 다시 그린다(SaveButton은 처음 받은 값으로 자기 상태를 가진다)
  const [saveKey, setSaveKey] = useState(0);
  const intentChecked = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const action = visitAction(visits, !!added);
  // kind가 있으면 로그인 후 그 행동을 이어서 끝내도록 의도를 실어 보낸다(첫 다녀왔어요만 — 재방문 · 취소는 실어 보내지 않음)
  const toLogin = (kind?: PendingIntentKind) =>
    router.push(kind ? loginHrefWithIntent(kind, spaceId) : `/login?callbackUrl=${encodeURIComponent(`${pathname}${window.location.search}`)}`);

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
    if (res.status === 401) return toLogin(first ? "visited" : undefined);
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
    if (!mock && !loggedIn) return toLogin("visited");
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

  /** 로그인 직후 돌아온 화면에서 한 번 — 처음 그린 상태(로그인한 계정 기준 서버 값)로 판단한다 */
  async function completeIntent(kind: PendingIntentKind) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (kind === "save") {
        if (saved) {
          setMessage("이미 내 공간에 저장되어 있어요.");
          return;
        }
        const res = await fetch(`/api/saves/spaces/${spaceId}`, { method: "POST" });
        const data = (await res.json().catch(() => ({}))) as { saved?: boolean };
        if (!res.ok || data.saved !== true) throw new Error("저장하지 못했어요. 저장하기를 다시 눌러주세요.");
        setSaved(true);
        setSaveKey((k) => k + 1);
        setMessage("내 공간에 저장했어요.");
      } else {
        if (visits > 0) {
          setMessage("이미 다녀온 곳으로 기록되어 있어요.");
          return;
        }
        await addVisit();
        setMessage("다녀온 곳으로 남겼어요. 날짜 · 사진 · 메모는 내 기록에서 더할 수 있어요.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "기록하지 못했어요.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (mock || intentChecked.current) return;
    intentChecked.current = true;
    // 주소의 일회용 번호를 지우고 기기 기록도 지운 뒤 맞을 때만 — 새로고침 · 뒤로가기로 다시 실행되지 않는다
    const kind = takePendingIntent(spaceId);
    if (kind && loggedIn) void completeIntent(kind);
    // 처음 그린 화면에서 한 번만(로그인 후 돌아온 순간의 상태 기준)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <SaveButton
          key={saveKey}
          spaceId={spaceId}
          spaceName={spaceName}
          initialSaved={saveKey > 0 ? saved : initialSaved}
          loggedIn={loggedIn}
          variant="text"
          mock={mock}
          onChange={setSaved}
          loginHref={() => loginHrefWithIntent("save", spaceId)}
        />
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
