"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadArchivePhotos } from "@/lib/archive/uploadClient";
import { detectSourceKind, parseHttpUrl, SOURCE_KIND_LABEL } from "@/lib/archive/source";

interface Match {
  id: string;
  slug: string;
  name: string;
  area: string;
  category: string;
  coverImage: string | null;
  matchedBy: "link" | "name";
}

type Mode = "photo" | "link" | "name";
type Step = "choose" | "form" | "more";

const MAX_PHOTOS = 10;

/**
 * 공간 추가 시트 — "이 공간 좋았는데"를 몇 초 만에. 필수는 공간 이름(사진으로 추가하면 사진 1장)뿐.
 * 이름을 치는 동안 공간큐브에 이미 있는 공간을 찾아 "여기에 기록 추가"를 권한다(새 공간을 만들지 않음).
 * 저장 뒤 "조금 더 기록할까요?"에서 지역·날짜·한 줄·느낌·다시 가고 싶은지를 고를 수 있지만 강제하지 않는다.
 */
export default function ArchiveAddSheet({ tagOptions }: { tagOptions: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [mode, setMode] = useState<Mode>("photo");
  const [files, setFiles] = useState<File[]>([]);
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [linked, setLinked] = useState<Match | null>(null);
  const [visited, setVisited] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; visitId: string | null; merged: boolean } | null>(null);
  const [more, setMore] = useState({ area: "", date: "", memo: "", tags: [] as string[], wantAgain: null as boolean | null });
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const parsedLink = parseHttpUrl(link);
  const linkKind = parsedLink ? detectSourceKind(parsedLink) : null;

  // 바깥 스크롤 잠금 + Esc로 닫기
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) close(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  // 이름·링크가 바뀌면 공간큐브에 있는 공간을 찾는다(250ms 쉬었다가)
  useEffect(() => {
    if (step !== "form" || linked) return;
    const q = name.trim();
    const url = parsedLink?.href ?? "";
    if (!q && !url) { setMatches([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/archive/match?q=${encodeURIComponent(q)}&url=${encodeURIComponent(url)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { matches: [] }))
        .then((d: { matches: Match[] }) => setMatches(d.matches ?? []))
        .catch(() => {});
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [name, parsedLink?.href, step, linked]);

  function reset() {
    setStep("choose"); setFiles([]); setLink(""); setName(""); setMatches([]); setLinked(null);
    setBusy(null); setError(null); setCreated(null); setMore({ area: "", date: "", memo: "", tags: [], wantAgain: null });
  }
  function close() {
    setOpen(false);
    reset();
  }
  function start(m: Mode) {
    setMode(m);
    setVisited(m === "photo");
    setStep("form");
    setTimeout(() => nameInput.current?.focus(), 50);
  }
  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = [...list].filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
    if (step === "choose") start("photo");
  }

  const canSave = !busy && (linked || name.trim()) && (mode !== "photo" || files.length > 0) && (mode !== "link" || !!parsedLink);

  async function save() {
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
          spaceId: linked?.id ?? null,
          placeName: linked ? linked.name : name.trim(),
          status: visited ? "VISITED" : "SAVED",
          sourceUrl: parsedLink?.href ?? null,
          fromPhoto: mode === "photo",
          photos,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 401 ? "로그인이 만료되었어요. 다시 로그인해주세요." : data.error ?? "저장하지 못했어요.");
      setCreated(data);
      setStep("more");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(null);
    }
  }

  async function saveMore() {
    if (!created) return close();
    setError(null);
    setBusy("저장 중…");
    try {
      const patch: Record<string, unknown> = {};
      if (!linked && more.area.trim()) patch.placeArea = more.area.trim();
      if (more.memo.trim()) patch.memo = more.memo.trim();
      if (more.tags.length) patch.tags = more.tags;
      if (more.wantAgain !== null) patch.wantAgain = more.wantAgain;
      const calls: Promise<Response>[] = [];
      if (Object.keys(patch).length) calls.push(fetch(`/api/archive/entries/${created.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }));
      if (more.date && created.visitId) calls.push(fetch(`/api/archive/entries/${created.id}/visits`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitId: created.visitId, visitedOn: more.date }) }));
      const results = await Promise.all(calls);
      const failed = results.find((r) => !r.ok);
      if (failed) throw new Error(((await failed.json().catch(() => ({}))) as { error?: string }).error ?? "일부를 저장하지 못했어요.");
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target inline-flex items-center gap-2 px-5 text-sm font-semibold"
        style={{ background: "var(--ed-fg)", color: "var(--ed-bg)" }}
      >
        <span aria-hidden className="text-lg leading-none">+</span> 공간 추가
      </button>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="공간 추가">
          <button type="button" aria-label="닫기" className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} onClick={() => !busy && close()} />
          <div
            className="relative w-full md:max-w-[520px] max-h-[92dvh] overflow-y-auto"
            style={{ background: "var(--ed-bg)", color: "var(--ed-fg)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 h-14" style={{ background: "var(--ed-bg)", borderBottom: "1px solid var(--ed-line)" }}>
              <p className="text-base font-bold">{step === "more" ? (created?.merged ? "기록에 더했어요" : "아카이브에 넣었어요") : "공간 추가"}</p>
              <button type="button" onClick={() => !busy && close()} className="-mr-2 p-2 text-sm" style={{ color: "var(--ed-dim)" }}>닫기</button>
            </div>

            <div className="px-5 py-6 space-y-6">
              {step === "choose" && (
                <div className="space-y-3">
                  <button type="button" onClick={() => fileInput.current?.click()} className="w-full text-left p-5 space-y-1" style={{ border: "1px solid var(--ed-fg)" }}>
                    <span className="block text-base font-bold">사진에서 공간 추가</span>
                    <span className="block text-sm" style={{ color: "var(--ed-dim)" }}>다녀온 곳의 사진 한 장이면 충분해요.</span>
                  </button>
                  <button type="button" onClick={() => start("link")} className="w-full text-left p-5 space-y-1" style={{ border: "1px solid var(--ed-line)" }}>
                    <span className="block text-base font-bold">링크로 추가</span>
                    <span className="block text-sm" style={{ color: "var(--ed-dim)" }}>네이버 지도 · Instagram · 카카오맵 등에서 본 공간</span>
                  </button>
                  <button type="button" onClick={() => start("name")} className="pt-2 text-sm underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>이름만으로 추가</button>
                </div>
              )}

              {step === "form" && (
                <>
                  {(mode === "photo" || files.length > 0) && (
                    <div>
                      <div className="flex gap-2 overflow-x-auto ed-scroll-x">
                        {previews.map((src, i) => (
                          <div key={src} className="relative shrink-0 w-24 h-24" style={{ background: "var(--ed-soft)" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 전 로컬 미리보기(blob:) */}
                            <img src={src} alt={`선택한 사진 ${i + 1}`} className="w-full h-full object-cover" />
                            {i === 0 && <span className="absolute left-1 top-1 px-1.5 text-[10px] font-semibold" style={{ background: "var(--ed-fg)", color: "var(--ed-bg)" }}>대표</span>}
                            <button type="button" aria-label={`사진 ${i + 1} 빼기`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="absolute right-0 top-0 w-7 h-7 text-sm" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>×</button>
                          </div>
                        ))}
                        {files.length < MAX_PHOTOS && (
                          <button type="button" onClick={() => fileInput.current?.click()} className="shrink-0 w-24 h-24 text-sm" style={{ border: "1px dashed var(--ed-line)", color: "var(--ed-dim)" }}>+ 사진</button>
                        )}
                      </div>
                      {mode === "photo" && files.length === 0 && <p className="pt-2 text-xs" style={{ color: "var(--ed-dim)" }}>사진을 한 장 이상 골라주세요.</p>}
                    </div>
                  )}

                  {mode === "link" && (
                    <label className="block space-y-1.5">
                      <span className="text-sm font-semibold">링크</span>
                      <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://naver.me/…" className={inputCls} style={inputStyle} autoFocus />
                      <span className="block text-xs" style={{ color: "var(--ed-dim)" }}>
                        {linkKind ? `${SOURCE_KIND_LABEL[linkKind]} 링크예요. 내용은 가져오지 않고 주소만 저장해요.` : link ? "http로 시작하는 주소를 붙여넣어 주세요." : "공유하기로 복사한 주소를 그대로 붙여넣어도 돼요."}
                      </span>
                    </label>
                  )}

                  {linked ? (
                    <div className="p-4 space-y-1" style={{ background: "var(--ed-soft)" }}>
                      <p className="text-xs" style={{ color: "var(--ed-dim)" }}>공간큐브에 있는 공간과 연결돼요</p>
                      <p className="text-base font-bold">{linked.name}</p>
                      <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{[linked.area, linked.category].join(" · ")}</p>
                      <button type="button" onClick={() => { setLinked(null); setName(linked.name); }} className="pt-1 text-xs underline underline-offset-4">연결하지 않고 따로 기록</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block space-y-1.5">
                        <span className="text-sm font-semibold">공간 이름</span>
                        <input ref={nameInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 북눅" className={inputCls} style={inputStyle} enterKeyHint="done" />
                      </label>
                      {matches.length > 0 && (
                        <ul className="space-y-1" aria-label="공간큐브에 있는 공간">
                          <li className="text-xs pt-1" style={{ color: "var(--ed-dim)" }}>이미 공간큐브에 있는 공간이에요</li>
                          {matches.map((m) => (
                            <li key={m.id}>
                              <button type="button" onClick={() => setLinked(m)} className="w-full flex items-center justify-between gap-3 py-2.5 text-left" style={{ borderBottom: "1px solid var(--ed-line)" }}>
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold truncate">{m.name}</span>
                                  <span className="block text-xs" style={{ color: "var(--ed-dim)" }}>{[m.area, m.category, m.matchedBy === "link" ? "링크와 같은 장소" : null].filter(Boolean).join(" · ")}</span>
                                </span>
                                <span className="shrink-0 text-xs font-semibold">{m.name}에 기록 추가 →</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2" role="radiogroup" aria-label="상태">
                    {([[false, "가보고 싶어요"], [true, "다녀왔어요"]] as const).map(([v, label]) => (
                      <button key={label} type="button" role="radio" aria-checked={visited === v} onClick={() => setVisited(v)} className="h-12 text-sm font-semibold" style={chip(visited === v)}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {error && <p className="text-sm" style={{ color: "#a1271b" }} role="alert">{error}</p>}
                  <button type="button" disabled={!canSave} onClick={save} className="w-full h-12 text-base font-semibold disabled:opacity-40" style={{ background: "var(--ed-fg)", color: "var(--ed-bg)" }}>
                    {busy ?? "저장"}
                  </button>
                  <p className="text-xs text-center" style={{ color: "var(--ed-dim)" }}>올린 사진은 나만 볼 수 있어요.</p>
                </>
              )}

              {step === "more" && (
                <>
                  <p className="text-base font-semibold">조금 더 기록할까요?</p>
                  <p className="-mt-4 text-sm" style={{ color: "var(--ed-dim)" }}>모두 선택이에요. 나중에 공간 기록에서 고칠 수도 있어요.</p>
                  {!linked && (
                    <label className="block space-y-1.5">
                      <span className="text-sm font-semibold">지역</span>
                      <input value={more.area} onChange={(e) => setMore((m) => ({ ...m, area: e.target.value }))} placeholder="예: 연남" className={inputCls} style={inputStyle} />
                    </label>
                  )}
                  {visited && created?.visitId && (
                    <label className="block space-y-1.5">
                      <span className="text-sm font-semibold">방문 날짜</span>
                      <input type="date" value={more.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setMore((m) => ({ ...m, date: e.target.value }))} className={inputCls} style={inputStyle} />
                    </label>
                  )}
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold">한 줄 메모</span>
                    <input value={more.memo} maxLength={200} onChange={(e) => setMore((m) => ({ ...m, memo: e.target.value }))} placeholder="이 공간이 좋았던 이유" className={inputCls} style={inputStyle} />
                  </label>
                  {tagOptions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold">어떤 느낌이었나요</p>
                      <div className="flex flex-wrap gap-2">
                        {tagOptions.map((t) => {
                          const on = more.tags.includes(t);
                          return (
                            <button key={t} type="button" aria-pressed={on} onClick={() => setMore((m) => ({ ...m, tags: on ? m.tags.filter((x) => x !== t) : [...m.tags, t].slice(0, 6) }))} className="h-9 px-3 text-sm" style={chip(on)}>
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {visited && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold">다시 가고 싶나요</p>
                      <div className="flex gap-2">
                        {([[true, "또 가고 싶어요"], [false, "한 번이면 충분해요"]] as const).map(([v, label]) => (
                          <button key={label} type="button" aria-pressed={more.wantAgain === v} onClick={() => setMore((m) => ({ ...m, wantAgain: m.wantAgain === v ? null : v }))} className="h-9 px-3 text-sm" style={chip(more.wantAgain === v)}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {error && <p className="text-sm" style={{ color: "#a1271b" }} role="alert">{error}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={close} disabled={!!busy} className="h-12 text-sm" style={{ border: "1px solid var(--ed-line)" }}>나중에 할게요</button>
                    <button type="button" onClick={saveMore} disabled={!!busy} className="h-12 text-sm font-semibold" style={{ background: "var(--ed-fg)", color: "var(--ed-bg)" }}>{busy ?? "저장"}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
