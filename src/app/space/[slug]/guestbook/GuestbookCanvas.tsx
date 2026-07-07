"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

/* ── 방명록 캔버스 (전체 화면, 진짜 무한 캔버스) ──────────────────
   순수 검정 배경 위에 노란 포스트잇만 흩어져 있다. 진입 시 정중앙에서
   시작해 천천히 줌아웃되며 거대한 캔버스가 드러난다("와..." 하는 느낌).
   한 공간당 사용자는 흔적을 하나만 남길 수 있고, 내 흔적은 은은하게
   빛나며 언제든 찾을 수 있다. 리뷰 아님: 별점/좋아요/댓글/프로필 없음.
──────────────────────────────────────────────────────────── */

const MAX_CONTENT = 80;
const CLICK_TOLERANCE = 8; // px — 이보다 크게 움직이면 팬으로 간주
const REVEAL_RADIUS = 1750; // 진입 리빌 종료 시 화면에 담길 반경
const INTRO_SCALE = 1.3; // 정중앙 시작 시 확대율
const INTRO_HOLD_MS = 260; // 시작 지점에서 잠깐 머무는 시간
const INTRO_DURATION_MS = 2600; // 줌아웃 애니메이션 길이

interface SpaceInfo {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  space: SpaceInfo;
  initialNotes: GuestbookNoteData[]; // DB의 실제 흔적
  isLoggedIn: boolean;
  initialMyNoteId: string | null;
}

// 포스트잇 텍스트는 노란 종이 위 고정 잉크색 (테마 무관)
const INK = "#3d3524";
const INK_DIM = "#8a7d5c";

