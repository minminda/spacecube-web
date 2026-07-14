/* ── 방명록 포스트잇 충돌 판정 ──────────────────────────────────
   캔버스 좌표(줌 배율과 무관) 기준의 순수 함수만 모아둔다. 클라이언트(클릭 위치 미리보기)와
   서버(/api/guestbook 저장 검증) 양쪽에서 동일하게 재사용해 판정 기준이 갈라지지 않게 한다.
──────────────────────────────────────────────────────────── */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

// 포스트잇 고정 크기 — 콘텐츠/사진 유무와 무관하게 고정 풋프린트로 충돌을 계산한다(NOTE_W와 동일한 값).
export const POST_IT_WIDTH = 170;
export const POST_IT_HEIGHT = 190;
export const POST_IT_GAP = 20; // 포스트잇끼리 완전히 붙어 보이지 않기 위한 최소 여백(canvas px)

// 군집 라벨(자유/질문1/질문2) — 텍스트 중심 좌표를 감싸는 고정 오브젝트 영역
export const CLUSTER_LABEL_WIDTH = 220;
export const CLUSTER_LABEL_HEIGHT = 90;

/**
 * 두 사각형이 겹치는지 판정한다. 중심 좌표가 아니라 실제 영역(top-left + width/height) 기준이며,
 * gap만큼 떨어져 있으면 겹치지 않는 것으로 본다.
 */
export function rectsOverlap(a: Rect, b: Rect, gap: number = POST_IT_GAP): boolean {
  const noOverlap =
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y;
  return !noOverlap;
}

export function hasCollision(rect: Rect, obstacles: Rect[], gap: number = POST_IT_GAP): boolean {
  return obstacles.some((o) => rectsOverlap(rect, o, gap));
}

/** 군집 라벨의 중심 좌표를 고정 오브젝트 사각형으로 변환 — 포스트잇이 라벨 위에 겹쳐 놓이지 않게 한다. */
export function clusterLabelRect(center: Point): Rect {
  return {
    x: center.x - CLUSTER_LABEL_WIDTH / 2,
    y: center.y - CLUSTER_LABEL_HEIGHT / 2,
    width: CLUSTER_LABEL_WIDTH,
    height: CLUSTER_LABEL_HEIGHT,
  };
}

/** 중심(0,0)에서 바깥으로 ring번째 사각 링을 이루는 격자 오프셋들(정렬 없음). */
function ringOffsets(ring: number): { i: number; j: number }[] {
  const pts: { i: number; j: number }[] = [];
  for (let i = -ring; i <= ring; i++) {
    pts.push({ i, j: -ring });
    pts.push({ i, j: ring });
  }
  for (let j = -ring + 1; j <= ring - 1; j++) {
    pts.push({ i: -ring, j });
    pts.push({ i: ring, j });
  }
  return pts;
}

export interface FindFreePositionOptions {
  /** 링 사이 이동 간격(canvas px). 기본값은 포스트잇 폭 + 최소 여백. */
  step?: number;
  /** 최대 탐색 링 수 — 이 범위 안에서 빈 자리를 못 찾으면 실패(null). */
  maxRings?: number;
  gap?: number;
}

/**
 * 원하는 위치가 비어 있으면 그대로 반환하고, 다른 사각형과 겹치면 사각 링 순으로 바깥쪽을
 * 탐색해 충돌하지 않는 가장 가까운 위치를 반환한다. 최대 탐색 범위 안에서 못 찾으면 null.
 * 순수하게 canvas 좌표만 다루므로 화면 줌 배율과 무관하게 항상 같은 결과를 낸다.
 */
export function findFreePosition(
  desired: Point,
  width: number,
  height: number,
  obstacles: Rect[],
  options: FindFreePositionOptions = {},
): Point | null {
  const step = options.step ?? width + POST_IT_GAP;
  const maxRings = options.maxRings ?? 10;
  const gap = options.gap ?? POST_IT_GAP;

  const fits = (p: Point) => !hasCollision({ x: p.x, y: p.y, width, height }, obstacles, gap);

  if (fits(desired)) return desired;

  for (let ring = 1; ring <= maxRings; ring++) {
    const candidates = ringOffsets(ring)
      .map(({ i, j }) => ({ x: desired.x + i * step, y: desired.y + j * step }))
      .sort((a, b) => {
        const da = (a.x - desired.x) ** 2 + (a.y - desired.y) ** 2;
        const db = (b.x - desired.x) ** 2 + (b.y - desired.y) ** 2;
        return da - db;
      });
    for (const c of candidates) {
      if (fits(c)) return c;
    }
  }
  return null;
}
