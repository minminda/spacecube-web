import { describe, it, expect } from "vitest";
import { WORLD_W, WORLD_H, NOTE_EDGE_MARGIN, rotatedOverhang, noteSafeBounds, clampNoteToWorld, centerBiased, centralBounds } from "./guestbookNoteBounds";
import { POST_IT_WIDTH, POST_IT_HEIGHT, findFreePosition } from "./postitCollision";

/** 회전한 포스트잇의 실제 외곽(world 좌표)이 world 안에 있는지 */
function insideWorld(p: { x: number; y: number }, deg: number) {
  const { dx, dy } = rotatedOverhang(POST_IT_WIDTH, POST_IT_HEIGHT, deg);
  return p.x - dx >= 0 && p.y - dy >= 0 && p.x + POST_IT_WIDTH + dx <= WORLD_W && p.y + POST_IT_HEIGHT + dy <= WORLD_H;
}

describe("포스트잇 world 경계 보정", () => {
  it("회전하면 외곽이 커진다(0°는 그대로)", () => {
    expect(rotatedOverhang(170, 190, 0)).toEqual({ dx: 0, dy: 0 });
    const r = rotatedOverhang(170, 190, 4);
    expect(r.dx).toBeGreaterThan(0);
    expect(r.dy).toBeGreaterThan(0);
  });

  it("안전 범위는 여백 + 회전 외곽만큼 안쪽", () => {
    const b = noteSafeBounds(0);
    expect(b.minX).toBeGreaterThanOrEqual(NOTE_EDGE_MARGIN);
    expect(b.maxX + POST_IT_WIDTH).toBeLessThanOrEqual(WORLD_W - NOTE_EDGE_MARGIN);
    expect(b.maxY + POST_IT_HEIGHT).toBeLessThanOrEqual(WORLD_H - NOTE_EDGE_MARGIN);
  });

  it.each([
    ["왼쪽 밖", { x: -60, y: 2500 }],
    ["오른쪽 걸침", { x: 4880, y: 2400 }],
    ["위 밖", { x: 2500, y: -40 }],
    ["아래 걸침", { x: 2500, y: 4900 }],
    ["오른쪽 아래 모서리", { x: 4950, y: 4950 }],
  ])("%s 좌표도 회전 포함 전체가 world 안으로 보정된다", (_label, p) => {
    for (const rotation of [-4, 0, 2.5, 4]) {
      const shown = clampNoteToWorld({ ...p, rotation });
      expect(insideWorld(shown, rotation)).toBe(true);
    }
  });

  it("안쪽 좌표는 바꾸지 않는다(기존 배치 그대로)", () => {
    expect(clampNoteToWorld({ x: 2200, y: 2600, rotation: 3 })).toEqual({ x: 2200, y: 2600 });
  });

  it("빈자리 탐색은 bounds 밖 후보를 고르지 않는다", () => {
    const safe = noteSafeBounds();
    // 오른쪽 끝을 원했는데 그 자리가 막혀 있으면 → 바깥(오른쪽)으로 밀려나지 않고 안쪽에서 찾는다
    const blocker = { x: safe.maxX, y: 2500, width: POST_IT_WIDTH, height: POST_IT_HEIGHT };
    const found = findFreePosition({ x: 4950, y: 2500 }, POST_IT_WIDTH, POST_IT_HEIGHT, [blocker], { bounds: safe });
    expect(found).not.toBeNull();
    expect(found!.x).toBeGreaterThanOrEqual(safe.minX);
    expect(found!.x).toBeLessThanOrEqual(safe.maxX);
    expect(found!.y).toBeGreaterThanOrEqual(safe.minY);
    expect(found!.y).toBeLessThanOrEqual(safe.maxY);
    // bounds 없이 부르면 예전과 같다(호환)
    expect(findFreePosition({ x: 100, y: 100 }, POST_IT_WIDTH, POST_IT_HEIGHT, [])).toEqual({ x: 100, y: 100 });
  });

  it("거리 분포는 가까운 쪽이 더 촘촘하다(0~1, 평균 0.5 미만)", () => {
    let h = 12345;
    const rand = () => ((h = (h * 16807) % 2147483647) / 2147483647);
    const vals = Array.from({ length: 4000 }, () => centerBiased(rand(), rand()));
    expect(Math.min(...vals)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...vals)).toBeLessThan(1);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    expect(mean).toBeLessThan(0.4);
    const near = vals.filter((v) => v < 0.33).length;
    const far = vals.filter((v) => v > 0.66).length;
    expect(near).toBeGreaterThan(far * 2);
  });

  it("가운데 70% 범위", () => {
    const b = centralBounds(0.7);
    expect(b.minX).toBeCloseTo(750);
    expect(b.maxX + POST_IT_WIDTH).toBeCloseTo(4250);
  });
});
