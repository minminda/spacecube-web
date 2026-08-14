"""
EXPERIMENTAL ONLY — handwriting PoC.
Thin wrapper around the vendored DM-Font (clovaai/dmfont, MIT license, ECCV'20)
generator: loads the pretrained Korean-handwriting checkpoint, writes reference
("style") glyphs into its component memory, and decodes arbitrary unseen Hangul
syllables from that memory (real style-extraction + generation, not copy/paste).

CPU-only — dmfont-src's own scripts hardcode `.cuda()`, so this file re-implements
the encode/decode calls directly against the model instead of reusing
dmfont-src/inference.py.
"""
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import torch
from PIL import Image
from sconf import Config

DMFONT_SRC = Path(__file__).resolve().parent.parent / "dmfont-src"
sys.path.insert(0, str(DMFONT_SRC))

from models import MACore  # noqa: E402
from models.memory import comp_id_to_addr  # noqa: E402
from datasets import kor_decompose as kor  # noqa: E402

CHECKPOINT_PATH = Path(__file__).resolve().parent.parent / "checkpoints" / "korean-handwriting.pth"
STYLE_ID = 0  # single admin-tester -> single style bucket is enough for this PoC


class UncoveredComponentError(Exception):
    """Raised when generation is requested for a char whose cho/jung/jong were never
    written to memory — i.e. no reference glyph covered that component."""


class HandwritingGenerator:
    def __init__(self):
        cfg = Config(str(DMFONT_SRC / "cfgs" / "kor.yaml"))
        self.model = MACore(
            1, cfg.C, 1, cfg.g_args["comp_enc"], cfg.g_args["dec"],
            kor.N_COMPONENTS, 3, "kor",
        )
        ckpt = torch.load(str(CHECKPOINT_PATH), map_location="cpu", weights_only=False)
        self.model.load_state_dict(ckpt["generator_ema"], strict=False)
        self.model.eval()

        self._written_addrs: set[int] = set()
        self._glyph_cache: dict[str, Image.Image] = {}
        self._encoded = False

    # ── style extraction ──────────────────────────────────────────────
    def reset(self):
        self.model.reset_dynamic_memory()
        self._written_addrs.clear()
        self._glyph_cache.clear()
        self._encoded = False

    def encode(self, char_images: dict[str, np.ndarray]) -> dict:
        """char_images: {char: 128x128 uint8 grayscale ndarray, black ink on white}.
        Returns coverage stats (which cho/jung/jong ended up covered)."""
        self.reset()

        chars = list(char_images.keys())
        comp_ids = torch.tensor([kor.decompose(c) for c in chars], dtype=torch.long)
        addrs = comp_id_to_addr(comp_ids.clone(), "kor")
        for row in addrs.tolist():
            self._written_addrs.update(row)

        style_imgs = torch.stack([self._to_tensor(char_images[c]) for c in chars])
        style_ids = torch.zeros(len(chars), dtype=torch.long)

        with torch.no_grad():
            self.model.encode_write(style_ids, comp_ids, style_imgs, reset_dynamic_memory=False)
        self._encoded = True

        cho_covered = sum(1 for i in range(kor.N_CHO) if i in self._written_addrs)
        jung_covered = sum(1 for i in range(kor.N_CHO, kor.N_CHO + kor.N_JUNG) if i in self._written_addrs)
        jong_covered = sum(
            1 for i in range(kor.N_CHO + kor.N_JUNG, kor.N_COMPONENTS) if i in self._written_addrs
        )
        return {
            "cho": {"covered": cho_covered, "total": kor.N_CHO},
            "jung": {"covered": jung_covered, "total": kor.N_JUNG},
            "jong": {"covered": jong_covered, "total": kor.N_JONG},
        }

    def is_covered(self, char: str) -> bool:
        try:
            cho, jung, jong = kor.decompose(char)
        except ValueError:
            return False  # not a Korean syllable at all (non-kor char -> caller falls back to default font)
        addrs = comp_id_to_addr(torch.tensor([[cho, jung, jong]], dtype=torch.long), "kor")[0].tolist()
        return all(a in self._written_addrs for a in addrs)

    # ── generation ─────────────────────────────────────────────────────
    def generate(self, char: str) -> Optional[Image.Image]:
        if char in self._glyph_cache:
            return self._glyph_cache[char]
        if not self._encoded or not self.is_covered(char):
            raise UncoveredComponentError(char)

        comp_ids = torch.tensor([kor.decompose(char)], dtype=torch.long)
        style_ids = torch.zeros(1, dtype=torch.long)
        with torch.no_grad():
            out = self.model.read_decode(style_ids, comp_ids)  # [1,1,128,128], range ~[-1,1]

        arr = (out[0, 0].numpy() * 0.5 + 0.5) * 255.0
        img = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
        self._glyph_cache[char] = img
        return img

    @staticmethod
    def _to_tensor(gray_u8: np.ndarray) -> torch.Tensor:
        arr = gray_u8.astype(np.float32) / 255.0
        arr = (arr - 0.5) / 0.5
        return torch.from_numpy(arr).unsqueeze(0)


_instance: Optional[HandwritingGenerator] = None


def get_generator() -> HandwritingGenerator:
    global _instance
    if _instance is None:
        _instance = HandwritingGenerator()
    return _instance
