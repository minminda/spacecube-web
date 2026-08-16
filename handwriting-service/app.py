"""
EXPERIMENTAL ONLY — handwriting-to-digital-handwriting PoC for 공간큐브.

FastAPI service wrapping a pretrained DM-Font (clovaai/dmfont, MIT) checkpoint to
validate a single question: can a few photographed handwriting samples be used to
generate *unseen* Korean sentences in the same style? See README.md.

Not part of the main app's DB/deploy pipeline, not connected to the real guestbook.
Only ever called server-to-server from Next.js's /api/admin/handwriting/* routes
(never directly by a browser) — see the HANDWRITING_SERVICE_SECRET check below,
which is the actual access boundary (CORS doesn't apply to server-to-server calls).

Local run: uvicorn app:app --port 8000 --reload
Cloud Run: see Dockerfile (CMD binds $PORT, defaults to 8080).
"""
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
import base64
import io

import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel

from model.basefont import BaseFontUnavailableError
from model.generator import UncoveredComponentError, get_generator
from preprocessing.cellcrop import EmptyCellError, crop_cell, is_blurry, normalize_glyph
from preprocessing.perspective import SheetNotFoundError, warp_to_canonical, warp_with_corners
from preprocessing.sheet_layout import GRID_COLS, GRID_ROWS

logger = logging.getLogger("handwriting-poc")
logging.basicConfig(level=logging.INFO)

REFERENCE_CHARS: list[str] = json.loads(
    (Path(__file__).parent / "reference_chars.json").read_text(encoding="utf-8")
)

# Shared secret between the Next.js proxy and this service — set as an env var on
# whichever platform hosts this (Cloud Run: --set-env-vars / --set-secrets). If unset
# (local dev default), auth is skipped entirely so `uvicorn app:app --reload` keeps
# working without extra setup. NEVER log this value.
SERVICE_SECRET = os.environ.get("HANDWRITING_SERVICE_SECRET")


def require_secret(x_handwriting_secret: str | None = Header(default=None)):
    if SERVICE_SECRET and x_handwriting_secret != SERVICE_SECRET:
        raise HTTPException(401, "Unauthorized")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Load the checkpoint into memory *before* accepting traffic — Cloud Run won't
    # route requests to this instance until startup finishes, so this slow part
    # (torch/opencv import + 192MB checkpoint load, ~20-35s cold) is absorbed into
    # "container becoming ready" instead of "first /encode request", which is what
    # was timing out through the Next.js proxy's retry budget.
    t0 = time.time()
    try:
        gen = get_generator()
        logger.info(f"model preloaded in {time.time() - t0:.1f}s")
    except Exception:
        logger.exception("model preload failed — will retry lazily on first /encode call")
        yield
        return

    # Also preload the base-handwriting-font component features (Hybrid comparison
    # PoC) — same reasoning: this is a one-time ~10-15s cost, better paid at startup
    # than on the first /generate call with a hybrid ratio. If the font wasn't baked
    # into the image (e.g. local dev without running the Dockerfile step), hybrid
    # ratios just report unavailable — Original mode is unaffected either way.
    t0 = time.time()
    try:
        gen.preload_base_font()
        logger.info(f"base font preloaded in {time.time() - t0:.1f}s")
    except Exception:
        logger.exception("base font preload failed — hybrid ratios will be unavailable")
    yield


app = FastAPI(title="handwriting-poc (EXPERIMENTAL)", lifespan=lifespan)


def _decode_upload(raw: bytes) -> np.ndarray:
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "이미지를 읽을 수 없습니다. JPG 또는 PNG 파일을 올려주세요.")
    return img


