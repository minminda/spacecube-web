"""
DM-Font smoke test — renders a few reference glyphs from a system font (stand-in for
real handwriting), runs encode_write/read_decode, and saves an UNSEEN glyph to verify
the model genuinely recombines components rather than copying inputs.
EXPERIMENTAL ONLY — not part of the app.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "dmfont-src"))

import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont
from sconf import Config

from models import MACore
from datasets import kor_decompose as kor

FONT_PATH = "C:/Windows/Fonts/malgun.ttf"
CANVAS = 160
SIZE = 128


def render_glyph(ch: str) -> Image.Image:
    font = ImageFont.truetype(FONT_PATH, CANVAS)
    img = Image.new("L", (CANVAS * 2, CANVAS * 2), 255)
    draw = ImageDraw.Draw(img)
    bbox = draw.textbbox((0, 0), ch, font=font)
    draw.text((-bbox[0], -bbox[1]), ch, font=font, fill=0)
    npimg = 255 - np.array(img)
    ys, xs = npimg.nonzero()[0], npimg.nonzero()[1]
    cropped = 255 - npimg[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = cropped.shape
    side = max(h, w) + 20
    top, left = (side - h) // 2, (side - w) // 2
    canvas = np.full((side, side), 255, dtype=np.uint8)
    canvas[top:top + h, left:left + w] = cropped
    return Image.fromarray(canvas).resize((SIZE, SIZE), Image.BILINEAR)


def to_tensor(img: Image.Image) -> torch.Tensor:
    arr = np.array(img).astype(np.float32) / 255.0
    arr = (arr - 0.5) / 0.5
    return torch.from_numpy(arr).unsqueeze(0)  # [1, 128, 128]


def save_tensor(t: torch.Tensor, path: str):
    arr = (t.squeeze().detach().numpy() * 0.5 + 0.5) * 255.0
    Image.fromarray(arr.clip(0, 255).astype(np.uint8)).save(path)


def main():
    cfg = Config(str(Path(__file__).parent / "dmfont-src/cfgs/kor.yaml"))
    gen = MACore(1, cfg.C, 1, cfg.g_args["comp_enc"], cfg.g_args["dec"], kor.N_COMPONENTS, 3, "kor")
    ckpt = torch.load(str(Path(__file__).parent / "checkpoints/korean-handwriting.pth"), map_location="cpu", weights_only=False)
    gen.load_state_dict(ckpt["generator_ema"], strict=False)
    gen.eval()

    # reference set: "가" (ㄱㅏ-), "노" (ㄴㅗ-), "달" (ㄷㅏㄹ)
    ref_chars = ["가", "노", "달"]
    style_imgs = torch.stack([to_tensor(render_glyph(c)) for c in ref_chars])  # [3,1,128,128]
    style_ids = torch.zeros(len(ref_chars), dtype=torch.long)  # same style/font id (0) for all refs
    comp_ids = torch.tensor([kor.decompose(c) for c in ref_chars], dtype=torch.long)  # [3,3]

    out_dir = Path(__file__).parent / "smoke_out"
    out_dir.mkdir(exist_ok=True)
    for c, img in zip(ref_chars, [render_glyph(c) for c in ref_chars]):
        img.save(out_dir / f"ref_{c}.png")

    with torch.no_grad():
        gen.encode_write(style_ids, comp_ids, style_imgs)

        # UNSEEN target: "놀" = cho of "노"(ㄴ) + jung of "노"(ㅗ) + jong of "달"(ㄹ) — never shown as a whole
        target_char = "놀"
        target_comp = torch.tensor([kor.decompose(target_char)], dtype=torch.long)
        target_style = torch.zeros(1, dtype=torch.long)
        out = gen.read_decode(target_style, target_comp)  # [1,1,128,128]

    save_tensor(out[0], str(out_dir / f"generated_{target_char}.png"))
    print(f"OK — generated unseen char '{target_char}' -> {out_dir / f'generated_{target_char}.png'}")

    # also render the REAL "놀" from the font for side-by-side comparison
    render_glyph(target_char).save(out_dir / f"reference_truth_{target_char}.png")
    print("Reference truth (system font) saved for comparison.")


if __name__ == "__main__":
    main()
