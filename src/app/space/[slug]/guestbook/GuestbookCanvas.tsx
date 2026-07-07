"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchContentRef,
} from "react-zoom-pan-pinch";
import {
  DUMMY_NOTES,
  WORLD_W,
  WORLD_H,
  NOTE_W,
  POSTIT_COLOR,
  type GuestbookNoteData,
} from "./dummyNotes";

/* ── 방명록 캔버스 (전체 화면) ────────────────────────────────
   공간 대표 이미지가 흐릿하게 깔린 거대한 벽 위에
   노란 포스트잇들이 흩어져 있다. 팬/줌으로 탐험하고,
   write 모드에서는 원하는 위치를 골라 직접 흔적을 남긴다.
   리뷰 아님: 별점/좋아요/댓글/프로필 없음.
──────────────────────────────────────────────────────────── */

const MAX_CONTENT = 80;
const CLICK_TOLERANCE = 8; // px — 이보다 크게 움직이면 팬으로 간주

interface SpaceInfo {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

interface Props {
  space: SpaceInfo;
  initialNotes: GuestbookNoteData[]; // DB의 실제 흔적
  isLoggedIn: boolean;
}

// 포스트잇 텍스트는 노란 종이 위 고정 잉크색 (테마 무관)
const INK = "#3d3524";
const INK_DIM = "#8a7d5c";

function PostIt({ note }: { note: GuestbookNoteData }) {
  return (
    <div
      className="absolute p-3.5 select-none"
      style={{
        left: note.x,
        top: note.y,
        width: NOTE_W,
        background: note.color,
        rotate: `${note.rotation}deg`,
        boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
      }}
    >
      <span
        aria-hidden
        className="absolute -top-1.5 left-1/2 w-8 h-2.5"
        style={{
          background: "#00000022",
          transform: `translateX(-50%) rotate(${-note.rotation * 0.8}deg)`,
        }}
      />
      <p className="text-[13px] leading-relaxed break-keep" style={{ color: INK }}>
        {note.content}
      </p>
      <p className="text-[10px] mt-2" style={{ color: INK_DIM }}>{note.createdAt}</p>
    </div>
  );
}

export default function GuestbookCanvas({ space, initialNotes, isLoggedIn }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const [notes, setNotes] = useState<GuestbookNoteData[]>(initialNotes);
  // 비로그인 상태로 ?mode=write 직접 진입 시 보기 모드로 (작성은 API에서도 401 차단)
  const [writeMode, setWriteMode] = useState(searchParams.get("mode") === "write" && isLoggedIn);
  const [composer, setComposer] = useState<{ x: number; y: number } | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [scalePct, setScalePct] = useState(100);

  const focusId = searchParams.get("focus");
  const allNotes = [...DUMMY_NOTES, ...notes];

  // focus=noteId — 아카이브에서 진입 시 내 포스트잇 위치로 이동
  useEffect(() => {
    if (!focusId) return;
    const target = initialNotes.find((n) => n.id === focusId);
    const viewport = viewportRef.current;
    const ctrl = transformRef.current;
    if (!target || !viewport || !ctrl) return;
    const { clientWidth, clientHeight } = viewport;
    const scale = 1;
    const px = clientWidth / 2 - (target.x + NOTE_W / 2) * scale;
    const py = clientHeight / 2 - (target.y + 60) * scale;
    // 마운트 직후 centerOnInit과 겹치지 않게 다음 프레임에 이동
    const t = setTimeout(() => ctrl.setTransform(px, py, scale, 600, "easeOut"), 80);
    return () => clearTimeout(t);
  }, [focusId, initialNotes]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function enterWriteMode() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setWriteMode(true);
  }

  function exitWriteMode() {
    setWriteMode(false);
    setComposer(null);
    setContent("");
    // 새로고침 시 write 모드 재진입 방지
    window.history.replaceState(null, "", `/space/${space.slug}/guestbook`);
  }

  /** 캔버스 클릭 → 월드 좌표로 변환해 그 위치에 작성창 열기 */
  function handleWorldClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!writeMode || composer) return;
    const down = downPos.current;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_TOLERANCE) return; // 팬이었음

    const rect = e.currentTarget.getBoundingClientRect();
    const scale = rect.width / WORLD_W;
    const wx = (e.clientX - rect.left) / scale;
    const wy = (e.clientY - rect.top) / scale;

    setComposer({
      x: Math.min(Math.max(wx - NOTE_W / 2, 40), WORLD_W - NOTE_W - 40),
      y: Math.min(Math.max(wy - 20, 40), WORLD_H - 220),
    });
  }

  async function handleSubmit() {
    if (!composer || !content.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: space.id,
          content: content.trim(),
          x: composer.x,
          y: composer.y,
          rotation: Math.random() * 5 - 2.5, // 저장 시점에만 결정 (SSR 무관)
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error ?? "저장에 실패했습니다.");
        return;
      }
      const saved: GuestbookNoteData = await res.json();
      // 응답의 ISO 날짜 → 표시 형식
      const d = new Date(saved.createdAt);
      saved.createdAt = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      setNotes((prev) => [...prev, saved]);
      setComposer(null);
      setContent("");
      exitWriteMode();
      showToast("이 공간에 당신의 흔적이 남았습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 3.5rem)" }}>

      {/* ── 상단 ── */}
      <div className="flex items-center justify-between px-6 py-4 gap-3">
        <Link href={`/space/${space.slug}`} className="text-xs flex-shrink-0" style={{ color: "var(--dim)" }}>
          ← {space.name}
        </Link>
        <p className="text-xs text-right" style={{ color: "var(--dim)" }}>
          이 공간에 남겨진 흔적 <span style={{ color: "var(--fg)" }}>{allNotes.length}</span>개
        </p>
      </div>

      {/* ── 캔버스 ── */}
      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden border-y cursor-grab active:cursor-grabbing"
        style={{ borderColor: "var(--border)", touchAction: "none", background: "#111" }}
      >
        {/* write 모드 안내 배너 */}
        <AnimatePresence>
          {writeMode && !composer && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2.5"
              style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
            >
              <p className="text-xs whitespace-nowrap" style={{ color: "#eee" }}>
                이 공간에 남기고 싶은 위치를 골라주세요.
              </p>
              <button
                type="button"
                onClick={exitWriteMode}
                className="text-xs flex-shrink-0 underline underline-offset-2"
                style={{ color: "#999" }}
              >
                취소
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 완료 토스트 */}
        <AnimatePresence>
          {toast && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 text-xs px-4 py-2.5 whitespace-nowrap"
              style={{ background: "rgba(0,0,0,0.72)", color: "#eee", backdropFilter: "blur(4px)" }}
            >
              {toast}
            </motion.p>
          )}
        </AnimatePresence>

        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={0.14}
          maxScale={2.2}
          centerOnInit
          limitToBounds
          wheel={{ step: 0.12 }}
          pinch={{ step: 6 }}
          doubleClick={{ disabled: true }}
          panning={{ excluded: ["composer-block", "textarea", "button"] }}
          onTransform={(_ref, state) => setScalePct(Math.round(state.scale * 100))}
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: WORLD_W, height: WORLD_H }}
          >
            {/* 월드(벽) */}
            <div
              className="relative overflow-hidden"
              style={{ width: WORLD_W, height: WORLD_H, background: "#161513" }}
              onPointerDown={(e) => { downPos.current = { x: e.clientX, y: e.clientY }; }}
              onClick={handleWorldClick}
            >
              {/* 공간 대표 이미지 — blur + 어두운 오버레이 */}
              {space.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={space.imageUrl}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ filter: "blur(30px) brightness(0.5)", transform: "scale(1.08)" }}
                />
              )}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(10,9,7,0.45)" }} />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)",
                  backgroundSize: "56px 56px",
                }}
              />

              {/* 포스트잇들 */}
              {allNotes.map((note) => (
                <PostIt key={note.id} note={note} />
              ))}

              {/* 작성창 — 선택한 위치에 뜨는 노란 포스트잇 */}
              {composer && (
                <div
                  className="composer-block absolute p-3.5 z-10"
                  style={{
                    left: composer.x,
                    top: composer.y,
                    width: NOTE_W + 30,
                    background: POSTIT_COLOR,
                    boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs font-medium mb-2" style={{ color: INK }}>
                    이 공간에 어떤 흔적을 남길까요?
                  </p>
                  <textarea
                    autoFocus
                    value={content}
                    onChange={(e) => { if (e.target.value.length <= MAX_CONTENT) setContent(e.target.value); }}
                    placeholder="오늘 이 공간에서 든 생각을 짧게 남겨주세요."
                    rows={3}
                    className="w-full text-[13px] leading-relaxed p-2 resize-none outline-none"
                    style={{ background: "rgba(255,255,255,0.45)", color: INK }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px]" style={{ color: INK_DIM }}>
                      {content.length}/{MAX_CONTENT}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setComposer(null); setContent(""); }}
                        className="text-xs px-2.5 py-1"
                        style={{ color: INK_DIM }}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!content.trim() || saving}
                        className="text-xs px-3 py-1 border disabled:opacity-40"
                        style={{ borderColor: INK, color: INK }}
                      >
                        {saving ? "남기는 중..." : "남기기"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* ── 하단 컨트롤 (모바일: 우측 고정 테마 토글과 겹치지 않게 여백) ── */}
      <div className="flex items-center justify-between pl-6 pr-16 md:pr-6 py-3 gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="줌 아웃"
            onClick={() => transformRef.current?.zoomOut(0.35)}
            className="w-8 h-8 border text-sm"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            −
          </button>
          <span className="text-xs w-12 text-center tabular-nums" style={{ color: "var(--dim)" }}>
            {scalePct}%
          </span>
          <button
            type="button"
            aria-label="줌 인"
            onClick={() => transformRef.current?.zoomIn(0.35)}
            className="w-8 h-8 border text-sm"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => transformRef.current?.resetTransform(400)}
            className="h-8 px-2.5 border text-xs ml-1"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            처음 위치로
          </button>
        </div>

        {!writeMode && (
          <button
            type="button"
            onClick={enterWriteMode}
            className="text-xs py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors whitespace-nowrap"
            style={{ borderColor: "var(--fg)" }}
          >
            나도 흔적 남기기
          </button>
        )}
      </div>
    </div>
  );
}
