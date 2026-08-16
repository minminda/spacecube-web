"""
EXPERIMENTAL ONLY — handwriting PoC.
Per-cell glyph extraction from the canonical (perspective-corrected) sheet image, and
normalization to the 128x128 black-ink-on-white format DM-Font's pretrained checkpoint
expects (matches the recipe in dmfont-src/scripts/prepare_dataset.py: tight bbox crop,
centered pad to square, resize).
"""
import cv2
import numpy as np

from .sheet_layout import cell_rect

MODEL_INPUT_SIZE = 128
CELL_INNER_MARGIN = 10  # px, avoids picking up the printed guide-box border as "ink"


class EmptyCellError(Exception):
    """Raised when a cell has no ink at all (nothing written)."""


def crop_cell(canonical_bgr: np.ndarray, index: int) -> np.ndarray:
    """Returns the raw (uncropped-to-ink) grayscale image for cell `index`."""
    x0, y0, x1, y1 = cell_rect(index)
    x0, y0 = x0 + CELL_INNER_MARGIN, y0 + CELL_INNER_MARGIN
    x1, y1 = x1 - CELL_INNER_MARGIN, y1 - CELL_INNER_MARGIN
    region = canonical_bgr[y0:y1, x0:x1]
    return cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)


# 인쇄된 안내 글자(연회색, sample sheet의 text-gray-300 ≈ 밝은 회색)가 사진에서
# 실수로 "잉크"로 잡히지 않도록 거는 상한선. 검은 펜 잉크는 대부분 이보다 훨씬 어둡게
# 찍히므로, 손글씨 인식은 그대로 두고 회색 안내 글자만 배경으로 취급하게 만든다.
MAX_INK_THRESHOLD = 140


def normalize_glyph(gray: np.ndarray) -> np.ndarray:
    """Grayscale cell -> tightly-cropped, centered, 128x128 black-ink-on-white glyph.
    Raises EmptyCellError if no ink is found (nothing written in that cell)."""
    # Otsu가 조명에 맞게 적당한 임계값을 고르되, 인쇄된 회색 안내 글자까지 잉크로 잡을 만큼
    # 느슨하게 고르면(임계값이 너무 높으면) MAX_INK_THRESHOLD로 눌러준다. Otsu가 이미 그보다
    # 엄격한(낮은) 값을 골랐다면(대비가 좋은 사진) 그 값을 그대로 쓴다.
    otsu_thresh, _ = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    thresh_value = min(otsu_thresh, MAX_INK_THRESHOLD)
    _, binary = cv2.threshold(gray, thresh_value, 255, cv2.THRESH_BINARY_INV)

    ys, xs = np.nonzero(binary)
    if len(ys) == 0:
        raise EmptyCellError("이 칸에 작성된 글씨가 없습니다.")

    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    ink_crop = 255 - binary[y0:y1 + 1, x0:x1 + 1]  # back to black-ink-on-white

    h, w = ink_crop.shape
    side = max(h, w) + max(h, w) // 5  # 20% margin so strokes don't touch the edge
    top, left = (side - h) // 2, (side - w) // 2
    canvas = np.full((side, side), 255, dtype=np.uint8)
    canvas[top:top + h, left:left + w] = ink_crop

    return cv2.resize(canvas, (MODEL_INPUT_SIZE, MODEL_INPUT_SIZE), interpolation=cv2.INTER_LINEAR)


def is_blurry(gray_glyph: np.ndarray, threshold: float = 30.0) -> bool:
    """Laplacian-variance blur heuristic — flags likely-illegible writing."""
    return cv2.Laplacian(gray_glyph, cv2.CV_64F).var() < threshold