def _gray_to_data_url(gray: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", gray)
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode()


def _bgr_to_data_url(bgr: np.ndarray) -> str:
    ok, buf = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()


def _pil_to_data_url(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def _data_url_to_gray(data_url: str) -> np.ndarray:
    _, b64 = data_url.split(",", 1)
    raw = base64.b64decode(b64)
    img = Image.open(io.BytesIO(raw)).convert("L")
    return np.array(img)


@app.get("/health")
def health():
    # No secret required — lets the hosting platform's own health checks pass freely.
    # Doesn't leak anything sensitive (no glyph data, no auth state).
    base_font_ready = False
    try:
        base_font_ready = get_generator().base_font_ready
    except Exception:
        pass
    return {"status": "ok", "model": "dm-font", "device": "cpu", "hybridReady": base_font_ready}


@app.get("/reference-chars", dependencies=[Depends(require_secret)])
def reference_chars():
    return {"chars": REFERENCE_CHARS, "cols": GRID_COLS, "rows": GRID_ROWS}


@app.post("/preprocess", dependencies=[Depends(require_secret)])
async def preprocess(file: UploadFile = File(...), corners: str | None = Form(default=None)):
    raw = await file.read()
    if len(raw) < 1024:
        raise HTTPException(400, "이미지 파일이 너무 작습니다.")
    image = _decode_upload(raw)
    if min(image.shape[:2]) < 600:
        raise HTTPException(
            400,
            "일부 글자가 선명하지 않습니다. 종이 전체가 화면에 크게 들어오도록 다시 촬영해주세요.",
        )

    if corners:
        # A human already marked the 4 corners on this exact photo (manual fallback
        # UI) — use them directly, skip auto-detection entirely.
        try:
            pts = json.loads(corners)
            corner_arr = np.array([[float(x), float(y)] for x, y in pts], dtype=np.float32)
            if corner_arr.shape != (4, 2):
                raise ValueError
        except Exception:
            raise HTTPException(400, "모서리 좌표 형식이 올바르지 않습니다.")
        canonical = warp_with_corners(image, corner_arr)
    else:
        try:
            canonical = warp_to_canonical(image)
        except SheetNotFoundError:
            # Automatic detection failed (lighting/background made the sheet's edge
            # too ambiguous) — hand the original photo back so the admin can mark
            # the 4 corners by hand instead of just failing outright.
            h, w = image.shape[:2]
            return {
                "needsManualCorners": True,
                "image": _bgr_to_data_url(image),
                "imageWidth": w,
                "imageHeight": h,
            }

    cells = []
    for i, char in enumerate(REFERENCE_CHARS):
        gray = crop_cell(canonical, i)
        try:
            normalized = normalize_glyph(gray)
            cells.append({
                "char": char,
                "image": _gray_to_data_url(normalized),
                "empty": False,
                "blurry": bool(is_blurry(normalized)),
            })
        except EmptyCellError:
            cells.append({"char": char, "image": None, "empty": True, "blurry": False})

    return {"cells": cells}


class EncodeCell(BaseModel):
    char: str
    image: str  # data URL, from /preprocess (admin-reviewed)


class EncodeRequest(BaseModel):
    cells: list[EncodeCell]


@app.post("/encode", dependencies=[Depends(require_secret)])
def encode(req: EncodeRequest):
    if len(req.cells) == 0:
        raise HTTPException(400, "인코딩할 글자가 없습니다.")
    gen = get_generator()
    try:
        images = {c.char: _data_url_to_gray(c.image) for c in req.cells}
        coverage = gen.encode(images)
    except Exception as e:  # noqa: BLE001 — surfaced as a generic "생성 실패" per PoC's error-handling spec
        raise HTTPException(500, f"필체를 생성하지 못했습니다. 다시 시도해주세요. ({e})")
    return {"coverage": coverage}


class GenerateRequest(BaseModel):
    text: str
    # 1.0 = "Original" (100% user photo, DM-Font's normal output) — default, unchanged
    # from before this field existed. Lower values blend in the base handwriting font
    # at the DM-Font component-feature level (see generator.py set_hybrid_ratio) —
    # 0.0 isn't sent by the frontend for actual generation (mode D "Base" renders the
    # font directly, no model call), but is accepted here for completeness/testing.
    user_ratio: float = 1.0


@app.post("/generate", dependencies=[Depends(require_secret)])
def generate(req: GenerateRequest):
    gen = get_generator()
    try:
        gen.set_hybrid_ratio(req.user_ratio)
    except BaseFontUnavailableError:
        raise HTTPException(503, "기본 폰트 특징이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.")
    except RuntimeError:
        raise HTTPException(400, "먼저 필체를 생성해주세요 (/encode).")
    unique_chars = list(dict.fromkeys(req.text))  # de-dup, preserve order

    results = {}
    for ch in unique_chars:
        if ch.isspace():
            results[ch] = {"status": "space"}
            continue
        # non-Hangul-syllable (English/digits/punctuation/emoji) -> fallback to default font
        if not (0xAC00 <= ord(ch) <= 0xD7A3):
            results[ch] = {"status": "fallback", "reason": "지원하지 않는 문자(한글 음절이 아님)"}
            continue
        try:
            img = gen.generate(ch)
            results[ch] = {"status": "generated", "image": _pil_to_data_url(img)}
        except UncoveredComponentError:
            results[ch] = {"status": "fallback", "reason": "샘플에 없는 자모 조합"}
        except Exception as e:  # noqa: BLE001
            results[ch] = {"status": "error", "reason": f"생성 실패: {e}"}

    return {"chars": results}
