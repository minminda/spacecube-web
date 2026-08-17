/* ── 관리자 사진 "실제 잘라내기" ──────────────────────────────────────
   블로그/SNS 업로드 수준의 crop: 관리자가 드래그/확대로 고른 영역을 캔버스로 실제로 잘라
   Cloudinary에 새 이미지로 올리고, 그 결과 URL을 저장한다. Cloudinary의 원본 파일은 그대로
   남아있고(삭제/치환 없음), 새로 잘린 결과만 별도 이미지로 추가된다 — 기존 uploadToCloudinary
   업로드 흐름을 그대로 재사용, 새 이미지 파이프라인을 만들지 않는다.

   방문자 화면은 최종적으로 이 결과 이미지를 그대로 보여줄 뿐이라 CSS crop(object-fit/
   object-position/transform)에 더 이상 의존하지 않는다 — 다만 이 함수를 거치지 않은 예전
   Scene/Space(원본 + 위치·확대 메타데이터만 있는 경우)는 기존 CSS crop 렌더링 경로가 그대로
   남아있어 계속 정상 표시된다(하위 호환, 렌더 코드 변경 없음).
──────────────────────────────────────────────────────────────────── */

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러올 수 없어요."));
    img.src = src;
  });
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * object-fit: cover + object-position + transform: scale 조합으로 화면에 보이던 영역과
 * 동일한 영역을, 원본 이미지의 실제 픽셀 좌표계에서 계산한다 — 순수 함수, DOM/캔버스와
 * 무관해 유닛 테스트로 검증 가능하다.
 *
 * 1) aspectRatio에 맞춰 원본 안에 들어가는 가장 큰 영역(zoom=1 기준)을 구하고
 * 2) zoom만큼 그 영역을 좁히고(확대할수록 실제로 잘라내는 영역은 작아진다)
 * 3) positionX/Y(0~1)를 중심으로 삼되, 원본 경계를 벗어나지 않게 clamp한다.
 */
export function computeCropRect(
  naturalWidth: number,
  naturalHeight: number,
  aspectRatio: number,
  positionX: number,
  positionY: number,
  zoom: number,
): CropRect {
  const imageAspect = naturalWidth / naturalHeight;
  const baseW = imageAspect > aspectRatio ? naturalHeight * aspectRatio : naturalWidth;
  const baseH = imageAspect > aspectRatio ? naturalHeight : naturalWidth / aspectRatio;

  const safeZoom = Math.max(zoom, 1);
  const width = Math.min(naturalWidth, baseW / safeZoom);
  const height = Math.min(naturalHeight, baseH / safeZoom);

  const x = Math.max(0, Math.min(positionX * naturalWidth - width / 2, naturalWidth - width));
  const y = Math.max(0, Math.min(positionY * naturalHeight - height / 2, naturalHeight - height));

  return { x, y, width, height };
}

const DEFAULT_ZOOM = 1;
const DEFAULT_POSITION = 0.5;

export interface ImageCropInput {
  imageUrl: string;
  zoom: number;
  positionX: number;
  positionY: number;
}

/**
 * 관리자가 위치/확대를 조정한 적이 있으면(기본값에서 벗어났으면) 실제로 캔버스에 잘라
 * Cloudinary에 새 이미지로 올리고, 그 결과 URL + 초기화된 zoom/position을 반환한다.
 * 조정한 적이 없으면(zoom=1, 중앙 그대로) 원본을 그대로 반환한다 — 저장할 때마다
 * 불필요하게 다시 자르지 않는다. 이미지 로드 실패·CORS 문제·업로드 실패 등 어떤 이유로든
 * 실제 crop이 안 되면 예외를 던지지 않고 원본 값을 그대로 반환한다(기존 CSS crop 렌더
 * 경로가 안전망 역할을 한다 — 저장 자체가 막히지 않는다).
 */
export async function finalizeImageCrop(image: ImageCropInput, aspectRatioStr: string): Promise<ImageCropInput> {
  const untouched = image.zoom === DEFAULT_ZOOM && image.positionX === DEFAULT_POSITION && image.positionY === DEFAULT_POSITION;
  if (!image.imageUrl || untouched) return image;

  try {
    const [w, h] = aspectRatioStr.split("/").map(Number);
    const aspectRatio = w / h;

    const img = await loadImage(image.imageUrl);
    const rect = computeCropRect(img.naturalWidth, img.naturalHeight, aspectRatio, image.positionX, image.positionY, image.zoom);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) return image;
    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return image;

    const uploadedUrl = await uploadToCloudinary(new File([blob], "cropped.jpg", { type: "image/jpeg" }));
    if (!uploadedUrl) return image;

    return { imageUrl: uploadedUrl, zoom: DEFAULT_ZOOM, positionX: DEFAULT_POSITION, positionY: DEFAULT_POSITION };
  } catch {
    return image;
  }
}
