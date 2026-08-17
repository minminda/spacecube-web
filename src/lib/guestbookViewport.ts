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

const MIN_SPAN = 900; // 콘텐츠가 아주 좁게 몰려 있어도 지나치게 확대되지 않도록 하는 최소 영역
const PADDING = 700; // 대표 영역 바깥 여백

/**
 * 질문 군집 라벨 좌표 + 포스트잇 좌표를 모두 아우르는 bounding box를 계산해, 모든 콘텐츠가
 * 적절한 외곽 여백과 함께 한 화면에 들어오는 중심과 필요한 화면 크기(span)를 반환한다.
 * 일부만 대표로 보여주는 것이 아니라 항상 전체(fit-to-content) 기준이다 — 결과 배율은
 * 호출부(GuestbookCanvas)가 legibility 하한/상한으로 한 번 더 clamp한다.
 * points가 비어 있으면 fallback 좌표를 그대로 쓴다(신규 공간 등 데이터가 아예 없는 경우).
 */
export function computeFitToContentViewport(points: ViewportPoint[], fallback: ViewportPoint): InitialViewport {
  if (points.length === 0) {
    return { cx: fallback.x, cy: fallback.y, span: MIN_SPAN + PADDING };
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
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

/**
 * 포스트잇 중 무게중심(centroid)에 가장 가까운 하나를 "히어로"로 고른다 — 진입 연출의 첫
 * 화면에서 화면 가득 보여줄 대표 흔적. 특정 포스트잇을 고정으로 지정해두는 방식이 아니라
 * 매번 실제 데이터로 계산하므로, 어떤 공간에서도 항상 "그 순간 존재하는 흔적들의 중심"을
 * 자연스럽게 가리킨다.
 */
export function pickHeroPoint<T extends ViewportPoint>(points: T[]): T | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0];

  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  let best = points[0];
  let bestDist = Infinity;
  for (const p of points) {
    const d = (p.x - cx) ** 2 + (p.y - cy) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}
