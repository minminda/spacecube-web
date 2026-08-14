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


def normalize_glyph(gray: np.ndarray) -> np.ndarray:
    """Grayscale cell -> tightly-cropped, centered, 128x128 black-ink-on-white glyph.
    Raises EmptyCellError if no ink is found (nothing written in that cell)."""
    # Otsu binarize (ink=white/255 for bbox math, matching prepare_dataset.py's convention)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

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
