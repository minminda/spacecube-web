/* ── Scene 다중 이미지 에디토리얼 배치 ─────────────────────────────────
   일반적인 사진 갤러리/그리드가 아니라 "잡지에서 두 장의 사진을 한 장면 안에 함께 배치한
   느낌"을 위한 최소한의 규칙 기반 레이아웃 — 순수 함수라 유닛 테스트로 모든 조합을
   검증할 수 있다. 어떤 이미지도 재크롭/왜곡하지 않는다: 각 이미지는 자신의 실제 비율
   (width/height, 관리자가 ImageCropDialog로 이미 확정한 결과)을 그대로 유지한 채 크기만
   계산된다(object-fit 등으로 다시 자르지 않음).
──────────────────────────────────────────────────────────────────── */

export interface SceneImageMeta {
  imageUrl: string;
  width: number;
  height: number;
}

export interface LayoutImage {
  imageUrl: string;
  renderWidth: number;
  renderHeight: number;
}

export interface LayoutRow {
  images: LayoutImage[];
}

// 기존 Landscape(가로) 사진이 모바일 콘텐츠 폭에서 실제로 보이는 높이 기준 — 이 값을
// square/portrait 표시에도 공유해 Scene을 스크롤할 때 한 사진이 차지하는 세로 높이가
// 방향과 무관하게 크게 달라지지 않게 한다(단일 이미지 렌더링과 동일한 기준값 재사용).
export const REFERENCE_HEIGHT = 220;
// 같은 행 안에서 이미지끼리의 간격 — 붙어 보이지 않을 정도의 작은 여백(6~10px 권장 범위의 중간값).
export const ROW_GAP = 8;
// 서로 다른 행 사이의 간격 — 같은 행 간격보다 조금 크게, Scene 전체 리듬(space-y-5=20px)보다는 작게.
export const ROW_MARGIN_TOP = 12;
// 모바일 콘텐츠 폭 기준값(안전 마진 포함) — 이 프로젝트가 이미 여러 곳에서 써온 "모바일
// 콘텐츠 폭 ≈ 320~336px" 가정과 동일한 기준으로, 2장을 나란히 놓을 때 합산 폭이 이 값을
// 넘지 않도록 공유 높이를 필요하면 줄인다.
const CONTENT_WIDTH = 320;

const LANDSCAPE_RATIO = 1.15;
const PORTRAIT_RATIO = 1 / LANDSCAPE_RATIO;

export type Orientation = "landscape" | "portrait" | "square";

export function classifyOrientation(width: number, height: number): Orientation {
  if (!width || !height) return "square";
  const ratio = width / height;
  if (ratio > LANDSCAPE_RATIO) return "landscape";
  if (ratio < PORTRAIT_RATIO) return "portrait";
  return "square";
}

function sizeSingle(img: SceneImageMeta): LayoutImage {
  const ratio = img.width / img.height;
  return { imageUrl: img.imageUrl, renderWidth: Math.round(REFERENCE_HEIGHT * ratio), renderHeight: REFERENCE_HEIGHT };
}

/**
 * narrow(portrait/square) 이미지 최대 2장을 한 행에 공유 높이로 배치한다. 두 이미지의 실제
 * 비율을 그대로 유지한 채(재크롭 없음), 합산 폭이 CONTENT_WIDTH를 넘지 않는 선에서 가능한
 * REFERENCE_HEIGHT에 가깝게 공유 높이를 정한다 — 좁은 비율(세로가 긴 사진)이 섞이면
 * REFERENCE_HEIGHT보다 낮아질 수 있고, 그럴 일은 드물지만 폭이 남으면 왼쪽 정렬되고
 * 오른쪽은 자연스러운 빈 공간으로 남는다.
 */
function sizeGroup(group: SceneImageMeta[]): LayoutImage[] {
  const ratios = group.map((img) => img.width / img.height);
  const sumRatio = ratios.reduce((a, b) => a + b, 0);
  const gapTotal = ROW_GAP * (group.length - 1);
  const idealHeight = (CONTENT_WIDTH - gapTotal) / sumRatio;
  const height = Math.round(Math.min(REFERENCE_HEIGHT, idealHeight));
  return group.map((img, i) => ({ imageUrl: img.imageUrl, renderWidth: Math.round(height * ratios[i]), renderHeight: height }));
}

/**
 * Scene 이미지 목록을 에디토리얼 행 단위로 묶는다.
 * - landscape는 항상 단독 행(한 행을 단독으로 사용) — 다른 이미지와 억지로 한 행에 넣지 않는다.
 * - 연속된 narrow(portrait/square) 이미지는 최대 2장씩 나란히 묶는다.
 * - 관리자가 정한 순서를 그대로 유지한다.
 */
export function layoutSceneImages(images: SceneImageMeta[]): LayoutRow[] {
  const rows: LayoutRow[] = [];
  let i = 0;
  while (i < images.length) {
    const orientation = classifyOrientation(images[i].width, images[i].height);
    if (orientation === "landscape") {
      rows.push({ images: [sizeSingle(images[i])] });
      i += 1;
      continue;
    }
    const group = [images[i]];
    const next = images[i + 1];
    if (next && classifyOrientation(next.width, next.height) !== "landscape") {
      group.push(next);
    }
    rows.push({ images: group.length === 1 ? [sizeSingle(group[0])] : sizeGroup(group) });
    i += group.length;
  }
  return rows;
}
