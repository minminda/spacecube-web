import { describe, it, expect } from "vitest";
import {
  rectsOverlap,
  hasCollision,
  clusterLabelRect,
  findFreePosition,
  POST_IT_WIDTH,
  POST_IT_HEIGHT,
  POST_IT_GAP,
} from "./postitCollision";

const W = POST_IT_WIDTH;
const H = POST_IT_HEIGHT;

function rectAt(x: number, y: number) {
  return { x, y, width: W, height: H };
}

describe("rectsOverlap", () => {
  it("완전히 떨어진 사각형은 충돌하지 않는다", () => {
    const a = rectAt(0, 0);
    const b = rectAt(1000, 1000);
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it("일부만 겹쳐도 충돌로 판정한다", () => {
    const a = rectAt(0, 0);
    const b = rectAt(W / 2, H / 2); // 오른쪽 아래로 절반 겹침
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it("완전히 포함돼도 충돌로 판정한다", () => {
    const a = { x: 0, y: 0, width: 400, height: 400 };
    const b = rectAt(100, 100); // a 내부에 완전히 포함
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it("경계가 최소 간격보다 가까우면 충돌로 판정한다", () => {
    const a = rectAt(0, 0);
    const b = rectAt(W + POST_IT_GAP / 2, 0); // gap의 절반만큼만 떨어짐
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it("최소 간격 이상 떨어지면 충돌이 아니다", () => {
    const a = rectAt(0, 0);
    const b = rectAt(W + POST_IT_GAP, 0); // 정확히 gap만큼 떨어짐 — 허용 경계
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it("질문/자유 군집 라벨 영역과 겹치면 충돌로 판정한다", () => {
    const label = clusterLabelRect({ x: 2500, y: 2500 });
    const note = rectAt(2500 - W / 2, 2500 - H / 2); // 라벨 중심 위에 그대로 놓임
    expect(rectsOverlap(note, label)).toBe(true);
  });

  it("캔버스 좌표만 다루므로 화면 줌 배율과 무관하게 같은 결과를 낸다", () => {
    // 서로 다른 줌 배율(scale)에서 화면 좌표 → 캔버스 좌표로 변환해도 같은 캔버스 좌표면 같은 결과.
    const toWorld = (screenX: number, screenY: number, scale: number) => ({ x: screenX / scale, y: screenY / scale });
    const worldA = toWorld(340, 380, 2); // scale 2일 때 화면(340,380) → 캔버스(170,190)
    const worldB = toWorld(85, 95, 0.5); // scale 0.5일 때 화면(85,95) → 캔버스(170,190)
    expect(worldA).toEqual(worldB);
    const obstacle = rectAt(200, 200);
    expect(rectsOverlap(rectAt(worldA.x, worldA.y), obstacle)).toBe(
      rectsOverlap(rectAt(worldB.x, worldB.y), obstacle),
    );
  });
});

describe("hasCollision", () => {
  it("여러 오브젝트 중 하나라도 겹치면 true", () => {
    const obstacles = [rectAt(1000, 1000), rectAt(0, 0), rectAt(2000, 2000)];
    expect(hasCollision(rectAt(10, 10), obstacles)).toBe(true);
  });

  it("모두 떨어져 있으면 false", () => {
    const obstacles = [rectAt(1000, 1000), rectAt(2000, 2000)];
    expect(hasCollision(rectAt(0, 0), obstacles)).toBe(false);
  });
});

describe("findFreePosition", () => {
  it("클릭 위치가 비어 있으면 그대로 사용한다", () => {
    const result = findFreePosition({ x: 500, y: 500 }, W, H, []);
    expect(result).toEqual({ x: 500, y: 500 });
  });

  it("클릭 위치가 차 있으면 가장 가까운 빈 위치를 반환한다", () => {
    const obstacles = [rectAt(500, 500)];
    const result = findFreePosition({ x: 500, y: 500 }, W, H, obstacles);
    expect(result).not.toBeNull();
    expect(hasCollision({ x: result!.x, y: result!.y, width: W, height: H }, obstacles)).toBe(false);
    // 원래 클릭 지점보다 지나치게 멀리 튀지 않아야 한다(첫 링 안에서 찾아야 함)
    const dist = Math.hypot(result!.x - 500, result!.y - 500);
    expect(dist).toBeLessThan((W + POST_IT_GAP) * 2);
  });

  it("여러 포스트잇 사이에서도 충돌하지 않는 좌표를 반환한다", () => {
    const obstacles = [rectAt(500, 500), rectAt(500 + W + POST_IT_GAP, 500), rectAt(500, 500 + H + POST_IT_GAP)];
    const result = findFreePosition({ x: 500, y: 500 }, W, H, obstacles);
    expect(result).not.toBeNull();
    expect(hasCollision({ x: result!.x, y: result!.y, width: W, height: H }, obstacles)).toBe(false);
  });

  it("최대 탐색 범위 안에 빈 위치가 없으면 null을 반환한다", () => {
    // desired 주변을 촘촘한 격자로 완전히 채워서 탐색 범위 안에 빈틈이 없게 만든다.
    const obstacles = [];
    const step = W + POST_IT_GAP;
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        obstacles.push(rectAt(500 + i * step, 500 + j * step));
      }
    }
    const result = findFreePosition({ x: 500, y: 500 }, W, H, obstacles, { maxRings: 2 });
    expect(result).toBeNull();
  });

  it("같은 입력에 대해 항상 같은 결과를 반환한다(결정적)", () => {
    const obstacles = [rectAt(500, 500), rectAt(700, 500)];
    const first = findFreePosition({ x: 500, y: 500 }, W, H, obstacles);
    const second = findFreePosition({ x: 500, y: 500 }, W, H, obstacles);
    expect(first).toEqual(second);
  });
});
