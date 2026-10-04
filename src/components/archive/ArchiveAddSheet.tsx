"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadArchivePhotos } from "@/lib/archive/uploadClient";
import type { MyState } from "@/lib/archive/spaceSearch";
import { CONTACT_EMAIL } from "@/content/site";

interface Result {
  id: string;
  slug: string;
  name: string;
  area: string;
  category: string;
  coverImage: string | null;
  addressHint: string | null;
  mine: MyState;
}

type Choice = "SAVED" | "VISITED";
const MAX_PHOTOS = 10;

function thumb(url: string) {
  return url.includes("/image/upload/") ? url.replace("/image/upload/", "/image/upload/c_fill,w_120,h_120,q_auto,f_auto/") : url;
}

function suggestHref(q: string) {
  const subject = `[공간 제안] ${q}`.trim();
  const body = `공간 이름: ${q}\n지역:\n공간 소개(자유롭게):\n알고 있는 링크(선택):\n`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * 공간 추가 — 누르는 순간 검색 하나만(사진/링크 선택 화면 없음). canonical 공간 우선 + 개인 기록 fallback:
 * A. 공간 검색 → 공간큐브 공간 선택 → 가보고 싶어요 / 다녀왔어요 → (선택) 사진 · 방문 날짜 · 짧은 메모 → 저장.
 *    이미 담은 공간이면 새 기록 대신 "이미 저장한 공간이에요"로 이어 간다(방문 추가 · 메모 고치기).
 * B. "직접 등록하기" — 검색창 바로 아래 항상 보인다(검색 전·결과 있음·결과 없음 모두). 이름(필수) · 사진 · 링크(선택)를 한 폼에서.
 *    나만 보는 개인 기록이며 공용 공간이 아니다.
 * C. "공간 제안하기" — 공용 공간 검토 요청(기존 제안 메일). 직접 등록 폼 아래 작은 링크로만.
 */
export default function ArchiveAddSheet({ className = "ed-btn ed-btn-primary" }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Result | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [date, setDate] = useState("");
  const [memo, setMemo] = useState("");
  // 직접 등록 — 이름 · 링크. 사진은 아래 files를 같이 쓴다(대표 사진 = 방문 사진, 한 번만 저장)
  const [direct, setDirect] = useState(false);
  const [directName, setDirectName] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  // 바깥 스크롤 잠금 + Esc로 닫기 + 열리면 바로 검색창에 포커스(모바일 키보드도 바로)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) close(); };
    window.addEventListener("keydown", onKey);
    searchInput.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  // 검색(250ms 쉬었다가) — 공간큐브에 등록된 공간만
  useEffect(() => {
    if (!open || picked || direct) return;
    const term = q.trim();
    if (!term) { setResults(null); setLoading(false); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/archive/spaces?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d: { results: Result[] }) => { setResults(d.results ?? []); setLoading(false); })
        .catch(() => {});
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, open, picked, direct]);

  function resetRecord() {
    setChoice(null); setFiles([]); setDate(""); setMemo(""); setError(null); setLink("");
  }
  function close() {
    setOpen(false); setQ(""); setResults(null); setPicked(null); setDirect(false); setDirectName(""); resetRecord(); setBusy(null);
  }
  function pick(r: Result) {
    setPicked(r);
    resetRecord();
    // 이미 담은 공간: 기존 메모를 이어서 고칠 수 있게 채워 둔다
    if (r.mine.kind !== "none") setMemo(r.mine.memo ?? "");
  }
  function startDirect() {
    resetRecord();
    setDirect(true);
    setDirectName(q.trim().slice(0, 80));
  }
  function backToSearch() {
    setPicked(null);
    setDirect(false);
    resetRecord();
    setTimeout(() => searchInput.current?.focus(), 30);
  }
  function addFiles(list: FileList | null) {
    if (!list) return;
    const imgs = [...list].filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imgs].slice(0, MAX_PHOTOS));
  }

  const mine = picked?.mine ?? { kind: "none" as const };
  const visitedLabel = mine.kind === "visited" ? "또 다녀왔어요" : "다녀왔어요";
  const savedLabel = mine.kind === "visited" ? "메모만 고칠게요" : mine.kind === "saved" ? "가보고 싶어요 (그대로)" : "가보고 싶어요";

  async function saveDirect() {
    if (!choice || !directName.trim()) return;
    setError(null);
    try {
      let photos: { url: string; width?: number; height?: number }[] = [];
      if (files.length) {
        setBusy(`사진 올리는 중 0/${files.length}`);
        photos = await uploadArchivePhotos(files, (d, t) => setBusy(`사진 올리는 중 ${d}/${t}`));
      }
      setBusy("저장 중…");
      const res = await fetch("/api/archive/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personal: true, placeName: directName.trim(), sourceUrl: link.trim() || null, photos,
          status: choice, visitedOn: choice === "VISITED" ? date || null : null, memo: memo.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 401 ? "로그인이 만료되었어요. 다시 로그인해주세요." : data.error ?? "저장하지 못했어요.");
      router.refresh();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (direct) return saveDirect();
    if (!picked || !choice) return;
    setError(null);
    try {
      const memoTrim = memo.trim();
      if (choice === "VISITED") {
        let photos: { url: string; width?: number; height?: number }[] = [];
        if (files.length) {
          setBusy(`사진 올리는 중 0/${files.length}`);
          photos = await uploadArchivePhotos(files, (d, t) => setBusy(`사진 올리는 중 ${d}/${t}`));
        }
        setBusy("저장 중…");
        // 새 공간이든 이미 담은 공간이든 같은 경로 — 서버가 같은 공간 기록에 방문을 덧붙인다(중복 기록 없음)
        const res = await fetch("/api/archive/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spaceId: picked.id, status: "VISITED", visitedOn: date || null, memo: memoTrim || null, photos }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(res.status === 401 ? "로그인이 만료되었어요. 다시 로그인해주세요." : data.error ?? "저장하지 못했어요.");
        // 이미 기록이 있던 공간에서 고친 메모는 공간 기록의 한 줄에도 반영(방문 메모는 서버가 방문에 남긴다)
        if (data.merged && memoTrim && mine.kind !== "none" && memoTrim !== (mine.memo ?? "")) {
          await fetch(`/api/archive/entries/${data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memo: memoTrim }) });
        }
      } else {
        setBusy("저장 중…");
        const entryId = mine.kind !== "none" ? mine.entryId : null;
        if (entryId) {
          // 이미 기록이 있으면 새로 만들지 않고 메모만 고친다
          if (memoTrim !== (mine.kind !== "none" ? mine.memo ?? "" : "")) {
            const res = await fetch(`/api/archive/entries/${entryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memo: memoTrim || null }) });
            if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "저장하지 못했어요.");
          }
        } else {
          const res = await fetch("/api/archive/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spaceId: picked.id, status: "SAVED", memo: memoTrim || null }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(res.status === 401 ? "로그인이 만료되었어요. 다시 로그인해주세요." : data.error ?? "저장하지 못했어요.");
        }
      }
      router.refresh();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(null);
    }
  }

  const inputCls = "w-full h-12 px-3 text-base outline-none";
  const inputStyle = { border: "1px solid var(--ed-line)", background: "var(--ed-bg)" } as const;
  const chip = (on: boolean) => (on ? { background: "var(--ed-fg)", color: "var(--ed-bg)", border: "1px solid var(--ed-fg)" } : { border: "1px solid var(--ed-line)" });
  const term = q.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        <span aria-hidden className="text-lg leading-none">+</span> 공간 추가
      </button>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

      {open && (
        // 모바일은 화면 전체(검색창이 위에 있어 키보드가 올라와도 결과가 가려지지 않음), 데스크톱은 가운데 창
        <div className="fixed inset-0 z-[60] flex md:items-center justify-center" role="dialog" aria-modal="true" aria-label="공간 추가">
          <button type="button" aria-label="닫기" className="absolute inset-0 hidden md:block" style={{ background: "rgba(0,0,0,0.35)" }} onClick={() => !busy && close()} />
          <div
            className="relative w-full h-[100dvh] md:h-auto md:max-w-[520px] md:max-h-[86dvh] overflow-y-auto flex flex-col"
            style={{ background: "var(--ed-bg)", color: "var(--ed-fg)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="sticky top-0 z-10 px-5 pt-3 pb-3 space-y-3" style={{ background: "var(--ed-bg)", borderBottom: "1px solid var(--ed-line)" }}>
              <div className="flex items-center justify-between h-9">
                {picked || direct ? (
                  <button type="button" onClick={backToSearch} disabled={!!busy} className="-ml-1 text-sm" style={{ color: "var(--ed-dim)" }}>← 다른 공간 찾기</button>
                ) : (
                  <p className="text-base font-bold">공간 추가</p>
                )}
                <button type="button" onClick={() => !busy && close()} className="-mr-2 p-2 text-sm" style={{ color: "var(--ed-dim)" }}>닫기</button>
              </div>
              {!picked && !direct && (
                <>
                  <input
                    ref={searchInput}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="공간 이름 검색"
                    aria-label="공간 검색"
                    className={inputCls}
                    style={{ ...inputStyle, border: "1px solid var(--ed-fg)" }}
                    enterKeyHint="search"
                    autoComplete="off"
                  />
                  {/* 검색과 함께 처음부터 보이는 두 번째 방법(보조 버튼) */}
                  <button type="button" onClick={startDirect} className="ed-btn ed-btn-sm w-full">
                    직접 등록하기
                  </button>
                </>
              )}
            </div>

            <div className="px-5 pt-4 flex-1">
              {/* ── 1. 검색 결과 ── */}
              {!picked && !direct && (
                <>
                  {term && results && results.length > 0 && (
                    <ul aria-label="검색 결과">
                      {results.map((r) => (
                        <li key={r.id}>
                          <button type="button" onClick={() => pick(r)} className="w-full flex items-center gap-3 py-3 text-left" style={{ borderBottom: "1px solid var(--ed-line)" }}>
                            <span className="relative shrink-0 w-14 h-14 overflow-hidden" style={{ background: "var(--ed-soft)" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element -- 검색 결과 작은 썸네일 */}
                              {r.coverImage && <img src={thumb(r.coverImage)} alt="" className="w-full h-full object-cover" loading="lazy" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-semibold truncate">{r.name}</span>
                              <span className="block text-xs truncate" style={{ color: "var(--ed-dim)" }}>{[r.area, r.category].filter(Boolean).join(" · ")}</span>
                            </span>
                            <span className="shrink-0 text-xs font-semibold">
                              {r.mine.kind === "visited" ? "다녀온 곳" : r.mine.kind === "saved" ? "저장한 곳" : "선택"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {term && results && results.length === 0 && !loading && (
                    <p className="py-6 text-sm" style={{ color: "var(--ed-dim)" }}>“{term}” 검색 결과가 없어요.</p>
                  )}
                  {term && loading && !results?.length && <p className="py-2 text-sm" style={{ color: "var(--ed-dim)" }}>찾는 중…</p>}
                </>
              )}

              {/* ── 2b. 직접 등록(검색 실패 fallback) — 이름 하나면 저장, 사진·링크는 선택 ── */}
              {direct && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-lg font-bold">직접 등록</p>
                    <p className="text-xs" style={{ color: "var(--ed-dim)" }}>나만 보는 기록이에요.</p>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold">공간 이름 <span style={{ color: "#a1271b" }}>*</span></span>
                    <input value={directName} maxLength={80} onChange={(e) => setDirectName(e.target.value)} placeholder="오후의 온실" className={inputCls} style={inputStyle} autoFocus />
                  </label>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold">사진 <span className="font-normal" style={{ color: "var(--ed-dim)" }}>선택</span></p>
                    <div className="flex gap-2 overflow-x-auto ed-scroll-x">
                      {previews.map((src, i) => (
                        <div key={src} className="relative shrink-0 w-20 h-20" style={{ background: "var(--ed-soft)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 전 로컬 미리보기(blob:) */}
                          <img src={src} alt={`선택한 사진 ${i + 1}`} className="w-full h-full object-cover" />
                          <button type="button" aria-label={`사진 ${i + 1} 빼기`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="absolute right-0 top-0 w-7 h-7 text-sm" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>×</button>
                        </div>
                      ))}
                      {files.length < MAX_PHOTOS && (
                        <button type="button" onClick={() => fileInput.current?.click()} className="shrink-0 w-20 h-20 text-sm" style={{ border: "1px dashed var(--ed-line)", color: "var(--ed-dim)" }}>+ 사진</button>
                      )}
                    </div>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold">링크 <span className="font-normal" style={{ color: "var(--ed-dim)" }}>선택</span></span>
                    <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://" className={inputCls} style={inputStyle} />
                  </label>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">이 공간을 어떻게 기록할까요?</p>
                    <div className="grid grid-cols-2" role="radiogroup" aria-label="기록 방식">
                      {([["SAVED", "가보고 싶어요"], ["VISITED", "다녀왔어요"]] as const).map(([v, label]) => (
                        <button key={v} type="button" role="radio" aria-checked={choice === v} onClick={() => setChoice(v)} className="h-12 text-sm font-semibold" style={chip(choice === v)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {choice === "VISITED" && (
                    <label className="block space-y-1.5">
                      <span className="text-sm font-semibold">방문 날짜 <span className="font-normal" style={{ color: "var(--ed-dim)" }}>선택</span></span>
                      <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={inputCls} style={inputStyle} />
                    </label>
                  )}
                  {choice && (
                    <label className="block space-y-1.5">
                      <span className="text-sm font-semibold">짧은 메모 <span className="font-normal" style={{ color: "var(--ed-dim)" }}>선택</span></span>
                      <input value={memo} maxLength={200} onChange={(e) => setMemo(e.target.value)} placeholder={choice === "VISITED" ? "이 공간이 좋았던 이유" : "가보고 싶은 이유"} className={inputCls} style={inputStyle} />
                    </label>
                  )}
                  <a href={suggestHref(directName.trim() || q.trim())} className="inline-block text-xs underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>공간 제안하기</a>
                  {/* 저장은 화면 아래에 붙어 있다 — 키보드가 올라오거나 사진이 늘어도 사라지지 않게 */}
                  <div className="sticky bottom-0 -mx-5 px-5 py-3 space-y-2" style={{ background: "var(--ed-bg)", borderTop: "1px solid var(--ed-line)" }}>
                    {error && <p className="text-sm" style={{ color: "#a1271b" }} role="alert">{error}</p>}
                    <button type="button" disabled={!choice || !directName.trim() || !!busy} onClick={save} className="ed-btn ed-btn-primary w-full">
                      {busy ?? "저장"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── 2. 고른 공간에 내 기록 붙이기 ── */}
              {picked && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="relative shrink-0 w-16 h-16 overflow-hidden" style={{ background: "var(--ed-soft)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- 고른 공간 썸네일 */}
                      {picked.coverImage && <img src={thumb(picked.coverImage)} alt="" className="w-full h-full object-cover" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-bold leading-snug">{picked.name}</span>
                      <span className="block text-xs" style={{ color: "var(--ed-dim)" }}>{[picked.area, picked.category].filter(Boolean).join(" · ")}</span>
                    </span>
                  </div>

                  {mine.kind !== "none" && (
                    <p className="text-sm py-3 px-4 leading-relaxed" style={{ background: "var(--ed-soft)" }}>
                      {mine.kind === "visited" ? `이미 다녀온 공간이에요 · ${mine.visits}번` : "이미 저장한 공간이에요"}
                      <span style={{ color: "var(--ed-dim)" }}> · </span>
                      <Link href={`/archive/p/s-${picked.slug}`} onClick={close} className="underline underline-offset-4">기록 보기</Link>
                    </p>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">이 공간을 어떻게 기록할까요?</p>
                    <div className="grid grid-cols-2" role="radiogroup" aria-label="기록 방식">
                      {([["SAVED", savedLabel], ["VISITED", visitedLabel]] as const).map(([v, label]) => (
                        <button key={v} type="button" role="radio" aria-checked={choice === v} onClick={() => setChoice(v)} className="h-12 text-sm font-semibold" style={chip(choice === v)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {choice === "VISITED" && (
                    <>
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold">내가 찍은 사진 <span className="font-normal" style={{ color: "var(--ed-dim)" }}>선택</span></p>
                        <div className="flex gap-2 overflow-x-auto ed-scroll-x">
                          {previews.map((src, i) => (
                            <div key={src} className="relative shrink-0 w-20 h-20" style={{ background: "var(--ed-soft)" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 전 로컬 미리보기(blob:) */}
                              <img src={src} alt={`선택한 사진 ${i + 1}`} className="w-full h-full object-cover" />
                              <button type="button" aria-label={`사진 ${i + 1} 빼기`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="absolute right-0 top-0 w-7 h-7 text-sm" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>×</button>
                            </div>
                          ))}
                          {files.length < MAX_PHOTOS && (
                            <button type="button" onClick={() => fileInput.current?.click()} className="shrink-0 w-20 h-20 text-sm" style={{ border: "1px dashed var(--ed-line)", color: "var(--ed-dim)" }}>+ 사진</button>
                          )}
                        </div>
                      </div>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-semibold">방문 날짜 <span className="font-normal" style={{ color: "var(--ed-dim)" }}>선택</span></span>
                        <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={inputCls} style={inputStyle} />
                      </label>
                    </>
                  )}

                  {choice && (
                    <label className="block space-y-1.5">
                      <span className="text-sm font-semibold">짧은 메모 <span className="font-normal" style={{ color: "var(--ed-dim)" }}>선택</span></span>
                      <input value={memo} maxLength={200} onChange={(e) => setMemo(e.target.value)} placeholder={choice === "VISITED" ? "이 공간이 좋았던 이유" : "가보고 싶은 이유"} className={inputCls} style={inputStyle} />
                    </label>
                  )}

                  <div className="sticky bottom-0 -mx-5 px-5 py-3 space-y-2" style={{ background: "var(--ed-bg)", borderTop: "1px solid var(--ed-line)" }}>
                    {error && <p className="text-sm" style={{ color: "#a1271b" }} role="alert">{error}</p>}
                    <button type="button" disabled={!choice || !!busy} onClick={save} className="ed-btn ed-btn-primary w-full">
                      {busy ?? "저장"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
