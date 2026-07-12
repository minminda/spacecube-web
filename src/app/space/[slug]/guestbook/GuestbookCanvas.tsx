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
import { compressImage } from "@/lib/imageCompress";
import {
  DUMMY_NOTES,
  WORLD_W,
  WORLD_H,
  NOTE_W,
  type GuestbookNoteData,
} from "./dummyNotes";
import PostSubmitReward from "./PostSubmitReward";
import type { RewardSummary } from "@/lib/guestbookReward";

/* ── 방명록 캔버스 (전체 화면, 진짜 무한 캔버스) ──────────────────
   관리자가 설정한 배경/포스트잇 색/레이아웃을 반영한다. 설정이 없으면
   기존 기본값(검정 배경 · 노란 포스트잇 · 자유 배치)을 그대로 쓴다.
   한 공간당 사용자는 흔적을 하나만 남길 수 있고, 내 흔적은 은은하게
   빛나며 언제든 찾을 수 있다. 리뷰 아님: 별점/좋아요/댓글/프로필 없음.
──────────────────────────────────────────────────────────── */

const MAX_CONTENT = 80;
const CLICK_TOLERANCE = 8; // px — 이보다 크게 움직이면 팬으로 간주
const REVEAL_RADIUS = 1750; // 진입 리빌 종료 시 화면에 담길 반경
const INTRO_SCALE = 1.3; // 정중앙 시작 시 확대율
const INTRO_HOLD_MS = 260; // 시작 지점에서 잠깐 머무는 시간
const INTRO_DURATION_MS = 2600; // 줌아웃 애니메이션 길이
const GRID_CELL_W = 220;
const GRID_CELL_H = 260;
const COMPOSE_SCALE = 1.15; // 작성 중 편하게 볼 수 있는 확대 비율
const COMPOSE_DURATION_MS = 550; // 포스트잇 생성 직후 줌인 애니메이션 길이
const CANCEL_DURATION_MS = 420; // 취소 시 이전 화면으로 되돌아가는 애니메이션 길이

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

async function uploadToCloudinary(file: File): Promise<string | null> {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", UPLOAD_PRESET);
  try {
    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
    const result = await res.json();
    return result.secure_url ?? null;
  } catch {
    return null;
  }
}

interface SpaceInfo {
  id: string;
  name: string;
  slug: string;
}

export interface GuestbookDisplaySettings {
  backgroundType: "color" | "image";
  backgroundColor: string;
  backgroundImageUrl: string | null;
  backgroundOpacity: number;
  layoutType: "scatter" | "grid" | "radial";
  defaultPostitColor: string;
  initialZoom: number;
  initialX: number;
  initialY: number;
  allowRotation: boolean;
  allowImage: boolean;
  showNickname: boolean;
}

interface Props {
  space: SpaceInfo;
  initialNotes: GuestbookNoteData[]; // DB의 실제 흔적
  isLoggedIn: boolean;
  initialMyNoteId: string | null;
  nickname: string | null;
  settings: GuestbookDisplaySettings;
  /** 내 직전 방문 이후 새로 생긴(남의) 흔적 수 — 0이면 재방문 안내를 띄우지 않는다 */
  newNotesCount: number;
}

// 포스트잇 텍스트는 노란 종이 위 고정 잉크색 (테마 무관)
const INK = "#3d3524";
const INK_DIM = "#8a7d5c";

