"""
EXPERIMENTAL ONLY — handwriting PoC.
Finds the printed sample sheet in a photo and warps it to the canonical sheet size
(sheet_layout.CANVAS_W x CANVAS_H) via a 4-point perspective transform.

Originally detected the 4 printed corner markers individually, but that was too
fragile against real handwriting photos — ink strokes, printed cell borders, and
shadows all produce dark blobs similar in size to the markers, so the detector
would latch onto the wrong ones. Detecting the page's own white/bright rectangular
boundary against the (darker) background is the standard, much more robust
"document scanner" approach and doesn't require the markers at all. The markers
stay printed on the sheet as a visual guide for the photographer, but the algorithm
no longer depends on finding them.
"""
import cv2
import numpy as np

from .sheet_layout import CANVAS_W, CANVAS_H


class SheetNotFoundError(Exception):
    """Raised when the printed sheet's boundary can't be reliably located."""


def _order_points(pts: np.ndarray) -> np.ndarray:
    """Sorts 4 arbitrary points into [top-left, top-right, bottom-right, bottom-left]."""
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = pts[:, 1] - pts[:, 0]
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def _find_paper_quad(image_bgr: np.ndarray) -> np.ndarray:
    """Locates the largest bright/white quadrilateral in the photo (the printed sheet)."""
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    # White paper vs. (typically darker) background separates cleanly with Otsu here —
    # unlike the old marker-only threshold, we're segmenting a large uniform region,
    # not trying to isolate small ink-sized blobs.
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise SheetNotFoundError("작성 영역을 찾지 못했습니다.")

    largest = max(contours, key=cv2.contourArea)
    img_area = gray.shape[0] * gray.shape[1]
    if cv2.contourArea(largest) < img_area * 0.1:
        raise SheetNotFoundError("작성 영역을 찾지 못했습니다.")

    peri = cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, 0.02 * peri, True)
    if len(approx) == 4:
        pts = approx.reshape(4, 2).astype(np.float32)
    else:
        # Not a clean quad (rounded corners, slight occlusion, etc.) — fall back to
        # the rotated bounding rectangle of the largest blob, which is more forgiving.
        rect = cv2.minAreaRect(largest)
        pts = cv2.boxPoints(rect).astype(np.float32)

    return _order_points(pts)


def _looks_upside_down(canonical_bgr: np.ndarray) -> bool:
    """Heuristic: the header text band (near the top of the sheet) should have more
    ink than the blank margin mirrored near the bottom. If the reverse is true, the
    sheet was likely photographed upside-down. Bands are sampled away from the
    corner markers (x margins) so the markers themselves don't skew the comparison."""
    gray = cv2.cvtColor(canonical_bgr, cv2.COLOR_BGR2GRAY)
    x0, x1 = 240, 960
    top_band = gray[120:190, x0:x1]
    bottom_band = gray[1630:1690, x0:x1]
    top_ink = 255 - top_band.mean()
    bottom_ink = 255 - bottom_band.mean()
    return bottom_ink > top_ink * 1.5


def warp_with_corners(image_bgr: np.ndarray, corners: np.ndarray) -> np.ndarray:
    """Perspective-warp using 4 explicitly given points (any order — sorted internally).
    Used when a human has manually marked the sheet's corners in the photo."""
    ordered = _order_points(np.asarray(corners, dtype=np.float32))
    dst = np.float32([[0, 0], [CANVAS_W, 0], [CANVAS_W, CANVAS_H], [0, CANVAS_H]])
    matrix = cv2.getPerspectiveTransform(ordered, dst)
    return cv2.warpPerspective(image_bgr, matrix, (CANVAS_W, CANVAS_H))


def warp_to_canonical(image_bgr: np.ndarray) -> np.ndarray:
    """Full automatic pipeline: find the sheet's boundary -> perspective-correct -> fix
    orientation. Raises SheetNotFoundError if the boundary can't be found — callers
    should fall back to asking a human to mark the 4 corners (warp_with_corners)."""
    quad = _find_paper_quad(image_bgr)
    canonical = warp_with_corners(image_bgr, quad)

    if _looks_upside_down(canonical):
        canonical = cv2.rotate(canonical, cv2.ROTATE_180)

    return canonical
