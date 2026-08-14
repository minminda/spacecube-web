"""EXPERIMENTAL ONLY — quick integration test hitting the running FastAPI service."""
import base64
import json
import sys
from pathlib import Path

import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from smoke_test import render_glyph  # reuse the font-rendering stand-in

BASE = "http://localhost:8000"
ref_chars = json.loads((Path(__file__).parent.parent / "src/lib/handwriting/referenceChars.json").read_text(encoding="utf-8"))


def to_data_url(img: Image.Image) -> str:
    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


cells = [{"char": c, "image": to_data_url(render_glyph(c))} for c in ref_chars]
r = requests.post(f"{BASE}/encode", json={"cells": cells})
print("encode status:", r.status_code)
print("coverage:", r.json())

r = requests.post(f"{BASE}/generate", json={"text": "오늘 이 공간에서 오래 머물렀어요 Hello!"})
print("generate status:", r.status_code)
data = r.json()
for ch, info in data["chars"].items():
    print(repr(ch), info.get("status"), info.get("reason", ""))

out_dir = Path(__file__).parent / "smoke_out"
out_dir.mkdir(exist_ok=True)
for ch, info in data["chars"].items():
    if info.get("status") == "generated":
        _, b64 = info["image"].split(",", 1)
        (out_dir / f"api_{ch}.png").write_bytes(base64.b64decode(b64))
print("saved generated glyphs to smoke_out/api_*.png")
