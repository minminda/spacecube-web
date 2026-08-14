"""
EXPERIMENTAL ONLY — handwriting PoC.
Detects the 4 solid-black corner markers printed on the sample sheet and warps the
photo to the canonical sheet size (sheet_layout.CANVAS_W x CANVAS_H) via a 4-point
perspective transform. This is deliberately simple (marker-based, not general
document-boundary detection) — good enough for a controlled single-sheet PoC photo.
"""
import cv2
import numpy as np

from .sheet_layout import CANVAS_W, CANVAS_H, MARKERS


class SheetNotFoundError(Exception):
    """Raised when the 4 corner markers can't be reliably located."""


def _find_marker_candidates(gray: np.ndarray) -> list[tuple[float, float, float]]:
    """Returns (cx, cy, area) for dark, roughly-square blobs — marker candidates."""
    # Otsu threshold — markers are solid black on white paper, robust to lighting.
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    img_area = gray.shape[0] * gray.shape[1]
    for c in contours:
        area = cv2.contourArea(c)
        # markers should be small relative to the whole sheet but not noise-sized
        if area < img_area * 0.0005 or area > img_area * 0.02:
            continue
        x, y, w, h = cv2.boundingRect(c)
        aspect = w / h if h else 0
        if not (0.6 < aspect < 1.6):
            continue
        # squareness: contour area vs bounding box area
        if area / (w * h) < 0.6:
            continue
        cx, cy = x + w / 2, y + h / 2
        candidates.append((cx, cy, area))
    return candidates


def find_corners(image_bgr: np.ndarray) -> dict[str, tuple[float, float]]:
    """Locates the 4 corner markers by splitting the image into quadrants and picking
    the best square-blob candidate nearest each quadrant's outer corner."""
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    candidates = _find_marker_candidates(gray)
    if len(candidates) < 4:
        raise SheetNotFoundError("코너 마커를 충분히 찾지 못했습니다.")

    quadrant_targets = {
        "tl": (0, 0),
        "tr": (w, 0),
        "bl": (0, h),
        "br": (w, h),
    }
    found = {}
    for name, (tx, ty) in quadrant_targets.items():
        best, best_dist = None, float("inf")
        for cx, cy, _area in candidates:
            # candidate must be in the correct quadrant half
            if name[0] == "t" and cy > h / 2:
                continue
            if name[0] == "b" and cy < h / 2:
                continue
            if name[1] == "l" and cx > w / 2:
                continue
            if name[1] == "r" and cx < w / 2:
                continue
            dist = (cx - tx) ** 2 + (cy - ty) ** 2
            if dist < best_dist:
                best, best_dist = (cx, cy), dist
        if best is None:
            raise SheetNotFoundError(f"{name} 코너 마커를 찾지 못했습니다.")
        found[name] = best
    return found


def warp_to_canonical(image_bgr: np.ndarray) -> np.ndarray:
    """Full pipeline: find markers → perspective-correct to the canonical sheet size."""
    corners = find_corners(image_bgr)
    src = np.float32([corners["tl"], corners["tr"], corners["bl"], corners["br"]])
    dst = np.float32([MARKERS["tl"], MARKERS["tr"], MARKERS["bl"], MARKERS["br"]])
    matrix = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(image_bgr, matrix, (CANVAS_W, CANVAS_H))
