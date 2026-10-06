import { describe, it, expect } from "vitest";
import { layoutSampleNotes, noteFootprint, sampleArea, SAMPLE_AREA_RATIO, IMAGE_NOTE_HEIGHT, type SampleNoteInput, type RealNoteInput } from "./sampleGuestbookLayout";
import { rectsOverlap, POST_IT_HEIGHT } from "./postitCollision";
import { WORLD_W, WORLD_H, rotatedOverhang } from "./guestbookNoteBounds";

const centers = { FREE: { x: 2500, y: 2500 }, QUESTION_1: { x: 2000, y: 2200 }, QUESTION_2: { x: 3000, y: 2800 } };
const labels = Object.values(centers);

/** 레이아웃 결과를 기존 목록에 적용 */
function apply(existing: SampleNoteInput[], moves: { id: string; x: number; y: number }[]) {
  const m = new Map(moves.map((v) => [v.id, v]));
  return existing.map((n) => (m.has(n.id) ? { ...n, x: m.get(n.id)!.x, y: m.get(n.id)!.y } : n));
}

const real: RealNoteInput[] = [
  { x: 2300, y: 2600, rotation: 2, hasImage: false },
  { x: 2700, y: 2300, rotation: -3, hasImage: true },
  { x: -60, y: 2500, rotation: 0, hasImage: false }, // 실제 글이 경계 밖이어도 그대로 둔다(장애물로만)
];

const existing: SampleNoteInput[] = [
  { id: "safe1", x: 2050, y: 2450, rotation: 1, clusterType: "QUESTION_1" },
  { id: "edge-right", x: 4880, y: 2400, rotation: 3, clusterType: "QUESTION_1" },
  { id: "outside-left", x: -60, y: 2500, rotation: -2, clusterType: "QUESTION_2" },
  { id: "outer-ring", x: 4200, y: 4300, rotation: 0, clusterType: "FREE" }, // world 안이지만 중앙 영역 밖
  { id: "overlap-real", x: 2310, y: 2610, rotation: 0, clusterType: "FREE" },
  { id: "overlap-safe1", x: 2060, y: 2460, rotation: 0, clusterType: "QUESTION_1" },
  { id: "on-label", x: 2915, y: 2735, rotation: 0, clusterType: "QUESTION_2" },
];

describe("방명록 샘플 좌표 정리", () => {
  const run = (ex: SampleNoteInput[], add: { cluster: "FREE" | "QUESTION_1" | "QUESTION_2"; seed: string }[] = []) =>
    layoutSampleNotes({ existing: ex, add, real, clusterCenters: centers, visibleLabels: labels });

  it("안전한 샘플은 그대로, 안전하지 않은 샘플만 옮긴다", () => {
    const { moves } = run(existing);
    const moved = new Set(moves.map((m) => m.id));
    expect(moved.has("safe1")).toBe(false);
    for (const id of ["edge-right", "outside-left", "outer-ring", "overlap-real", "overlap-safe1", "on-label"]) expect(moved.has(id), id).toBe(true);
  });

  it("옮긴 뒤 모든 샘플이 가운데 영역 안 · 회전 포함 world 경계 안 · 실제 글/라벨/서로와 겹치지 않는다", () => {
    const after = apply(existing, run(existing).moves);
    const area = sampleArea();
    const realFps = real.map((n) => noteFootprint(n.x, n.y, n.rotation, n.hasImage ? IMAGE_NOTE_HEIGHT : POST_IT_HEIGHT));
    for (const n of after) {
      expect(n.x).toBeGreaterThanOrEqual(area.minX);
      expect(n.x).toBeLessThanOrEqual(area.maxX);
      expect(n.y).toBeGreaterThanOrEqual(area.minY);
      expect(n.y).toBeLessThanOrEqual(area.maxY);
      const { dx, dy } = rotatedOverhang(170, POST_IT_HEIGHT, n.rotation);
      expect(n.x - dx).toBeGreaterThan(0);
      expect(n.y + POST_IT_HEIGHT + dy).toBeLessThan(WORLD_H);
      const fp = noteFootprint(n.x, n.y, n.rotation);
      for (const r of realFps) expect(rectsOverlap(fp, r, 0), `${n.id} vs real`).toBe(false);
      for (const o of after) if (o.id !== n.id) expect(rectsOverlap(fp, noteFootprint(o.x, o.y, o.rotation), 0), `${n.id} vs ${o.id}`).toBe(false);
    }
  });

  it("다시 실행하면 아무것도 옮기지 않는다(멱등) · 같은 입력은 같은 결과(결정적)", () => {
    const first = run(existing);
    expect(run(existing)).toEqual(first);
    const after = apply(existing, first.moves);
    expect(run(after).moves).toEqual([]);
    expect(run(apply(after, run(after).moves)).moves).toEqual([]);
  });

  it("빈 공간에 12개를 새로 놓아도 모두 가운데 영역에 겹치지 않게 모인다", () => {
    const add = Array.from({ length: 12 }, (_, i) => ({ cluster: (i % 2 ? "QUESTION_2" : "QUESTION_1") as "QUESTION_1" | "QUESTION_2", seed: `n${i}` }));
    const { placements } = layoutSampleNotes({ existing: [], add, real: [], clusterCenters: centers, visibleLabels: labels });
    expect(placements.every(Boolean)).toBe(true);
    const area = sampleArea();
    const pts = placements as { x: number; y: number }[];
    for (const p of pts) {
      expect(p.x >= area.minX && p.x <= area.maxX && p.y >= area.minY && p.y <= area.maxY).toBe(true);
    }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(rectsOverlap(noteFootprint(pts[i].x, pts[i].y, 8), noteFootprint(pts[j].x, pts[j].y, 8), 0)).toBe(false);
    // 군집 근처에 모인다 — 평균 거리가 중앙 영역 반폭보다 훨씬 작다
    const meanDist = pts.reduce((s, p, i) => { const c = i % 2 ? centers.QUESTION_2 : centers.QUESTION_1; return s + Math.hypot(p.x + 85 - c.x, p.y + 95 - c.y); }, 0) / pts.length;
    expect(meanDist).toBeLessThan((WORLD_W * SAMPLE_AREA_RATIO) / 4);
  });

  it("새로 놓은 샘플도 다음 실행에서 옮겨지지 않는다", () => {
    const add = Array.from({ length: 6 }, (_, i) => ({ cluster: "FREE" as const, seed: `m${i}` }));
    const r1 = run([existing[0]], add);
    const created: SampleNoteInput[] = (r1.placements as { x: number; y: number }[]).map((p, i) => ({ id: `new${i}`, ...p, rotation: i % 2 ? 4 : -4, clusterType: "FREE" }));
    expect(run([existing[0], ...created]).moves).toEqual([]);
  });

  it("실제 글은 입력에만 쓰이고 옮길 대상에 절대 들어가지 않는다", () => {
    const { moves } = run(existing);
    const ids = new Set(existing.map((n) => n.id));
    expect(moves.every((m) => ids.has(m.id))).toBe(true);
  });
});
