"""
EXPERIMENTAL ONLY — handwriting PoC.
Fixed sample-sheet layout in canonical (perspective-corrected) pixel coordinates.
Must stay in sync with src/lib/handwriting/sheetLayout.ts on the Next.js side —
that file renders the print sheet using the same fractions of the same aspect ratio,
so the corner markers detected here always line up with the printed grid regardless
of actual print/scan resolution.
"""

CANVAS_W = 1200
CANVAS_H = 1697  # A4 portrait ratio (1 : 1.414)

MARKER_SIZE = 50
MARKERS = {
    "tl": (100, 100),
    "tr": (1100, 100),
    "bl": (100, 1597),
    "br": (1100, 1597),
}

GRID_LEFT = 100
GRID_TOP = 280
GRID_CELL_W = 235
GRID_CELL_H = 90
GRID_COL_GAP = 20
GRID_ROW_GAP = 17
GRID_COLS = 4
GRID_ROWS = 12


def cell_rect(index: int) -> tuple[int, int, int, int]:
    """Returns (x0, y0, x1, y1) for the index-th cell (row-major, 0-based)."""
    row, col = divmod(index, GRID_COLS)
    x0 = GRID_LEFT + col * (GRID_CELL_W + GRID_COL_GAP)
    y0 = GRID_TOP + row * (GRID_CELL_H + GRID_ROW_GAP)
    return x0, y0, x0 + GRID_CELL_W, y0 + GRID_CELL_H
