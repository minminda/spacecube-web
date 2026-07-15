/* ── 방명록 캔버스 초기 viewport 계산 ──────────────────────────
   특정 좌표를 저장해두고 복귀하는 방식(예전 "정중앙 시작 → 자동 줌아웃") 대신,
   이번 세션에 실제로 존재하는 질문 군집/포스트잇 좌표만 보고 매번 다시 계산한다.
   순수 함수 — DOM/캔버스 라이브러리와 무관해 유닛 테스트로 검증 가능하다. ──────────── */

export interface ViewportPoint {
  x: number;
  y: number;
}

export interface InitialViewport {
  /** 월드 좌표 기준 중심점 */
  cx: number;
  cy: number;
  /** 이 영역(정사각형 한 변 길이, 월드 px)이 화면에 담기도록 배율을 정한다 */
  span: number;
}

const CELL = 900; // 밀집도 판정 격자 한 칸 크기(월드 px)
const MIN_SPAN = 900; // 콘텐츠가 아주 좁게 몰려 있어도 지나치게 확대되지 않도록 하는 최소 영역
const PADDING = 700; // 대표 영역 바깥 여백

function cellKey(p: ViewportPoint): { i: number; j: number } {
  return { i: Math.floor(p.x / CELL), j: Math.floor(p.y / CELL) };
}

/**
 * 질문 군집 라벨 좌표 + 포스트잇 좌표를 함께 받아, 콘텐츠가 가장 몰려 있는 대표 영역의
 * 중심과 필요한 화면 크기(span)를 계산한다. 콘텐츠가 넓게 퍼져 있어도 전체를 억지로
 * 한 화면에 우겨넣지 않고, 밀집도가 가장 높은 3x3 이웃 격자만을 대표 영역으로 삼는다.
 * points가 비어 있으면 fallback 좌표를 그대로 쓴다(신규 공간 등 데이터가 아예 없는 경우).
 */
export function computeInitialViewport(points: ViewportPoint[], fallback: ViewportPoint): InitialViewport {
  if (points.length === 0) {
    return { cx: fallback.x, cy: fallback.y, span: MIN_SPAN + PADDING };
  }
  if (points.length === 1) {
    return { cx: points[0].x, cy: points[0].y, span: MIN_SPAN + PADDING };
  }

  const counts = new Map<string, number>();
  for (const p of points) {
    const { i, j } = cellKey(p);
    const key = `${i}:${j}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // 3x3 이웃 합산 점수로 가장 밀집된 중심 셀을 찾는다 — 격자 경계 때문에 밀집도가
  // 과소평가되는 걸 완화한다.
  let bestKey = "";
  let bestScore = -1;
  for (const key of counts.keys()) {
    const [ci, cj] = key.split(":").map(Number);
    let score = 0;
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        score += counts.get(`${ci + di}:${cj + dj}`) ?? 0;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  const [bi, bj] = bestKey.split(":").map(Number);
  const target = points.filter((p) => {
    const { i, j } = cellKey(p);
    return Math.abs(i - bi) <= 1 && Math.abs(j - bj) <= 1;
  });

  const xs = target.map((p) => p.x);
  const ys = target.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    span: Math.max(maxX - minX, maxY - minY, MIN_SPAN) + PADDING,
  };
}
