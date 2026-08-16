"""
EXPERIMENTAL ONLY — Hybrid handwriting comparison PoC.

Rasterizes REFERENCE_CHARS with a fixed "읽기 좋은 기본 손글씨" font into the same
128x128 black-ink-on-white format the DM-Font checkpoint expects, so those glyphs can
be run through the same component encoder as user photos for latent-level style
blending (see generator.py: preload_base_font / set_hybrid_ratio).

Font choice: Gaegu (Google Fonts, SIL OFL 1.1 — free incl. commercial use), full
Hangul coverage, rounded/legible, not overly decorative. Downloaded at Docker build
time (see Dockerfile ARG BASE_FONT_URL) — never committed to git, matching the same
pattern already used for the DM-Font checkpoint.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = Path(__file__).resolve().parent.parent / "fonts" / "Gaegu-Regular.ttf"
REFERENCE_CHARS_PATH = Path(__file__).resolve().parent.parent / "reference_chars.json"
CANVAS = 128
MARGIN_RATIO = 0.18  # cellcrop.py normalize_glyph uses a ~20% ink margin; matched here for scale consistency

_cache: "dict[str, np.ndarray] | None" = None


class BaseFontUnavailableError(Exception):
    """Raised when the base font file wasn't downloaded (e.g. local dev without it)."""


def render_reference_glyphs() -> "dict[str, np.ndarray]":
    """Returns {char: 128x128 uint8 ndarray}, one per REFERENCE_CHARS entry, cached
    after the first call (the font file and character list never change at runtime)."""
    global _cache
    if _cache is not None:
        return _cache
    if not FONT_PATH.exists():
        raise BaseFontUnavailableError(f"기본 폰트 파일이 없습니다: {FONT_PATH}")

    chars: list[str] = json.loads(REFERENCE_CHARS_PATH.read_text(encoding="utf-8"))
    font_size = int(CANVAS * (1 - MARGIN_RATIO * 2))
    font = ImageFont.truetype(str(FONT_PATH), font_size)

    out: "dict[str, np.ndarray]" = {}
    for ch in chars:
        img = Image.new("L", (CANVAS, CANVAS), 255)
        draw = ImageDraw.Draw(img)
        bbox = draw.textbbox((0, 0), ch, font=font)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x = (CANVAS - w) / 2 - bbox[0]
        y = (CANVAS - h) / 2 - bbox[1]
        draw.text((x, y), ch, font=font, fill=0)
        out[ch] = np.array(img)

    _cache = out
    return out
