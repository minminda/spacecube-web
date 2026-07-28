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
  WORLD_W,
  WORLD_H,
  NOTE_W,
  type GuestbookNoteData,
} from "./canvasConstants";
import GuestbookCommentThread from "@/components/GuestbookCommentThread";
import CubeReactionIcon from "@/components/CubeReactionIcon";
import GuestbookClusterLabel from "@/components/GuestbookClusterLabel";
import {
  findFreePosition,
  clusterLabelRect,
  POST_IT_HEIGHT,
  type Rect,
} from "@/lib/postitCollision";
import { computeInitialViewport } from "@/lib/guestbookViewport";
import { useToast } from "@/hooks/useToast";
import { formatFetchException } from "@/lib/formatFetchError";

const SUBMIT_TIMEOUT_MS = 10_000;

const ALREADY_COMMENTED_MSG = "이번 방문의 답글을 이미 남겼습니다. 다음 방문에서 새로운 답글을 남길 수 있어요.";

/* ── 방명록 캔버스 (전체 화면, 진짜 무한 캔버스) ──────────────────
   관리자가 설정한 배경/포스트잇 색/레이아웃을 반영한다. 설정이 없으면
   기존 기본값(검정 배경 · 노란 포스트잇 · 자유 배치)을 그대로 쓴다.
   한 공간당 사용자는 흔적을 하나만 남길 수 있고, 내 흔적은 은은하게
   빛나며 언제든 찾을 수 있다. 리뷰 아님: 별점/좋아요/댓글/프로필 없음.
──────────────────────────────────────────────────────────── */

const MAX_CONTENT = 80;
const CLICK_TOLERANCE = 8; // px — 이보다 크게 움직이면 팬으로 간주
const DEFAULT_SCALE = 0.35; // 콘텐츠가 없을 때 쓰는 안정적인 기본 배율
const MIN_INITIAL_SCALE = 0.16; // 최종(줌아웃 후) 배율 하한 — 질문/포스트잇이 너무 작아 안 보이는 걸 방지
const MAX_INITIAL_SCALE = 0.9; // 최종(줌아웃 후) 배율 상한 — 콘텐츠가 아주 좁게 몰려 있어도 과하게 확대되지 않도록
const MAX_SCALE = 2.2; // 캔버스 전체 최대 줌 — TransformWrapper와 진입 연출 시작 배율 계산이 공유하는 상한
const INTRO_HOLD_MS = 150; // 확대된 시작 지점에서 잠깐 머무는 시간
const INTRO_DURATION_MS = 700; // 목표 배율까지 줌아웃하는 시간 — 전체 진입 연출(hold+줌아웃)이 약 700~1000ms 범위에 들어오도록
const INTRO_START_SCALE_MULTIPLIER = 1.6; // 시작 배율 = 목표 배율의 약 1.4~1.8배
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

import type { VisibleCluster } from "@/lib/guestbookSession";
export type ClusterLabel = VisibleCluster;

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
  /** 내 흔적 중 가장 최근 것의 id — 없으면 null */
  initialMyNoteId: string | null;
  /** 이번 방문(가장 최근 인정된 방문)에 아직 흔적을 안 남겼는지 — "한 번의 방문은 하나의 흔적을 남긴다" */
  initialCanWriteThisVisit: boolean;
  /** 이번 방문으로 이미 댓글을 남겼는지 — true면 어느 포스트잇에도 새 댓글을 남길 수 없다 */
  hasCommentedThisVisit: boolean;
  nickname: string | null;
  settings: GuestbookDisplaySettings;
  /** 내 직전 방문 이후 새로 생긴(남의) 흔적 수 — 0이면 재방문 안내를 띄우지 않는다 */
  newNotesCount: number;
  /** 현재 세션의 군집 라벨 — 질문이 없는 군집은 애초에 배열에 없다 */
  clusters: ClusterLabel[];
  /** 로그인한 내 사용자 id — 댓글 본인 확인(수정/삭제 노출)에 사용, 비로그인이면 null */
  currentUserId: string | null;
  /** 이번 방문(가장 최근 인정된 Record)의 id — "이번 경험 마치기"가 완료 페이지로 넘겨줄 식별자, 없으면 null(비로그인 등) */
  currentRecordId: string | null;
  /** 파일럿 플래그 — 방명록 이미지 첨부(업로드·표시) 허용 여부. off면 사진 UI와 기존 이미지 표시를 모두 숨긴다. */
  enableImage: boolean;
  /** 파일럿 플래그 — 방명록 댓글(작성·표시) 허용 여부. off면 댓글 스레드를 숨긴다. */
  enableComments: boolean;
}

