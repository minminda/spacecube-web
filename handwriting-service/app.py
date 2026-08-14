"""
EXPERIMENTAL ONLY — handwriting-to-digital-handwriting PoC for 공간큐브.

Local-only FastAPI service. Not deployed, not part of the Vercel app, not connected
to the real guestbook. Wraps a pretrained DM-Font (clovaai/dmfont, MIT) checkpoint to
validate a single question: can a few photographed handwriting samples be used to
generate *unseen* Korean sentences in the same style? See README.md.

Run: uvicorn app:app --port 8000 --reload
(from within handwriting-service/, with venv active)
"""
import base64
import io
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

from model.generator import UncoveredComponentError, get_generator
from preprocessing.cellcrop import EmptyCellError, crop_cell, is_blurry, normalize_glyph
from preprocessing.perspective import SheetNotFoundError, warp_to_canonical
from preprocessing.sheet_layout import GRID_COLS, GRID_ROWS

REFERENCE_CHARS: list[str] = __import__("json").loads(
    (Path(__file__).parent.parent / "src" / "lib" / "handwriting" / "referenceChars.json").read_text(encoding="utf-8")
)

app = FastAPI(title="handwriting-poc (EXPERIMENTAL)")
# Local-only dev tool: Next.js (localhost:3000) calls this directly from a server route.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _decode_upload(raw: bytes) -> np.ndarray:
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "이미지를 읽을 수 없습니다. JPG 또는 PNG 파일을 올려주세요.")
    return img


def _gray_to_data_url(gray: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", gray)
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode()


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
    return {"ok": True}


@app.get("/reference-chars")
def reference_chars():
    return {"chars": REFERENCE_CHARS, "cols": GRID_COLS, "rows": GRID_ROWS}


@app.post("/preprocess")
async def preprocess(file: UploadFile = File(...)):
    raw = await file.read()
    if len(raw) < 1024:
        raise HTTPException(400, "이미지 파일이 너무 작습니다.")
    image = _decode_upload(raw)
    if min(image.shape[:2]) < 600:
        raise HTTPException(
            400,
            "일부 글자가 선명하지 않습니다. 종이 전체가 화면에 크게 들어오도록 다시 촬영해주세요.",
        )

    try:
        canonical = warp_to_canonical(image)
    except SheetNotFoundError:
        raise HTTPException(
            422,
            "작성 영역을 찾지 못했습니다. 네 모서리의 검은 사각형 마커가 전부 보이도록 종이 전체를 다시 촬영해주세요.",
        )

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


@app.post("/encode")
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


@app.post("/generate")
def generate(req: GenerateRequest):
    gen = get_generator()
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
