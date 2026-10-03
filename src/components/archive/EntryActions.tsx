"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadArchivePhotos } from "@/lib/archive/uploadClient";

interface Props {
  entryId: string | null;
  /** 공간큐브 공개 공간 id(개인 기록이면 null) */
  spaceId: string | null;
  visited: boolean;
  /** Cube로 이미 다녀온 공간 — 기록만 만들 때 방문을 중복으로 남기지 않는다 */
  cubeVisited: boolean;
  personal: boolean;
  initial: { placeName: string; placeArea: string; memo: string; tags: string[]; wantAgain: boolean | null };
  tagOptions: string[];
}

type Panel = "visit" | "photos" | "edit" | null;

/**
 * 아카이브 상세의 상태 바꾸기 — 가보고 싶어요 → 다녀왔어요 → 또 갔어요(방문이 쌓인다), 사진 더하기, 기록 고치기.
 * 어떤 동작도 기존 방문·사진을 지우지 않는다. 아직 내 기록이 없는 공간(저장·Cube 방문만 있는 곳)은 첫 동작 때 만든다.
 * 서버 응답 뒤에만 화면을 새로 그린다(낙관적 갱신 없음).
 */
export default function EntryActions({ entryId, spaceId, visited, cubeVisited, personal, initial, tagOptions }: Props) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [date, setDate] = useState("");
  const [visitMemo, setVisitMemo] = useState("");
  const [edit, setEdit] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function openPanel(p: Panel) {
    setPanel(panel === p ? null : p);
    setFiles([]); setError(null);
  }

  async function call(url: string, method: string, body: unknown): Promise<Record<string, unknown>> {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(res.status === 401 ? "로그인이 만료되었어요." : (data.error as string) ?? "저장하지 못했어요.");
    return data;
  }

  /** 내 기록이 없으면 지금 만든다(방문은 남기지 않음 — Cube로 다녀온 곳이면 상태만 다녀왔어요). */
  async function ensureEntry(extra: Record<string, unknown> = {}): Promise<string> {
    if (entryId) return entryId;
    const d = await call("/api/archive/entries", "POST", { spaceId, status: cubeVisited ? "VISITED" : "SAVED", addVisit: false, ...extra });
    return d.id as string;
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setError(null);
    try {
      await fn();
      setPanel(null); setFiles([]); setDate(""); setVisitMemo("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(null);
    }
  }

  const upload = () => (files.length ? uploadArchivePhotos(files, (d, t) => setBusy(`사진 올리는 중 ${d}/${t}`)) : Promise.resolve([]));

  const submitVisit = () => run("저장 중…", async () => {
    const photos = await upload();
    setBusy("저장 중…");
    if (entryId) await call(`/api/archive/entries/${entryId}/visits`, "POST", { visitedOn: date || null, memo: visitMemo || null, photos });
    else await call("/api/archive/entries", "POST", { spaceId, status: "VISITED", addVisit: true, visitedOn: date || null, memo: visitMemo || null, photos });
  });

  const submitPhotos = () => run("저장 중…", async () => {
    const photos = await upload();
    setBusy("저장 중…");
    if (entryId) await call(`/api/archive/entries/${entryId}/photos`, "POST", { photos });
    else await ensureEntry({ photos });
  });

  const submitEdit = () => run("저장 중…", async () => {
    const id = await ensureEntry();
    await call(`/api/archive/entries/${id}`, "PATCH", {
      ...(personal ? { placeName: edit.placeName, placeArea: edit.placeArea || null } : {}),
      memo: edit.memo || null,
      tags: edit.tags,
      wantAgain: edit.wantAgain,
    });
  });

  const inputCls = "w-full h-11 px-3 text-base outline-none";
  const inputStyle = { border: "1px solid var(--ed-line)", background: "var(--ed-bg)" } as const;
  const chip = (on: boolean) => (on ? { background: "var(--ed-fg)", color: "var(--ed-bg)", border: "1px solid var(--ed-fg)" } : { border: "1px solid var(--ed-line)" });

  const photoPicker = (
    <div className="space-y-2">
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => {
        // FileList는 살아 있는 참조라 value를 비우면 함께 비워진다 — 먼저 배열로 복사한 뒤 비운다.
        const picked = [...(e.target.files ?? [])].filter((f) => f.type.startsWith("image/"));
        e.target.value = "";
        if (picked.length) setFiles((p) => [...p, ...picked].slice(0, 10));
      }} />
      <div className="flex gap-2 overflow-x-auto ed-scroll-x">
        {previews.map((src, i) => (
          <div key={src} className="relative shrink-0 w-20 h-20" style={{ background: "var(--ed-soft)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 전 로컬 미리보기(blob:) */}
            <img src={src} alt={`선택한 사진 ${i + 1}`} className="w-full h-full object-cover" />
            <button type="button" aria-label={`사진 ${i + 1} 빼기`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="absolute right-0 top-0 w-6 h-6 text-xs" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>×</button>
          </div>
        ))}
        <button type="button" onClick={() => fileInput.current?.click()} className="shrink-0 w-20 h-20 text-xs" style={{ border: "1px dashed var(--ed-line)", color: "var(--ed-dim)" }}>+ 사진</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => openPanel("visit")} aria-expanded={panel === "visit"} className="h-11 px-4 text-sm font-semibold" style={chip(panel === "visit" || !visited)}>
          {visited ? "또 갔어요" : "다녀왔어요"}
        </button>
        <button type="button" onClick={() => openPanel("photos")} aria-expanded={panel === "photos"} className="h-11 px-4 text-sm" style={chip(panel === "photos")}>사진 더하기</button>
        <button type="button" onClick={() => openPanel("edit")} aria-expanded={panel === "edit"} className="h-11 px-4 text-sm" style={chip(panel === "edit")}>기록 고치기</button>
      </div>

      {panel === "visit" && (
        <div className="p-4 space-y-3" style={{ background: "var(--ed-soft)" }}>
          <p className="text-sm font-semibold">{visited ? "새 방문을 남겨요" : "다녀온 공간으로 옮겨요"} <span className="font-normal" style={{ color: "var(--ed-dim)" }}>· 모두 선택</span></p>
          <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} aria-label="방문 날짜" className={inputCls} style={inputStyle} />
          <input value={visitMemo} maxLength={200} onChange={(e) => setVisitMemo(e.target.value)} placeholder="이번에는 어땠나요" aria-label="방문 메모" className={inputCls} style={inputStyle} />
          {photoPicker}
          <button type="button" disabled={!!busy} onClick={submitVisit} className="w-full h-11 text-sm font-semibold disabled:opacity-40" style={{ background: "var(--ed-fg)", color: "var(--ed-bg)" }}>{busy ?? "저장"}</button>
        </div>
      )}

      {panel === "photos" && (
        <div className="p-4 space-y-3" style={{ background: "var(--ed-soft)" }}>
          {photoPicker}
          <button type="button" disabled={!!busy || files.length === 0} onClick={submitPhotos} className="w-full h-11 text-sm font-semibold disabled:opacity-40" style={{ background: "var(--ed-fg)", color: "var(--ed-bg)" }}>{busy ?? "사진 저장"}</button>
        </div>
      )}

      {panel === "edit" && (
        <div className="p-4 space-y-3" style={{ background: "var(--ed-soft)" }}>
          {personal && (
            <>
              <input value={edit.placeName} onChange={(e) => setEdit((v) => ({ ...v, placeName: e.target.value }))} aria-label="공간 이름" className={inputCls} style={inputStyle} />
              <input value={edit.placeArea} onChange={(e) => setEdit((v) => ({ ...v, placeArea: e.target.value }))} placeholder="지역" aria-label="지역" className={inputCls} style={inputStyle} />
            </>
          )}
          <input value={edit.memo} maxLength={200} onChange={(e) => setEdit((v) => ({ ...v, memo: e.target.value }))} placeholder="나의 한 줄" aria-label="나의 한 줄" className={inputCls} style={inputStyle} />
          {tagOptions.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="느낌">
              {tagOptions.map((t) => {
                const on = edit.tags.includes(t);
                return (
                  <button key={t} type="button" aria-pressed={on} onClick={() => setEdit((v) => ({ ...v, tags: on ? v.tags.filter((x) => x !== t) : [...v.tags, t].slice(0, 6) }))} className="h-9 px-3 text-sm" style={chip(on)}>
                    {t}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {([[true, "또 가고 싶어요"], [false, "한 번이면 충분해요"]] as const).map(([v, label]) => (
              <button key={label} type="button" aria-pressed={edit.wantAgain === v} onClick={() => setEdit((s) => ({ ...s, wantAgain: s.wantAgain === v ? null : v }))} className="h-9 px-3 text-sm" style={chip(edit.wantAgain === v)}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" disabled={!!busy || (personal && !edit.placeName.trim())} onClick={submitEdit} className="w-full h-11 text-sm font-semibold disabled:opacity-40" style={{ background: "var(--ed-fg)", color: "var(--ed-bg)" }}>{busy ?? "저장"}</button>
        </div>
      )}

      {error && <p className="text-sm" role="alert" style={{ color: "#a1271b" }}>{error}</p>}
    </div>
  );
}

/** 사진 묶음 — 누르면 대표 사진으로(내 기록의 사진만). */
export function PhotoGrid({ entryId, photos }: { entryId: string; photos: { id: string; url: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function makeCover(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/archive/entries/${entryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coverPhotoId: id }) });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }
  return (
    <ul className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
      {photos.map((p, i) => (
        <li key={p.id} className="relative" style={{ aspectRatio: "1 / 1", background: "var(--ed-soft)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 사용자 개인 사진, 작은 썸네일 */}
          <img src={p.url.replace("/image/upload/", "/image/upload/c_fill,w_480,h_480,q_auto,f_auto/")} alt={`내 사진 ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
          {i === 0 ? (
            <span className="absolute left-1 top-1 px-1.5 text-[10px] font-semibold" style={{ background: "var(--ed-fg)", color: "var(--ed-bg)" }}>대표</span>
          ) : (
            <button type="button" disabled={!!busy} onClick={() => makeCover(p.id)} className="absolute left-1 bottom-1 px-1.5 text-[10px]" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>
              {busy === p.id ? "…" : "대표로"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
