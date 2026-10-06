/* ── 방명록 샘플(더미) 좌표 정리 · 배치(순수 함수 — scripts/seed-sample-guestbook.ts가 쓴다) ─────────────────
   실제 글 · 군집 라벨은 장애물로만 읽고, 샘플 글의 좌표만 계산한다.
   - 이미 안전한 샘플(중앙 영역 안 · 회전 외곽 포함 경계 안 · 실제 글/라벨/다른 샘플과 겹치지 않음)은 그대로 둔다.
   - 안전하지 않은 샘플만, note id로 고정된 난수로 고른 자리로 옮긴다 → 다시 실행해도 같은 결과(멱등), 배포마다 흔들리지 않는다.
   - 새로 추가할 샘플도 같은 영역 · 같은 규칙으로 자리를 찾는다. ── */

import { POST_IT_HEIGHT, POST_IT_WIDTH, clusterLabelRect, findFreePosition, hasCollision, type Point, type Rect } from "./postitCollision";
import { centerBiased, centralBounds, noteSafeBounds, rotatedOverhang, type NoteBox } from "./guestbookNoteBounds";

/** 샘플을 놓는 world 가운데 비율 — 가장자리에는 두지 않는다 */
export const SAMPLE_AREA_RATIO = 0.5;
/** 샘플끼리 · 실제 글과의 최소 간격(world px) — 기본 충돌 여백보다 넉넉하게 */
export const SAMPLE_GAP = 36;
/** 사진이 붙은 실제 포스트잇의 세로 크기(폭 170 기준 정사각 사진 + 글) — 고정 풋프린트보다 크다 */
export const IMAGE_NOTE_HEIGHT = 320;

type Cluster = "FREE" | "QUESTION_1" | "QUESTION_2";

export interface SampleNoteInput {
  id: string;
  x: number;
  y: number;
  rotation: number;
  clusterType: Cluster;
}

export interface RealNoteInput {
  x: number;
  y: number;
  rotation: number;
  hasImage: boolean;
}

/** 샘플을 둘 수 있는 top-left 범위 — 가운데 SAMPLE_AREA_RATIO ∩ 회전 외곽까지 world 경계 안 */
export function sampleArea(): NoteBox {
  const central = centralBounds(SAMPLE_AREA_RATIO);
  const safe = noteSafeBounds();
  return { minX: Math.max(central.minX, safe.minX), minY: Math.max(central.minY, safe.minY), maxX: Math.min(central.maxX, safe.maxX), maxY: Math.min(central.maxY, safe.maxY) };
}

/** 회전 외곽까지 포함한 실제 차지 영역 */
export function noteFootprint(x: number, y: number, rotation: number, height = POST_IT_HEIGHT): Rect {
  const { dx, dy } = rotatedOverhang(POST_IT_WIDTH, height, rotation);
  return { x: x - dx, y: y - dy, width: POST_IT_WIDTH + 2 * dx, height: height + 2 * dy };
}

function inArea(p: Point, area: NoteBox): boolean {
  return p.x >= area.minX && p.x <= area.maxX && p.y >= area.minY && p.y <= area.maxY;
}

/* id 문자열로 고정되는 난수(같은 글이면 항상 같은 자리) */
export function seededRandom(seedText: string): () => number {
  let h = 2166136261;
  for (const c of seedText) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** 군집 중심 근처(가까울수록 촘촘) — 중앙 영역 안으로 당긴 원하는 top-left */
function desiredNear(center: Point, seed: string, area: NoteBox): Point {
  const rand = seededRandom(seed);
  const angle = rand() * Math.PI * 2;
  const r = 200 + centerBiased(rand(), rand()) * 420;
  const x = center.x + Math.cos(angle) * r - POST_IT_WIDTH / 2;
  const y = center.y + Math.sin(angle) * r * 0.85 - POST_IT_HEIGHT / 3;
  return { x: Math.min(Math.max(x, area.minX), area.maxX), y: Math.min(Math.max(y, area.minY), area.maxY) };
}

export interface SampleLayoutResult {
  /** 옮길 기존 샘플(새 top-left) */
  moves: { id: string; x: number; y: number }[];
  /** 새 샘플 자리(입력 add 순서와 같음) — 못 찾으면 null */
  placements: (Point | null)[];
}

/**
 * 기존 샘플 정리 + 새 샘플 자리 찾기.
 * 순서: 실제 글 · 라벨을 장애물로 → 기존 샘플을 (입력 순서대로) 안전하면 유지 · 장애물에 추가 → 안전하지 않은 샘플을 옮김 → 새 샘플 배치.
 * 호출부는 existing을 createdAt · id 순으로 넘겨야 한다(실행마다 같은 순서 → 같은 결과).
 */
export function layoutSampleNotes(input: {
  existing: SampleNoteInput[];
  add: { cluster: Cluster; seed: string }[];
  real: RealNoteInput[];
  clusterCenters: Record<Cluster, Point>;
  /** 화면에 보이는 군집 라벨 중심(라벨 위에는 두지 않는다) */
  visibleLabels: Point[];
}): SampleLayoutResult {
  const area = sampleArea();
  const obstacles: Rect[] = [
    ...input.real.map((n) => noteFootprint(n.x, n.y, n.rotation, n.hasImage ? IMAGE_NOTE_HEIGHT : POST_IT_HEIGHT)),
    ...input.visibleLabels.map((c) => clusterLabelRect(c)),
  ];

  const toMove: SampleNoteInput[] = [];
  for (const n of input.existing) {
    const fp = noteFootprint(n.x, n.y, n.rotation);
    if (inArea(n, area) && !hasCollision(fp, obstacles, SAMPLE_GAP)) obstacles.push(fp);
    else toMove.push(n);
  }

  // 회전 외곽까지 넉넉히 잡은 풋프린트로 자리를 찾고(최대 회전 기준), 저장은 top-left 그대로
  const { dx, dy } = rotatedOverhang(POST_IT_WIDTH, POST_IT_HEIGHT, 8);
  const place = (desired: Point): Point | null => {
    const found = findFreePosition({ x: desired.x - dx, y: desired.y - dy }, POST_IT_WIDTH + 2 * dx, POST_IT_HEIGHT + 2 * dy, obstacles, {
      gap: SAMPLE_GAP,
      step: (POST_IT_WIDTH + SAMPLE_GAP) / 2,
      maxRings: 40,
      bounds: { minX: area.minX - dx, minY: area.minY - dy, maxX: area.maxX - dx, maxY: area.maxY - dy },
    });
    if (!found) return null;
    const p = { x: Math.round(found.x + dx), y: Math.round(found.y + dy) };
    obstacles.push(noteFootprint(p.x, p.y, 8));
    return p;
  };

  const moves: SampleLayoutResult["moves"] = [];
  for (const n of toMove) {
    const p = place(desiredNear(input.clusterCenters[n.clusterType], `sample-layout:${n.id}`, area));
    if (p && (p.x !== n.x || p.y !== n.y)) moves.push({ id: n.id, ...p });
  }
  const placements = input.add.map((a) => place(desiredNear(input.clusterCenters[a.cluster], `sample-layout:${a.seed}`, area)));
  return { moves, placements };
}