export default function GuestbookCanvas({ space, initialNotes, isLoggedIn, initialMyNoteId, nickname, settings, newNotesCount }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const lastTransformRef = useRef({ positionX: 0, positionY: 0, scale: INTRO_SCALE });
  const preComposeTransformRef = useRef<{ positionX: number; positionY: number; scale: number } | null>(null);

  const focusId = searchParams.get("focus");

  const [notes, setNotes] = useState<GuestbookNoteData[]>(initialNotes);
  const [myNoteId, setMyNoteId] = useState<string | null>(initialMyNoteId);
  const [myNickname, setMyNickname] = useState<string | null>(nickname);
  const [writeMode, setWriteMode] = useState(
    searchParams.get("mode") === "write" && isLoggedIn && !initialMyNoteId,
  );
  const [composer, setComposer] = useState<{ x: number; y: number } | null>(null);
  const [content, setContent] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [scalePct, setScalePct] = useState(100);
  const [introPlaying, setIntroPlaying] = useState(!focusId);
  const [revisitNoticeOpen, setRevisitNoticeOpen] = useState(newNotesCount > 0);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);

  const [nicknamePrompt, setNicknamePrompt] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const [focused, setFocused] = useState<GuestbookNoteData | null>(null);
  const [overlayMode, setOverlayMode] = useState<"read" | "edit" | "confirmDelete">("read");
  const [editContent, setEditContent] = useState("");
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null | undefined>(undefined);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null | undefined>(undefined);
  const [editPhotoUploading, setEditPhotoUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const allNotes = [...DUMMY_NOTES, ...notes];
  const worldBg = settings.backgroundType === "color" ? settings.backgroundColor : "#000000";

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function effectiveRotation(r: number) {
    return settings.allowRotation ? r : 0;
  }

  // ── 진입 리빌: 정중앙에서 시작 → 천천히 줌아웃하며 전체 캔버스 공개 ──
  useEffect(() => {
    if (focusId) return; // focus 진입은 특정 포스트잇으로 바로 이동
    const viewport = viewportRef.current;
    const ctrl = transformRef.current;
    if (!viewport || !ctrl) return;

    const { clientWidth, clientHeight } = viewport;
    const cx = WORLD_W / 2;
    const cy = WORLD_H / 2;
    const finalScale = Math.min(Math.max((clientWidth / (REVEAL_RADIUS * 2)) * settings.initialZoom, 0.08), 0.6);

    const startX = clientWidth / 2 - cx * INTRO_SCALE;
    const startY = clientHeight / 2 - cy * INTRO_SCALE;
    const endX = clientWidth / 2 - cx * finalScale + settings.initialX;
    const endY = clientHeight / 2 - cy * finalScale + settings.initialY;

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => {
      ctrl.setTransform(startX, startY, INTRO_SCALE, 0);
      setScalePct(Math.round(INTRO_SCALE * 100));

      timers.push(setTimeout(() => {
        ctrl.setTransform(endX, endY, finalScale, INTRO_DURATION_MS, "easeOut");
        timers.push(setTimeout(() => setIntroPlaying(false), INTRO_DURATION_MS));
      }, INTRO_HOLD_MS));
    }, 80));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 캔버스 위 임의의 월드 좌표로 부드럽게 이동/확대하는 공통 함수.
      screenYOffset은 화면 세로 방향으로 초점을 얼마나 밀어올릴지(모바일 키보드 회피용). */
  const focusOnPoint = useCallback((worldX: number, worldY: number, scale: number, duration = 700, screenYOffset = 0) => {
    const viewport = viewportRef.current;
    const ctrl = transformRef.current;
    if (!viewport || !ctrl) return;
    const { clientWidth, clientHeight } = viewport;
    const px = clientWidth / 2 - worldX * scale;
    const py = clientHeight / 2 - worldY * scale + screenYOffset;
    ctrl.setTransform(px, py, scale, duration, "easeOut");
  }, []);

  /** 특정 포스트잇으로 이동/확대 (딥링크·"내 기록 보기" 등에서 재사용) */
  const jumpToNote = useCallback((note: GuestbookNoteData, scale = 1, duration = 700) => {
    focusOnPoint(note.x + NOTE_W / 2, note.y + 60, scale, duration);
  }, [focusOnPoint]);

  useEffect(() => {
    if (!focusId) return;
    const target = initialNotes.find((n) => n.id === focusId);
    if (!target) return;
    const t = setTimeout(() => jumpToNote(target, 1, 700), 80);
    return () => clearTimeout(t);
  }, [focusId, initialNotes, jumpToNote]);

  function goToMyNote() {
    const mine = allNotes.find((n) => n.id === myNoteId);
    if (!mine) return;
    jumpToNote(mine, 1.15, 900);
  }

  function requireNickname(action: () => void) {
    if (myNickname) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setNicknameInput("");
    setNicknameError("");
    setNicknamePrompt(true);
  }

  async function submitNickname() {
    const trimmed = nicknameInput.trim();
    if (trimmed.length < 2 || trimmed.length > 12) {
      setNicknameError("닉네임은 2~12자로 입력해주세요.");
      return;
    }
    setNicknameSaving(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: trimmed }),
    });
    setNicknameSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNicknameError(data.error ?? "닉네임 저장에 실패했어요.");
      return;
    }
    setMyNickname(trimmed);
    setNicknamePrompt(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }

  function enterWriteMode() {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/space/${space.slug}/guestbook`)}`);
      return;
    }
    if (myNoteId) return;
    requireNickname(() => setWriteMode(true));
  }

  function exitWriteMode() {
    setWriteMode(false);
    setComposer(null);
    setContent("");
    setPhotoPreview(null);
    setPhotoUrl(null);
    window.history.replaceState(null, "", `/space/${space.slug}/guestbook`);
  }

  function snapToGrid(x: number, y: number) {
    if (settings.layoutType !== "grid") return { x, y };
    return {
      x: Math.round(x / GRID_CELL_W) * GRID_CELL_W,
      y: Math.round(y / GRID_CELL_H) * GRID_CELL_H,
    };
  }

  /** 작성 취소 — 빈 포스트잇을 남기지 않고, 클릭 직전의 카메라 위치로 자연스럽게 복귀 */
  function cancelCompose() {
    setComposer(null);
    setContent("");
    setPhotoPreview(null);
    setPhotoUrl(null);
    const prev = preComposeTransformRef.current;
    const ctrl = transformRef.current;
    if (prev && ctrl) {
      ctrl.setTransform(prev.positionX, prev.positionY, prev.scale, CANCEL_DURATION_MS, "easeOut");
    }
    preComposeTransformRef.current = null;
  }

  function handleWorldClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!writeMode) return;
    const down = downPos.current;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_TOLERANCE) return; // 팬이었음

    // 이미 작성창이 열려 있는데 배경을 눌렀다 → 취소하고 캔버스로 복귀
    if (composer) {
      cancelCompose();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const scale = rect.width / WORLD_W;
    const wx = (e.clientX - rect.left) / scale;
    const wy = (e.clientY - rect.top) / scale;
    const snapped = snapToGrid(wx - NOTE_W / 2, wy - 20);

    const x = Math.min(Math.max(snapped.x, 40), WORLD_W - NOTE_W - 40);
    const y = Math.min(Math.max(snapped.y, 40), WORLD_H - 220);

    // 생성 직후 해당 위치로 부드럽게 이동/확대하고, 취소 시 되돌아갈 이전 위치를 기억해둔다
    preComposeTransformRef.current = { ...lastTransformRef.current };
    setComposer({ x, y });
    focusOnPoint(x + NOTE_W / 2, y + 70, COMPOSE_SCALE, COMPOSE_DURATION_MS);
  }

  // 모바일 키보드가 열리면 작성창이 가려지지 않도록 초점을 위로 밀어 재조정
  useEffect(() => {
    if (!composer) return;
    const vv = window.visualViewport;
    if (!vv) return;
    function onViewportResize() {
      if (!vv || !composer) return;
      const keyboardHeight = window.innerHeight - vv.height;
      if (keyboardHeight > 100) {
        focusOnPoint(composer.x + NOTE_W / 2, composer.y + 70, COMPOSE_SCALE, 300, -keyboardHeight / 2);
      }
    }
    vv.addEventListener("resize", onViewportResize);
    return () => vv.removeEventListener("resize", onViewportResize);
  }, [composer, focusOnPoint]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      const compressed = await compressImage(file);
      const url = await uploadToCloudinary(compressed);
      setPhotoUrl(url);
    } finally {
      setPhotoUploading(false);
    }
    e.target.value = "";
  }

  function removePhoto() {
    setPhotoPreview(null);
    setPhotoUrl(null);
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
          rotation: settings.allowRotation ? Math.random() * 5 - 2.5 : 0,
          imageUrl: photoUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error ?? "저장에 실패했습니다.");
        return;
      }
      const saved: GuestbookNoteData & { rewardSummary: RewardSummary } = await res.json();
      const { rewardSummary: reward, ...noteFields } = saved;
      const d = new Date(noteFields.createdAt);
      noteFields.createdAt = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      setNotes((prev) => [...prev, noteFields]);
      setMyNoteId(noteFields.id);
      setComposer(null);
      setContent("");
      setPhotoPreview(null);
      setPhotoUrl(null);
      preComposeTransformRef.current = null; // 저장 완료 — 취소 시 되돌아갈 위치는 더 이상 필요 없음, 지금 확대 상태 유지
      exitWriteMode();
      setRewardSummary(reward);
    } finally {
      setSaving(false);
    }
  }

  const openFocused = useCallback((note: GuestbookNoteData) => {
    if (writeMode) return;
    setFocused(note);
    setOverlayMode("read");
    setEditContent(note.content);
    setEditPhotoPreview(undefined);
    setEditPhotoUrl(undefined);
  }, [writeMode]);

  function closeFocused() {
    setFocused(null);
    setOverlayMode("read");
  }

  function startEdit() {
    if (!focused) return;
    setEditContent(focused.content);
    setEditPhotoPreview(focused.imageUrl ?? null);
    setEditPhotoUrl(focused.imageUrl ?? null);
    setOverlayMode("edit");
  }

  async function handleEditPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoPreview(URL.createObjectURL(file));
    setEditPhotoUploading(true);
    try {
      const compressed = await compressImage(file);
      const url = await uploadToCloudinary(compressed);
      setEditPhotoUrl(url);
    } finally {
      setEditPhotoUploading(false);
    }
    e.target.value = "";
  }

  async function handleEditSave() {
    if (!focused || !editContent.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/guestbook/${focused.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim(), imageUrl: editPhotoUrl ?? null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error ?? "수정에 실패했습니다.");
        return;
      }
      const updatedContent = editContent.trim();
      const updatedImage = editPhotoUrl ?? null;
      setNotes((prev) => prev.map((n) => (n.id === focused.id ? { ...n, content: updatedContent, imageUrl: updatedImage } : n)));
      setFocused((prev) => (prev ? { ...prev, content: updatedContent, imageUrl: updatedImage } : prev));
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
    <div className="flex flex-col" style={{ height: "calc(100dvh - 3.5rem)", background: worldBg }}>

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
        style={{ touchAction: "none", background: worldBg }}
      >
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
              <button type="button" onClick={exitWriteMode} className="text-xs flex-shrink-0 underline underline-offset-2" style={{ color: "#999" }}>
                취소
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
          onTransform={(_ref, state) => {
            setScalePct(Math.round(state.scale * 100));
            lastTransformRef.current = { positionX: state.positionX, positionY: state.positionY, scale: state.scale };
          }}
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: WORLD_W, height: WORLD_H }}
          >
            <div
              className="relative overflow-hidden"
              style={{ width: WORLD_W, height: WORLD_H, background: worldBg }}
              onPointerDown={(e) => { downPos.current = { x: e.clientX, y: e.clientY }; }}
              onClick={handleWorldClick}
            >
              {settings.backgroundType === "image" && settings.backgroundImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.backgroundImageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ opacity: settings.backgroundOpacity }}
                />
              )}
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
                const isNew = !mine && !!note.isNew;
                return (
                  <div
                    key={note.id}
                    className={`absolute p-3 select-none transition-transform ${mine ? "note-glow" : isNew ? "note-new-glow" : ""}`}
                    style={{
                      left: note.x,
                      top: note.y,
                      width: NOTE_W,
                      background: note.color,
                      rotate: `${effectiveRotation(note.rotation)}deg`,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                      pointerEvents: writeMode ? "none" : "auto",
                      cursor: writeMode ? "default" : "pointer",
                    }}
                    onClick={(e) => { e.stopPropagation(); openFocused(note); }}
                  >
                    {isNew && (
                      <span
                        className="absolute -top-2 -right-2 text-[9px] font-semibold px-1.5 py-0.5 leading-none"
                        style={{ background: "#7dd3fc", color: "#0c2733" }}
                      >
                        NEW
                      </span>
                    )}
                    <span
                      aria-hidden
                      className="absolute -top-1.5 left-1/2 w-8 h-2.5"
                      style={{ background: "#00000022", transform: `translateX(-50%) rotate(${-effectiveRotation(note.rotation) * 0.8}deg)` }}
                    />
                    {note.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={note.imageUrl} alt="" className="w-full h-20 object-cover mb-2" />
                    )}
                    <p className="text-[13px] leading-relaxed break-keep" style={{ color: INK }}>
                      {note.content}
                    </p>
                    {settings.showNickname && note.nickname && (
                      <p className="text-[10px] mt-1.5" style={{ color: INK_DIM }}>— {note.nickname}</p>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: INK_DIM }}>{note.createdAt}</p>
                  </div>
                );
              })}

              {/* 작성창 — 선택한 위치에 뜨는 포스트잇 */}
              {composer && (
                <div
                  className="composer-block absolute p-3.5 z-10"
                  style={{ left: composer.x, top: composer.y, width: NOTE_W + 30, background: settings.defaultPostitColor, boxShadow: "0 4px 18px rgba(0,0,0,0.6)" }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs font-medium mb-2" style={{ color: INK }}>
                    이 공간에 어떤 흔적을 남길까요?
                  </p>

                  {settings.allowImage && (
                    <div className="mb-2">
                      {photoPreview ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoPreview} alt="" className="w-full h-24 object-cover" />
                          {photoUploading && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                              <span className="text-[10px]" style={{ color: "#fff" }}>업로드 중...</span>
                            </div>
                          )}
                          <button type="button" onClick={removePhoto} className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                            삭제
                          </button>
                        </div>
                      ) : (
                        <label className="block text-[11px] py-1.5 text-center border cursor-pointer" style={{ borderColor: INK_DIM, color: INK_DIM }}>
                          + 사진 추가 (선택)
                          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
                        </label>
                      )}
                    </div>
                  )}

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
                    <span className="text-[10px]" style={{ color: INK_DIM }}>{content.length}/{MAX_CONTENT}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={cancelCompose} className="text-xs px-2.5 py-1" style={{ color: INK_DIM }}>
                        취소
                      </button>
                      <button type="button" onClick={handleSubmit} disabled={!content.trim() || saving || photoUploading} className="text-xs px-3 py-1 border disabled:opacity-40" style={{ borderColor: INK, color: INK }}>
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

      {/* ── 하단 컨트롤 ── */}
      <div className="flex flex-col gap-2.5 pl-6 pr-16 md:pr-6 py-3 transition-opacity" style={{ opacity: introPlaying ? 0.3 : 1, pointerEvents: introPlaying ? "none" : "auto" }}>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="줌 아웃" onClick={() => transformRef.current?.zoomOut(0.35)} className="w-8 h-8 border text-sm flex-shrink-0" style={{ borderColor: "#333", color: "#999" }}>−</button>
          <span className="text-xs w-12 text-center tabular-nums flex-shrink-0" style={{ color: "#999" }}>{scalePct}%</span>
          <button type="button" aria-label="줌 인" onClick={() => transformRef.current?.zoomIn(0.35)} className="w-8 h-8 border text-sm flex-shrink-0" style={{ borderColor: "#333", color: "#999" }}>+</button>
          <button type="button" onClick={() => transformRef.current?.resetTransform(400)} className="h-8 px-2.5 border text-xs ml-1 flex-shrink-0" style={{ borderColor: "#333", color: "#999" }}>초기 위치</button>
        </div>

        {myNoteId ? (
          <div className="flex gap-2">
            <button type="button" onClick={goToMyNote} className="flex-1 text-xs py-2.5 px-3 border hover:bg-white hover:text-black transition-colors whitespace-nowrap" style={{ borderColor: "#fff", color: "#fff" }}>
              내 기록 보기
            </button>
            <Link href="/archive" className="flex-1 text-xs py-2.5 px-3 border text-center hover:bg-white hover:text-black transition-colors whitespace-nowrap" style={{ borderColor: "#fff", color: "#fff" }}>
              내 아카이브 보기
            </Link>
          </div>
        ) : (
          !writeMode && (
            <button type="button" onClick={enterWriteMode} className="w-full text-xs py-2.5 px-4 border hover:bg-white hover:text-black transition-colors" style={{ borderColor: "#fff", color: "#fff" }}>
              나도 흔적 남기기
            </button>
          )
        )}
      </div>

      {/* ── 닉네임 설정 프롬프트 ── */}
      <AnimatePresence>
        {nicknamePrompt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center px-8"
            style={{ background: "rgba(0,0,0,0.82)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setNicknamePrompt(false); }}
          >
            <div className="w-full max-w-xs p-6 space-y-4" style={{ background: "#111", border: "1px solid #333" }}>
              <p className="text-sm font-medium" style={{ color: "#eee" }}>흔적을 남기기 전에, 닉네임을 정해주세요.</p>
              <p className="text-xs leading-relaxed" style={{ color: "#999" }}>
                2~12자로 입력해주세요. 이후 포스트잇마다 다시 입력하지 않아요.
              </p>
              <input
                autoFocus
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value.slice(0, 12))}
                placeholder="닉네임"
                className="w-full text-sm px-3 py-2.5 border outline-none"
                style={{ background: "transparent", borderColor: "#444", color: "#eee" }}
                onKeyDown={(e) => { if (e.key === "Enter") submitNickname(); }}
              />
              {nicknameError && <p className="text-xs" style={{ color: "#f66" }}>{nicknameError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setNicknamePrompt(false)} className="flex-1 text-xs py-2 border" style={{ borderColor: "#444", color: "#999" }}>취소</button>
                <button onClick={submitNickname} disabled={nicknameSaving} className="flex-1 text-xs py-2 border disabled:opacity-40" style={{ borderColor: "#eee", color: "#eee" }}>
                  {nicknameSaving ? "저장 중..." : "확인"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 포스트잇 확대 오버레이 ── */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="fixed inset-0 z-30 flex items-center justify-center px-8"
            style={{ background: "rgba(0,0,0,0.82)" }}
            onClick={(e) => { if (e.target === e.currentTarget) closeFocused(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative w-full max-w-xs p-6"
              style={{ background: focused.color, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
            >
              <button type="button" onClick={closeFocused} className="absolute -top-9 left-0 text-xs" style={{ color: "#ccc" }}>← 닫기</button>

              {overlayMode === "read" && (
                <>
                  {focused.imageUrl && (
                    <button type="button" onClick={() => setLightbox(focused.imageUrl!)} className="block w-full mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={focused.imageUrl} alt="" className="w-full h-40 object-cover" />
                    </button>
                  )}
                  <p className="text-base leading-relaxed break-keep" style={{ color: INK }}>{focused.content}</p>
                  {settings.showNickname && focused.nickname && (
                    <p className="text-sm mt-3" style={{ color: INK_DIM }}>— {focused.nickname}</p>
                  )}
                  <p className="text-xs mt-2" style={{ color: INK_DIM }}>{focused.createdAt}</p>

                  {!isMine && focused.userId && (
                    <Link
                      href={`/taste/${focused.userId}`}
                      className="inline-block mt-4 text-xs py-1.5 px-2.5 border transition-colors"
                      style={{ borderColor: INK, color: INK }}
                    >
                      이 사용자의 공간 아카이브 보기 →
                    </Link>
                  )}

                  {isMine && (
                    <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.12)" }}>
                      <button type="button" onClick={startEdit} className="flex-1 text-xs py-2 border" style={{ borderColor: INK, color: INK }}>수정</button>
                      <button type="button" onClick={() => setOverlayMode("confirmDelete")} className="flex-1 text-xs py-2 border border-red-700 text-red-700">삭제</button>
                    </div>
                  )}
                </>
              )}

              {overlayMode === "edit" && (
                <>
                  {settings.allowImage && (
                    <div className="mb-3">
                      {editPhotoPreview ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={editPhotoPreview} alt="" className="w-full h-32 object-cover" />
                          {editPhotoUploading && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                              <span className="text-[10px]" style={{ color: "#fff" }}>업로드 중...</span>
                            </div>
                          )}
                          <button type="button" onClick={() => { setEditPhotoPreview(null); setEditPhotoUrl(null); }} className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>삭제</button>
                        </div>
                      ) : (
                        <label className="block text-[11px] py-1.5 text-center border cursor-pointer" style={{ borderColor: INK_DIM, color: INK_DIM }}>
                          + 사진 추가 (선택)
                          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleEditPhotoChange} className="hidden" />
                        </label>
                      )}
                    </div>
                  )}
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
                      <button type="button" onClick={() => setOverlayMode("read")} disabled={busy} className="text-xs px-2.5 py-1" style={{ color: INK_DIM }}>취소</button>
                      <button type="button" onClick={handleEditSave} disabled={!editContent.trim() || busy || editPhotoUploading} className="text-xs px-3 py-1 border disabled:opacity-40" style={{ borderColor: INK, color: INK }}>
                        {busy ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {overlayMode === "confirmDelete" && (
                <>
                  <p className="text-sm font-medium" style={{ color: INK }}>정말 삭제하시겠습니까?</p>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: INK_DIM }}>삭제하면 이 흔적은 사라지고, 이 공간에 다시 남길 수 있어요.</p>
                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={() => setOverlayMode("read")} disabled={busy} className="flex-1 text-xs py-2 border" style={{ borderColor: INK, color: INK }}>취소</button>
                    <button type="button" onClick={handleDeleteConfirm} disabled={busy} className="flex-1 text-xs py-2 border border-red-700 text-red-700 disabled:opacity-50">
                      {busy ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 사진 확대 라이트박스 ── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center px-6"
            style={{ background: "rgba(0,0,0,0.92)" }}
            onClick={() => setLightbox(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 재방문 안내 — Guestbook 진입 전, 직전 방문 이후 새로 생긴 흔적을 알려준다 ── */}
      <AnimatePresence>
        {revisitNoticeOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-8"
            style={{ background: "rgba(0,0,0,0.88)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-xs p-7 text-center space-y-4"
              style={{ background: "#111", border: "1px solid #2a2a2a" }}
            >
              <p className="text-sm leading-relaxed" style={{ color: "#eee" }}>
                지난 방문 이후
                <br />새로운 흔적 {newNotesCount}개가 추가되었습니다.
              </p>
              <button
                type="button"
                onClick={() => setRevisitNoticeOpen(false)}
                className="w-full text-xs py-2.5 border transition-colors hover:bg-white hover:text-black"
                style={{ borderColor: "#eee", color: "#eee" }}
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 방명록 저장 직후 보상 시퀀스 ── */}
      <AnimatePresence>
        {rewardSummary && <PostSubmitReward summary={rewardSummary} onClose={() => setRewardSummary(null)} />}
      </AnimatePresence>

      <style>{`
        @keyframes noteGlowPulse {
          0%, 100% { box-shadow: 0 2px 10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.2); }
          50%      { box-shadow: 0 2px 10px rgba(0,0,0,0.5), 0 0 16px 3px rgba(255,255,255,0.6), 0 0 0 1.5px rgba(255,255,255,0.7); }
        }
        .note-glow {
          animation: noteGlowPulse 2.8s ease-in-out infinite;
        }
        @keyframes noteNewGlowPulse {
          0%, 100% { box-shadow: 0 2px 10px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(125,211,252,0.55); }
          50%      { box-shadow: 0 2px 10px rgba(0,0,0,0.5), 0 0 12px 2px rgba(125,211,252,0.45), 0 0 0 1.5px rgba(125,211,252,0.8); }
        }
        .note-new-glow {
          animation: noteNewGlowPulse 2.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .note-glow, .note-new-glow { animation: none; box-shadow: 0 0 0 1.5px rgba(255,255,255,0.6); }
        }
      `}</style>
    </div>
  );
}