// 포스트잇 텍스트는 노란 종이 위 고정 잉크색 (테마 무관)
const INK = "#3d3524";
const INK_DIM = "#8a7d5c";

export default function GuestbookCanvas({ space, initialNotes, isLoggedIn, initialMyNoteId, initialCanWriteThisVisit, hasCommentedThisVisit: initialHasCommentedThisVisit, nickname, settings, newNotesCount, clusters, currentUserId, currentRecordId, enableImage, enableComments }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const lastTransformRef = useRef({ positionX: 0, positionY: 0, scale: DEFAULT_SCALE });
  const preComposeTransformRef = useRef<{ positionX: number; positionY: number; scale: number } | null>(null);
  const introTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const focusId = searchParams.get("focus");

  const [notes, setNotes] = useState<GuestbookNoteData[]>(initialNotes);
  const [myNoteId, setMyNoteId] = useState<string | null>(initialMyNoteId);
  const [canWriteThisVisit, setCanWriteThisVisit] = useState(initialCanWriteThisVisit);
  const [hasCommentedThisVisit, setHasCommentedThisVisit] = useState(initialHasCommentedThisVisit);
  const [myNickname, setMyNickname] = useState<string | null>(nickname);
  const [writeMode, setWriteMode] = useState(
    searchParams.get("mode") === "write" && isLoggedIn && initialCanWriteThisVisit,
  );
  const [composer, setComposer] = useState<{ x: number; y: number } | null>(null);
  const [composerClusterType, setComposerClusterType] = useState<ClusterLabel["type"]>("FREE");
  const [content, setContent] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast(2600);
  const [scalePct, setScalePct] = useState(100);
  const [introPlaying, setIntroPlaying] = useState(!focusId);
  const [revisitNoticeOpen, setRevisitNoticeOpen] = useState(newNotesCount > 0);
  const [navigatingToComplete, setNavigatingToComplete] = useState(false);

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

  const allNotes = notes;
  const worldBg = settings.backgroundType === "color" ? settings.backgroundColor : "#000000";

  function effectiveRotation(r: number) {
    return settings.allowRotation ? r : 0;
  }

  /** 재생 중인 진입 연출을 즉시 멈춘다 — 사용자가 드래그/휠/핀치를 시작하면 자동 애니메이션보다
      사용자 입력을 우선한다. 남은 타이머를 정리하고, 지금 보이는 위치(lastTransformRef, onTransform으로
      매 프레임 갱신됨)에 그대로 멈춰 세워 시각적 점프 없이 조작권을 넘긴다. */
  const cancelIntro = useCallback(() => {
    if (introTimersRef.current.length === 0) return;
    introTimersRef.current.forEach(clearTimeout);
    introTimersRef.current = [];
    const ctrl = transformRef.current;
    if (ctrl) {
      const { positionX, positionY, scale } = lastTransformRef.current;
      ctrl.setTransform(positionX, positionY, scale, 0);
    }
    setIntroPlaying(false);
  }, []);

  // ── 진입 연출: 콘텐츠 중심부를 가깝게 보여주다 잠시 후 목표 배율까지 부드럽게 줌아웃한다.
  // "특정 좌표로 강제 이동"이 아니라 이번 세션의 질문 군집 + 포스트잇 좌표로 계산한 중심을
  // 기준으로 하며, 페이지 진입 시 한 번만 실행되고(포스트잇 작성/공감/내 기록 이동 등으로
  // 다시 실행되지 않음) 사용자 조작이 시작되면 cancelIntro()가 즉시 중단시킨다.
  //
  // TransformWrapper의 onInit에서 트리거한다 — react-zoom-pan-pinch는 자신의 wrapper/content DOM을
  // useEffect(패시브 이펙트)에서 연결하므로, 여기서 useLayoutEffect로 setTransform을 먼저 호출하면
  // 라이브러리가 아직 준비되지 않아 조용히 무시된다(관찰됨: 화면이 그냥 기본 배율로 시작해버림).
  // onInit은 라이브러리가 실제로 준비된 시점에 정확히 한 번 불리므로 이 경쟁 상태가 없다.
  const introRanRef = useRef(false);
  const startIntro = useCallback((ctrl: ReactZoomPanPinchContentRef) => {
    if (introRanRef.current) return; // StrictMode 등으로 인한 중복 호출 방지
    if (focusId) return; // focus 진입(딥링크)은 별도 effect가 특정 포스트잇으로 바로 이동시킨다
    const viewport = viewportRef.current;
    if (!viewport) return;
    introRanRef.current = true;

    const { clientWidth, clientHeight } = viewport;
    const points = [
      ...clusters.map((c) => ({ x: c.x, y: c.y })),
      ...initialNotes.map((n) => ({ x: n.x + NOTE_W / 2, y: n.y + POST_IT_HEIGHT / 2 })),
    ];
    const { cx, cy, span } = computeInitialViewport(points, { x: WORLD_W / 2, y: WORLD_H / 2 });

    const targetScale = points.length === 0
      ? DEFAULT_SCALE
      : Math.min(Math.max((Math.min(clientWidth, clientHeight) / span) * settings.initialZoom, MIN_INITIAL_SCALE), MAX_INITIAL_SCALE);
    const endX = clientWidth / 2 - cx * targetScale;
    const endY = clientHeight / 2 - cy * targetScale;

    // 모션 감소 환경 — 확대→줌아웃 연출 없이 최종 fit-to-view 상태로 바로 진입
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      ctrl.setTransform(endX, endY, targetScale, 0);
      setScalePct(Math.round(targetScale * 100));
      setIntroPlaying(false);
      return;
    }

    const startScale = Math.min(targetScale * INTRO_START_SCALE_MULTIPLIER, MAX_SCALE);
    const startX = clientWidth / 2 - cx * startScale;
    const startY = clientHeight / 2 - cy * startScale;

    ctrl.setTransform(startX, startY, startScale, 0);
    setScalePct(Math.round(startScale * 100));

    const holdTimer = setTimeout(() => {
      ctrl.setTransform(endX, endY, targetScale, INTRO_DURATION_MS, "easeOut");
      const endTimer = setTimeout(() => {
        introTimersRef.current = []; // 자연 종료 — cancelIntro가 이후엔 아무 것도 하지 않도록 비워둔다
        setIntroPlaying(false);
      }, INTRO_DURATION_MS);
      introTimersRef.current.push(endTimer);
    }, INTRO_HOLD_MS);
    introTimersRef.current.push(holdTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  useEffect(() => {
    return () => {
      introTimersRef.current.forEach(clearTimeout);
      introTimersRef.current = [];
    };
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
    if (!canWriteThisVisit) return;
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

  // 탭한 위치에서 가장 가까운 군집을 찾는다 — 물리적 제한이 아니라 clusterType 메타데이터 결정용.
  function nearestClusterType(x: number, y: number): ClusterLabel["type"] {
    if (clusters.length === 0) return "FREE";
    let best = clusters[0];
    let bestDist = Infinity;
    for (const c of clusters) {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best.type;
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

  /** 현재 캔버스에 렌더링되는 모든 포스트잇 + 군집 라벨(고정 오브젝트)을 충돌 검사 대상으로 만든다. */
  function collisionObstacles(): Rect[] {
    return [
      ...notes.map((n) => ({ x: n.x, y: n.y, width: NOTE_W, height: POST_IT_HEIGHT })),
      ...clusters.map((c) => clusterLabelRect(c)),
    ];
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

    const desiredX = Math.min(Math.max(snapped.x, 40), WORLD_W - NOTE_W - 40);
    const desiredY = Math.min(Math.max(snapped.y, 40), WORLD_H - 220);

    // 기존 포스트잇/고정 오브젝트와 겹치면 가장 가까운 빈 위치를 찾는다 — 중심 좌표가 아니라 실제 영역 기준.
    const found = findFreePosition(
      { x: desiredX, y: desiredY },
      NOTE_W,
      POST_IT_HEIGHT,
      collisionObstacles(),
    );
    if (!found) {
      showToast("이 주변에는 흔적이 가득합니다. 조금 다른 위치를 선택해주세요.");
      return;
    }
    const { x, y } = found;
    if (x !== desiredX || y !== desiredY) {
      showToast("가까운 빈자리에 흔적을 놓았습니다.");
    }

    // 생성 직후 해당 위치로 부드럽게 이동/확대하고, 취소 시 되돌아갈 이전 위치를 기억해둔다
    preComposeTransformRef.current = { ...lastTransformRef.current };
    setComposer({ x, y });
    setComposerClusterType(nearestClusterType(x + NOTE_W / 2, y + 70));
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
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
          clusterType: composerClusterType,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "POSITION_OCCUPIED" || data.code === "POSTIT_POSITION_OCCUPIED") {
          showToast("다른 사람이 방금 이 자리에 흔적을 남겼어요. 다른 위치를 골라주세요.");
          cancelCompose();
          return;
        }
        if (data.code === "VISIT_ALREADY_POSTED") {
          // 응답을 못 받은 채 재시도한 경우 등 — 실제로는 이전 시도가 이미 성공한 상태다.
          // 실패로 보이지 않게 성공과 동일하게 캔버스를 정리한다(새로고침하면 내 흔적이 보인다).
          showToast("이번 방문에 이미 흔적을 남기셨어요.");
          setComposer(null);
          setContent("");
          setPhotoPreview(null);
          setPhotoUrl(null);
          preComposeTransformRef.current = null;
          exitWriteMode();
          return;
        }
        showToast(data.error ?? "저장에 실패했습니다.");
        return;
      }
      const noteFields: GuestbookNoteData = await res.json();
      const d = new Date(noteFields.createdAt);
      noteFields.createdAt = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      setNotes((prev) => [...prev, noteFields]);
      setMyNoteId(noteFields.id);
      setCanWriteThisVisit(false);
      setComposer(null);
      setContent("");
      setPhotoPreview(null);
      setPhotoUrl(null);
      preComposeTransformRef.current = null; // 저장 완료 — 취소 시 되돌아갈 위치는 더 이상 필요 없음, 지금 확대 상태 유지
      exitWriteMode();
      // 포스트잇 저장만으로 캔버스를 닫거나 추천을 강제로 띄우지 않는다 — 짧은 완료 피드백만 주고
      // 캔버스 탐색을 계속할 수 있게 둔다. 추천은 "다음으로"(handleFinishVisit)를 눌렀을 때만 노출.
      showToast("흔적이 저장되었습니다.");
    } catch (err) {
      showToast(formatFetchException(err));
    } finally {
      clearTimeout(timeout);
      setSaving(false);
    }
  }

  /** "이번 경험 마치기" — 포스트잇 작성 여부와 무관하게 항상 누를 수 있다(방명록은 선택 기능).
      별도의 방문 완료·추천 페이지로 이동한다(모달로 즉시 계산하지 않음). 브라우저 뒤로가기는
      건드리지 않으므로, 이 페이지에서 뒤로가기를 누르면 다시 이 캔버스로 돌아온다. */
  function finishVisit() {
    if (navigatingToComplete || !currentRecordId) return; // 연속 클릭으로 중복 라우팅되는 것만 막는다
    setNavigatingToComplete(true);
    router.push(`/space/${space.slug}/complete?recordId=${currentRecordId}`);
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

  async function toggleReaction(noteId: string) {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/space/${space.slug}/guestbook`)}`);
      return;
    }
    const res = await fetch(`/api/guestbook/${noteId}/reactions`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error ?? "공감 처리에 실패했습니다.");
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, reactionCount: data.reactionCount, reactedByMe: data.reacted } : n)));
    setFocused((prev) => (prev && prev.id === noteId ? { ...prev, reactionCount: data.reactionCount, reactedByMe: data.reacted } : prev));
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 3.5rem)", background: worldBg }}>

      {/* ── 상단 ── */}
      <div className="flex items-center justify-between px-6 py-4 gap-3">
        <Link href={`/space/${space.slug}`} className="text-xs flex-shrink-0" style={{ color: "#888" }}>
          ← {space.name}
        </Link>
        <div className="flex items-center gap-3 flex-shrink-0">
          <p className="text-xs text-right" style={{ color: "#888" }}>
            이 공간에 남겨진 흔적 <span style={{ color: "#eee" }}>{allNotes.length}</span>개
          </p>
          <Link href={`/space/${space.slug}/guestbook/archive`} className="text-xs whitespace-nowrap" style={{ color: "#888" }}>
            이전 방명록 →
          </Link>
        </div>
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

        {/* 아직 흔적이 하나도 없는 공간 — 빈 상태 안내 */}
        <AnimatePresence>
          {allNotes.length === 0 && !introPlaying && !writeMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none px-8"
            >
              <div className="text-center space-y-2">
                <p className="text-sm leading-relaxed break-keep" style={{ color: "rgba(255,255,255,0.55)" }}>
                  아직 첫 번째 흔적을 기다리고 있습니다.
                </p>
                <p className="text-sm leading-relaxed break-keep" style={{ color: "rgba(255,255,255,0.55)" }}>
                  첫 번째 이야기를 남겨보세요.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <TransformWrapper
          ref={transformRef}
          initialScale={DEFAULT_SCALE}
          minScale={0.06}
          maxScale={MAX_SCALE}
          wheel={{ step: 0.12 }}
          pinch={{ step: 6 }}
          doubleClick={{ disabled: true }}
          panning={{ excluded: ["composer-block", "textarea", "button"] }}
          onInit={(ref) => startIntro(ref)}
          onPanningStart={() => cancelIntro()}
          onWheelStart={() => cancelIntro()}
          onPinchStart={() => cancelIntro()}
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

              {/* 군집 라벨 — 질문이 없거나 관리자가 숨긴 군집은 clusters 배열에 아예 없어서 렌더되지 않는다.
                  크기/색상은 관리자가 설정한 값을 그대로 쓴다(GuestbookClusterLabel 공용 컴포넌트,
                  관리자 미리보기와 동일 렌더 로직 재사용). */}
              {clusters.map((c) => (
                <div
                  key={c.type}
                  className="absolute pointer-events-none select-none"
                  style={{ left: c.x, top: c.y, transform: "translate(-50%, -50%)" }}
                >
                  <GuestbookClusterLabel cluster={c} />
                </div>
              ))}

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
                    {enableImage && note.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={note.imageUrl} alt="" className="w-full aspect-square object-cover mb-2" />
                    )}
                    <p className="text-[13px] leading-relaxed break-keep" style={{ color: INK }}>
                      {note.content}
                    </p>
                    {settings.showNickname && note.nickname && (
                      <p className="text-[10px] mt-1.5" style={{ color: INK_DIM }}>— {note.nickname}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px]" style={{ color: INK_DIM }}>{note.createdAt}</p>
                      {typeof note.reactionCount === "number" && note.reactionCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: INK_DIM }}>
                          <CubeReactionIcon className="w-2.5 h-2.5" />
                          {note.reactionCount}
                        </span>
                      )}
                    </div>
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

                  {enableImage && settings.allowImage && (
                    <div className="mb-2">
                      {photoPreview ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoPreview} alt="" className="w-full aspect-square object-cover" />
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

      {/* ── 하단 액션 영역 — 모바일 safe-area까지 자연스럽게 채우는 고정 액션 바.
          1행: 내 기록 보기 / 내 아카이브 보기(있을 때), 2행: 이번 경험 마치기(항상, 최우선순위).
          fixed/absolute가 아니라 flex 문서 흐름에 둬서 캔버스(flex-1)가 이 높이만큼 자동으로
          줄어든다 — 포스트잇/질문이 버튼 뒤에 가려지지 않고, 드래그·줌 이벤트와도 겹치지 않는다. ── */}
      <div
        className="flex-shrink-0 transition-opacity"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.14)",
          background: worldBg,
          paddingBottom: "env(safe-area-inset-bottom)",
          opacity: introPlaying ? 0.3 : 1,
          pointerEvents: introPlaying ? "none" : "auto",
        }}
      >
        <div className="flex items-center justify-center gap-1.5 px-4 pt-2">
          <button type="button" aria-label="줌 아웃" onClick={() => transformRef.current?.zoomOut(0.35)} className="w-8 h-8 border text-sm flex-shrink-0" style={{ borderColor: "#333", color: "#999" }}>−</button>
          <span className="text-xs w-12 text-center tabular-nums flex-shrink-0" style={{ color: "#999" }}>{scalePct}%</span>
          <button type="button" aria-label="줌 인" onClick={() => transformRef.current?.zoomIn(0.35)} className="w-8 h-8 border text-sm flex-shrink-0" style={{ borderColor: "#333", color: "#999" }}>+</button>
        </div>

        <div className="max-w-md mx-auto w-full px-4 pt-2 pb-3 flex flex-col gap-2">
          {(myNoteId || canWriteThisVisit) && (
            <div className="flex flex-col gap-2">
              {canWriteThisVisit && !writeMode && (
                <button
                  type="button"
                  onClick={enterWriteMode}
                  className="w-full min-h-[44px] text-xs py-2.5 px-3 border hover:bg-white hover:text-black transition-colors"
                  style={{ borderColor: "#fff", color: "#fff" }}
                >
                  {myNoteId ? "이번 방문에도 흔적 남기기" : "나도 흔적 남기기"}
                </button>
              )}
              {myNoteId && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={goToMyNote}
                    className="min-h-[44px] text-xs py-2.5 px-3 border hover:bg-white hover:text-black transition-colors whitespace-nowrap"
                    style={{ borderColor: "#fff", color: "#fff" }}
                  >
                    내 기록 보기
                  </button>
                  <Link
                    href="/archive"
                    className="min-h-[44px] flex items-center justify-center text-xs py-2.5 px-3 border text-center hover:bg-white hover:text-black transition-colors whitespace-nowrap"
                    style={{ borderColor: "#fff", color: "#fff" }}
                  >
                    내 아카이브 보기
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 방명록 작성 여부와 무관하게 항상 뜨는 명시적 종료 CTA — 채워진 배경으로 시각적
              우선순위를 가장 높게 두고, 브라우저 뒤로가기는 가로채지 않는다. */}
          <button
            type="button"
            onClick={finishVisit}
            disabled={navigatingToComplete || !currentRecordId}
            className="tap-target w-full text-sm font-medium py-3 px-3 transition-opacity disabled:opacity-40 break-keep"
            style={{ background: "#fff", color: "#000" }}
          >
            {navigatingToComplete ? "이동 중..." : myNoteId ? "이번 경험 마치기" : "작성하지 않고 마치기"}
          </button>
        </div>
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
                  {enableImage && focused.imageUrl && (
                    <button type="button" onClick={() => setLightbox(focused.imageUrl!)} className="block w-full mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={focused.imageUrl} alt="" className="w-full aspect-square object-cover" />
                    </button>
                  )}
                  <p className="text-base leading-relaxed break-keep" style={{ color: INK }}>{focused.content}</p>
                  {settings.showNickname && focused.nickname && (
                    <p className="text-sm mt-3" style={{ color: INK_DIM }}>— {focused.nickname}</p>
                  )}
                  <p className="text-xs mt-2" style={{ color: INK_DIM }}>{focused.createdAt}</p>

                  {typeof focused.reactionCount === "number" && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleReaction(focused.id); }}
                      disabled={isMine}
                      aria-label={focused.reactedByMe ? "공감 취소" : "공감"}
                      title={focused.reactedByMe ? "공감 취소" : "공감"}
                      className="inline-flex items-center justify-center gap-1.5 mt-3 min-w-[44px] min-h-[44px] px-3 border transition-transform active:scale-95 disabled:opacity-40"
                      style={{
                        borderColor: INK,
                        color: INK,
                        background: focused.reactedByMe ? "rgba(61,53,36,0.15)" : "transparent",
                        boxShadow: focused.reactedByMe ? "0 0 0 1px rgba(61,53,36,0.25)" : "none",
                      }}
                    >
                      <CubeReactionIcon active={!!focused.reactedByMe} className="w-4 h-4" />
                      {focused.reactionCount > 0 && (
                        <span className="text-xs tabular-nums">{focused.reactionCount}</span>
                      )}
                    </button>
                  )}

                  {enableComments && typeof focused.commentCount === "number" && (
                    <GuestbookCommentThread
                      noteId={focused.id}
                      initialCount={focused.commentCount}
                      isLoggedIn={isLoggedIn}
                      currentUserId={currentUserId}
                      disabledReason={hasCommentedThisVisit ? ALREADY_COMMENTED_MSG : undefined}
                      onCommentPosted={() => setHasCommentedThisVisit(true)}
                    />
                  )}

                  {!isMine && focused.userId && (
                    <div className="mt-7">
                      <Link
                        href={`/taste/${focused.userId}`}
                        className="inline-block text-xs py-1.5 px-2.5 border transition-colors"
                        style={{ borderColor: INK, color: INK }}
                      >
                        이 사용자의 공간 아카이브 보기 →
                      </Link>
                    </div>
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
                  {enableImage && settings.allowImage && (
                    <div className="mb-3">
                      {editPhotoPreview ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={editPhotoPreview} alt="" className="w-full aspect-square object-cover" />
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
              <p className="text-sm leading-relaxed break-keep" style={{ color: "#eee" }}>
                지난 방문 이후
                <br />새로운 흔적 {newNotesCount}개가 추가되었습니다.
              </p>
              <button
                type="button"
                onClick={() => setRevisitNoticeOpen(false)}
                className="tap-target w-full text-xs py-2.5 border transition-colors hover:bg-white hover:text-black"
                style={{ borderColor: "#eee", color: "#eee" }}
              >
                확인
              </button>
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
