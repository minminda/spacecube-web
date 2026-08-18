/* ── 실제 이미지 잘라내기(진짜 crop) ──────────────────────────────────
   블로그/SNS 업로드 수준의 crop: 관리자가 로컬 파일을 고르면 업로드 전에 crop box(이동/
   리사이즈 가능, 자유 또는 고정 비율)로 원하는 영역을 직접 지정하고, 그 영역만 실제로
   잘라낸 새 File을 만든다 — CSS(object-fit/object-position/transform)로 위치만 가리는
   방식이 아니다. 이 파일은 순수 좌표 계산(유닛 테스트 가능)과 캔버스 처리(브라우저 전용)만
   담당한다 — 업로드(Cloudinary 등 storage)는 호출부가 기존 업로드 함수로 처리한다.
──────────────────────────────────────────────────────────────────── */

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clampRect(rect: PixelRect, boundsW: number, boundsH: number, minSize = 20): PixelRect {
  const width = Math.min(Math.max(rect.width, minSize), boundsW);
  const height = Math.min(Math.max(rect.height, minSize), boundsH);
  const x = Math.min(Math.max(rect.x, 0), boundsW - width);
  const y = Math.min(Math.max(rect.y, 0), boundsH - height);
  return { x, y, width, height };
}

/** crop box 몸체를 드래그해 이동 — 항상 경계 안에 머무른다. */
export function moveRect(rect: PixelRect, dx: number, dy: number, boundsW: number, boundsH: number): PixelRect {
  return clampRect({ ...rect, x: rect.x + dx, y: rect.y + dy }, boundsW, boundsH, Math.min(rect.width, rect.height));
}

export type Corner = "nw" | "ne" | "sw" | "se";

/**
 * 모서리 핸들을 드래그해 크기를 바꾼다 — 반대쪽 모서리는 고정된 채, 잡은 모서리만 포인터를
 * 따라간다. aspect가 주어지면(자유가 아니면) 그 비율을 유지하도록 폭을 기준으로 높이를 다시
 * 계산한다. 항상 경계 안, 최소 크기 이상을 유지한다 — 순수 함수라 유닛 테스트로 모든 모서리·
 * 비율 조합을 검증할 수 있다.
 */
export function resizeRectFromCorner(
  rect: PixelRect,
  corner: Corner,
  dx: number,
  dy: number,
  aspect: number | null,
  boundsW: number,
  boundsH: number,
  minSize = 40,
): PixelRect {
  const left = rect.x;
  const top = rect.y;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  let newLeft = left;
  let newTop = top;
  let newRight = right;
  let newBottom = bottom;

  if (corner === "nw") { newLeft += dx; newTop += dy; }
  else if (corner === "ne") { newRight += dx; newTop += dy; }
  else if (corner === "sw") { newLeft += dx; newBottom += dy; }
  else { newRight += dx; newBottom += dy; }

  // 반대쪽 모서리를 넘어가지 않게(뒤집히지 않게) 최소 크기로 방어
  newLeft = Math.min(newLeft, newRight - minSize);
  newTop = Math.min(newTop, newBottom - minSize);
  newRight = Math.max(newRight, newLeft + minSize);
  newBottom = Math.max(newBottom, newTop + minSize);

  let width = newRight - newLeft;
  let height = newBottom - newTop;

  if (aspect) {
    // 폭을 기준으로 높이를 비율에 맞춰 다시 계산하되, 고정된 모서리(반대쪽)를 기준으로 늘어난다.
    // clampRect는 width/height를 각각 독립적으로 줄이기 때문에(비율이 깨질 수 있음), 여기서
    // 미리 "고정된 모서리 기준으로 경계를 넘지 않는 최대 폭"을 구해 비율을 유지한 채로만
    // 자라게 한다 — 경계에 닿아도 3:2/16:9가 뒤틀리지 않는다.
    const anchorRight = corner === "nw" || corner === "sw"; // 오른쪽 변이 고정
    const anchorBottom = corner === "nw" || corner === "ne"; // 아래쪽 변이 고정
    const fixedX = anchorRight ? newRight : newLeft;
    const fixedY = anchorBottom ? newBottom : newTop;
    const maxWidthByBoundsX = anchorRight ? fixedX : boundsW - fixedX;
    const maxWidthByBoundsY = (anchorBottom ? fixedY : boundsH - fixedY) * aspect;
    const maxWidth = Math.max(minSize, Math.min(maxWidthByBoundsX, maxWidthByBoundsY));

    width = Math.min(Math.max(width, minSize), maxWidth);
    height = width / aspect;
    newLeft = anchorRight ? fixedX - width : fixedX;
    newTop = anchorBottom ? fixedY - height : fixedY;
  }

  const rawRect = { x: newLeft, y: newTop, width, height };
  return clampRect(rawRect, boundsW, boundsH, minSize);
}

/** 주어진 비율(없으면 여유 있는 기본 비율)로 화면 중앙에 놓이는 초기 crop box를 만든다. */
export function centeredRect(displayW: number, displayH: number, aspect: number | null): PixelRect {
  const targetAspect = aspect ?? displayW / displayH;
  let width = displayW * 0.9;
  let height = width / targetAspect;
  if (height > displayH * 0.9) {
    height = displayH * 0.9;
    width = height * targetAspect;
  }
  return clampRect(
    { x: (displayW - width) / 2, y: (displayH - height) / 2, width, height },
    displayW,
    displayH,
  );
}

/** 화면에 표시된 crop box(px) 좌표를 원본 이미지의 실제 픽셀 좌표로 변환한다 — 순수 함수.
 *  Preview가 350×470처럼 작게 보여도 naturalWidth/naturalHeight 기준 원본 해상도로 잘라내기
 *  위한 스케일 변환이다. */
export function scaleRectToNatural(
  rect: PixelRect,
  displayedW: number,
  displayedH: number,
  naturalW: number,
  naturalH: number,
): PixelRect {
  const scaleX = naturalW / displayedW;
  const scaleY = naturalH / displayedH;
  return {
    x: rect.x * scaleX,
    y: rect.y * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러올 수 없어요."));
    img.src = src;
  });
}

/** 원본 이미지에서 naturalRect(원본 픽셀 좌표) 영역만 실제로 잘라 새 File을 만든다. */
export async function cropImageToFile(
  img: HTMLImageElement,
  naturalRect: PixelRect,
  fileName = "cropped.jpg",
  quality = 0.92,
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(naturalRect.width));
  canvas.height = Math.max(1, Math.round(naturalRect.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 사용할 수 없어요.");
  ctx.drawImage(
    img,
    naturalRect.x, naturalRect.y, naturalRect.width, naturalRect.height,
    0, 0, canvas.width, canvas.height,
  );
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 만들 수 없어요."))), "image/jpeg", quality);
  });
  return new File([blob], fileName, { type: "image/jpeg" });
}