export default function GuestbookCanvas({ space, initialNotes, isLoggedIn, initialMyNoteId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const focusId = searchParams.get("focus");

  const [notes, setNotes] = useState<GuestbookNoteData[]>(initialNotes);
  const [myNoteId, setMyNoteId] = useState<string | null>(initialMyNoteId);
  const [writeMode, setWriteMode] = useState(
    searchParams.get("mode") === "write" && isLoggedIn && !initialMyNoteId,
  );
  const [composer, setComposer] = useState<{ x: number; y: number } | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [scalePct, setScalePct] = useState(100);
  const [introPlaying, setIntroPlaying] = useState(!focusId);

  const [focused, setFocused] = useState<GuestbookNoteData | null>(null);
  const [overlayMode, setOverlayMode] = useState<"read" | "edit" | "confirmDelete">("read");
  const [editContent, setEditContent] = useState("");
  const [busy, setBusy] = useState(false);

  const allNotes = [...DUMMY_NOTES, ...notes];

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  // ── 진입 리빌: 정중앙에서 시작 → 천천히 줌아웃하며 전체 캔버스 공개 ──
  // TransformWrapper가 자체 초기화를 마치기 전에 setTransform을 호출하면
  // 라이브러리의 마운트 시점 초기화가 뒤늦게 덮어써버리므로, 약간의 지연 후 적용한다.
  useEffect(() => {
    if (focusId) return; // focus 진입은 특정 포스트잇으로 바로 이동
    const viewport = viewportRef.current;
    const ctrl = transformRef.current;
    if (!viewport || !ctrl) return;

    const { clientWidth, clientHeight } = viewport;
    const cx = WORLD_W / 2;
    const cy = WORLD_H / 2;
    const finalScale = Math.min(Math.max(clientWidth / (REVEAL_RADIUS * 2), 0.08), 0.6);

    const startX = clientWidth / 2 - cx * INTRO_SCALE;
    const startY = clientHeight / 2 - cy * INTRO_SCALE;
    const endX = clientWidth / 2 - cx * finalScale;
    const endY = clientHeight / 2 - cy * finalScale;

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => {
      ctrl.setTransform(startX, startY, INTRO_SCALE, 0); // 정중앙에 스냅
      setScalePct(Math.round(INTRO_SCALE * 100));

      timers.push(setTimeout(() => {
        ctrl.setTransform(endX, endY, finalScale, INTRO_DURATION_MS, "easeOut");
        timers.push(setTimeout(() => setIntroPlaying(false), INTRO_DURATION_MS));
      }, INTRO_HOLD_MS));
    }, 80));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 특정 포스트잇을 화면 중앙에 확대해서 카메라 이동 (딥링크·"내 기록 보기" 공용) */
  const jumpToNote = useCallback((note: GuestbookNoteData, scale = 1, duration = 700) => {
    const viewport = viewportRef.current;
    const ctrl = transformRef.current;
    if (!viewport || !ctrl) return;
    const { clientWidth, clientHeight } = viewport;
    const px = clientWidth / 2 - (note.x + NOTE_W / 2) * scale;
    const py = clientHeight / 2 - (note.y + 60) * scale;
    ctrl.setTransform(px, py, scale, duration, "easeOut");
  }, []);

  // focus=noteId — 아카이브에서 진입 시 내 포스트잇 위치로 카메라 이동
  useEffect(() => {
    if (!focusId) return;
    const target = initialNotes.find((n) => n.id === focusId);
    if (!target) return;
    const t = setTimeout(() => jumpToNote(target, 1, 700), 80);
    return () => clearTimeout(t);
  }, [focusId, initialNotes, jumpToNote]);

  /** [내 기록 보기] — 이미 캔버스가 열려 있는 상태에서 내 포스트잇으로 카메라 이동 */
  function goToMyNote() {
    const mine = allNotes.find((n) => n.id === myNoteId);
    if (!mine) return;
    jumpToNote(mine, 1.15, 900);
  }

  function enterWriteMode() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (myNoteId) return; // 이미 남긴 경우 진입 불가
    setWriteMode(true);
  }

  function exitWriteMode() {
    setWriteMode(false);
    setComposer(null);
    setContent("");
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
      const d = new Date(saved.createdAt);
      saved.createdAt = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      setNotes((prev) => [...prev, saved]);
      setMyNoteId(saved.id);
      setComposer(null);
      setContent("");
      exitWriteMode();
      showToast("이 공간에 당신의 흔적이 남았습니다.");
    } finally {
      setSaving(false);
    }
  }

  const openFocused = useCallback((note: GuestbookNoteData) => {
    if (writeMode) return; // 위치를 고르는 중에는 기존 포스트잇을 열지 않음
    setFocused(note);
    setOverlayMode("read");
    setEditContent(note.content);
  }, [writeMode]);

  function closeFocused() {
    setFocused(null);
    setOverlayMode("read");
  }

  async function handleEditSave() {
    if (!focused || !editContent.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/guestbook/${focused.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error ?? "수정에 실패했습니다.");
        return;
      }
      const updatedContent = editContent.trim();
      setNotes((prev) => prev.map((n) => (n.id === focused.id ? { ...n, content: updatedContent } : n)));
      closeFocused();
      showToast("흔적을 수정했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!focused || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/guestbook/${focused.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== focused.id));
      setMyNoteId(null);
      closeFocused();
      showToast("흔적을 삭제했습니다. 다시 남길 수 있어요.");
    } finally {
      setBusy(false);
    }
  }

  const isMine = focused ? focused.id === myNoteId : false;

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 3.5rem)", background: "#000" }}>

      {/* ── 상단 ── */}
      <div className="flex items-center justify-between px-6 py-4 gap-3">
        <Link href={`/space/${space.slug}`} className="text-xs flex-shrink-0" style={{ color: "#888" }}>
          ← {space.name}
        </Link>
        <p className="text-xs text-right" style={{ color: "#888" }}>
          이 공간에 남겨진 흔적 <span style={{ color: "#eee" }}>{allNotes.length}</span>개
        </p>
      </div>

      {/* ── 캔버스 ── */}
      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none", background: "#000" }}
      >
        {/* write 모드 안내 배너 */}
        <AnimatePresence>
          {writeMode && !composer && !introPlaying && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2.5"
              style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(4px)" }}
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
              style={{ background: "rgba(255,255,255,0.1)", color: "#eee", backdropFilter: "blur(4px)" }}
            >
              {toast}
            </motion.p>
          )}
        </AnimatePresence>

        <TransformWrapper
          ref={transformRef}
          initialScale={INTRO_SCALE}
          minScale={0.06}
          maxScale={2.2}
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
            {/* 월드(벽) — 완전한 검정, 포스트잇만 강조 */}
            <div
              className="relative overflow-hidden"
              style={{ width: WORLD_W, height: WORLD_H, background: "#000" }}
              onPointerDown={(e) => { downPos.current = { x: e.clientX, y: e.clientY }; }}
              onClick={handleWorldClick}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
                  backgroundSize: "64px 64px",
                }}
              />

              {/* 포스트잇들 */}
              {allNotes.map((note) => {
                const mine = note.id === myNoteId;
                return (
                  <div
                    key={note.id}
                    className={`absolute p-3.5 select-none transition-transform ${mine ? "note-glow" : ""}`}
                    style={{
                      left: note.x,
                      top: note.y,
                      width: NOTE_W,
                      background: note.color,
                      rotate: `${note.rotation}deg`,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                      pointerEvents: writeMode ? "none" : "auto",
                      cursor: writeMode ? "default" : "pointer",
                    }}
                    onClick={(e) => { e.stopPropagation(); openFocused(note); }}
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
              })}

              {/* 작성창 — 선택한 위치에 뜨는 노란 포스트잇 */}
              {composer && (
                <div
                  className="composer-block absolute p-3.5 z-10"
                  style={{
                    left: composer.x,
                    top: composer.y,
                    width: NOTE_W + 30,
                    background: POSTIT_COLOR,
                    boxShadow: "0 4px 18px rgba(0,0,0,0.6)",
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

      {/* ── 하단 컨트롤 (줌 / 액션 두 줄로 분리해 좁은 화면에서도 안 겹치게) ── */}
      <div
        className="flex flex-col gap-2.5 pl-6 pr-16 md:pr-6 py-3 transition-opacity"
        style={{ opacity: introPlaying ? 0.3 : 1, pointerEvents: introPlaying ? "none" : "auto" }}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="줌 아웃"
            onClick={() => transformRef.current?.zoomOut(0.35)}
            className="w-8 h-8 border text-sm flex-shrink-0"
            style={{ borderColor: "#333", color: "#999" }}
          >
            −
          </button>
          <span className="text-xs w-12 text-center tabular-nums flex-shrink-0" style={{ color: "#999" }}>
            {scalePct}%
          </span>
          <button
            type="button"
            aria-label="줌 인"
            onClick={() => transformRef.current?.zoomIn(0.35)}
            className="w-8 h-8 border text-sm flex-shrink-0"
            style={{ borderColor: "#333", color: "#999" }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => transformRef.current?.resetTransform(400)}
            className="h-8 px-2.5 border text-xs ml-1 flex-shrink-0"
            style={{ borderColor: "#333", color: "#999" }}
          >
            초기 위치
          </button>
        </div>

        {myNoteId ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToMyNote}
              className="flex-1 text-xs py-2.5 px-3 border hover:bg-white hover:text-black transition-colors whitespace-nowrap"
              style={{ borderColor: "#fff", color: "#fff" }}
            >
              내 기록 보기
            </button>
            <Link
              href="/archive"
              className="flex-1 text-xs py-2.5 px-3 border text-center hover:bg-white hover:text-black transition-colors whitespace-nowrap"
              style={{ borderColor: "#fff", color: "#fff" }}
            >
              내 아카이브 보기
            </Link>
          </div>
        ) : (
          !writeMode && (
            <button
              type="button"
              onClick={enterWriteMode}
              className="w-full text-xs py-2.5 px-4 border hover:bg-white hover:text-black transition-colors"
              style={{ borderColor: "#fff", color: "#fff" }}
            >
              나도 흔적 남기기
            </button>
          )
        )}
      </div>

      {/* ── 포스트잇 확대 오버레이 ── */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-30 flex items-center justify-center px-8"
            style={{ background: "rgba(0,0,0,0.82)" }}
            onClick={(e) => { if (e.target === e.currentTarget) closeFocused(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative w-full max-w-xs p-6"
              style={{ background: focused.color, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
            >
              <button
                type="button"
                onClick={closeFocused}
                className="absolute -top-9 left-0 text-xs"
                style={{ color: "#ccc" }}
              >
                ← 닫기
              </button>

              {overlayMode === "read" && (
                <>
                  <p className="text-base leading-relaxed break-keep" style={{ color: INK }}>
                    {focused.content}
                  </p>
                  <p className="text-xs mt-4" style={{ color: INK_DIM }}>{focused.createdAt}</p>

                  {isMine && (
                    <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.12)" }}>
                      <button
                        type="button"
                        onClick={() => setOverlayMode("edit")}
                        className="flex-1 text-xs py-2 border"
                        style={{ borderColor: INK, color: INK }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverlayMode("confirmDelete")}
                        className="flex-1 text-xs py-2 border border-red-700 text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </>
              )}

              {overlayMode === "edit" && (
                <>
                  <textarea
                    autoFocus
                    value={editContent}
                    onChange={(e) => { if (e.target.value.length <= MAX_CONTENT) setEditContent(e.target.value); }}
                    rows={4}
                    className="w-full text-[15px] leading-relaxed p-2 resize-none outline-none"
                    style={{ background: "rgba(255,255,255,0.45)", color: INK }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px]" style={{ color: INK_DIM }}>{editContent.length}/{MAX_CONTENT}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOverlayMode("read")}
                        disabled={busy}
                        className="text-xs px-2.5 py-1"
                        style={{ color: INK_DIM }}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleEditSave}
                        disabled={!editContent.trim() || busy}
                        className="text-xs px-3 py-1 border disabled:opacity-40"
                        style={{ borderColor: INK, color: INK }}
                      >
                        {busy ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {overlayMode === "confirmDelete" && (
                <>
                  <p className="text-sm font-medium" style={{ color: INK }}>
                    정말 삭제하시겠습니까?
                  </p>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: INK_DIM }}>
                    삭제하면 이 흔적은 사라지고, 이 공간에 다시 남길 수 있어요.
                  </p>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setOverlayMode("read")}
                      disabled={busy}
                      className="flex-1 text-xs py-2 border"
                      style={{ borderColor: INK, color: INK }}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteConfirm}
                      disabled={busy}
                      className="flex-1 text-xs py-2 border border-red-700 text-red-700 disabled:opacity-50"
                    >
                      {busy ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes noteGlowPulse {
          0%, 100% { box-shadow: 0 2px 10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.2); }
          50%      { box-shadow: 0 2px 10px rgba(0,0,0,0.5), 0 0 16px 3px rgba(255,255,255,0.6), 0 0 0 1.5px rgba(255,255,255,0.7); }
        }
        .note-glow {
          animation: noteGlowPulse 2.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .note-glow { animation: none; box-shadow: 0 0 0 1.5px rgba(255,255,255,0.6); }
        }
      `}</style>
    </div>
  );
}
