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

from model.basefont import BaseFontUnavailableError, render_reference_glyphs  # noqa: E402

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

        # ── hybrid blending state (Hybrid comparison PoC) ──
        # Cached raw component-encoder output from the last encode() call, kept around
        # so ratio changes (set_hybrid_ratio) only ever re-blend + re-write memory —
        # never re-run the ~20s component encoder forward pass again. See
        # set_hybrid_ratio() for why this is a real latent-space interpolation and not
        # image compositing: DynamicMemory stores one raw feature tensor per
        # (style_id, component address); writing a single pre-blended tensor there is
        # mathematically identical to what mean-reduction over multiple writes would do.
        self._user_chars: list[str] = []
        self._user_comp_ids: "torch.Tensor | None" = None
        self._user_final: "torch.Tensor | None" = None
        self._user_skip: "torch.Tensor | None" = None
        self._user_written_addrs: set[int] = set()
        self._current_ratio = 1.0

        self._base_final_by_char: dict[str, torch.Tensor] = {}
        self._base_skip_by_char: dict[str, torch.Tensor] = {}
        self._base_ready = False

    # ── style extraction ──────────────────────────────────────────────
    def reset(self):
        self.model.reset_dynamic_memory()
        self._written_addrs.clear()
        self._glyph_cache.clear()
        self._encoded = False

    def encode(self, char_images: dict[str, np.ndarray]) -> dict:
        """char_images: {char: 128x128 uint8 grayscale ndarray, black ink on white}.
        Returns coverage stats (which cho/jung/jong ended up covered). This is the
        original (100% user, "Original" mode) path — unchanged behavior — but also
        caches the raw per-component encoder features so set_hybrid_ratio() can blend
        against them later without a second encoder pass."""
        self.reset()

        chars = list(char_images.keys())
        comp_ids = torch.tensor([kor.decompose(c) for c in chars], dtype=torch.long)
        addrs = comp_id_to_addr(comp_ids.clone(), "kor")
        for row in addrs.tolist():
            self._written_addrs.update(row)

        style_imgs = torch.stack([self._to_tensor(char_images[c]) for c in chars])
        style_ids = torch.zeros(len(chars), dtype=torch.long)

        skip_idx = self.model.component_encoder.skip_layers
        with torch.no_grad():
            feats_all = self.model.component_encoder(style_imgs)
            final = feats_all[-1]
            self.model.memory.write(style_ids, comp_ids, final)
            skip = None
            if hasattr(self.model, "skip_memory") and skip_idx:
                skip = feats_all[skip_idx[0]]
                self.model.skip_memory.write(style_ids, comp_ids, skip)
        self._encoded = True

        # cache for hybrid re-blending
        self._user_chars = chars
        self._user_comp_ids = comp_ids
        self._user_final = final
        self._user_skip = skip
        self._user_written_addrs = set(self._written_addrs)
        self._current_ratio = 1.0

        return self._coverage_stats()

    def _coverage_stats(self) -> dict:
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

    # ── base font preload (once) ────────────────────────────────────────
    def preload_base_font(self):
        """Precompute base-font ("읽기 좋은 기본 손글씨") component features once, so
        every hybrid ratio change afterwards is just a cheap re-blend + memory write —
        no repeat encoder forward pass. Safe to call multiple times; a no-op after the
        first successful run. Raises BaseFontUnavailableError if the font wasn't
        downloaded (e.g. running locally without the Dockerfile's build-time fetch) —
        callers should treat that as "hybrid modes unavailable, Original still works."
        """
        if self._base_ready:
            return
        base_images = render_reference_glyphs()
        chars = list(base_images.keys())
        comp_ids = torch.tensor([kor.decompose(c) for c in chars], dtype=torch.long)
        imgs = torch.stack([self._to_tensor(base_images[c]) for c in chars])

        skip_idx = self.model.component_encoder.skip_layers
        with torch.no_grad():
            feats_all = self.model.component_encoder(imgs)
        final = feats_all[-1]
        skip = feats_all[skip_idx[0]] if skip_idx else None

        for i, c in enumerate(chars):
            self._base_final_by_char[c] = final[i]
            if skip is not None:
                self._base_skip_by_char[c] = skip[i]
        self._base_ready = True

    @property
    def base_font_ready(self) -> bool:
        return self._base_ready

    # ── hybrid blending ──────────────────────────────────────────────────
    def set_hybrid_ratio(self, user_ratio: float) -> dict:
        """Re-writes memory so every subsequent generate() call reflects the given
        user/base blend ratio, WITHOUT re-running the component encoder on the user's
        photos (that's the ~20s step; this is milliseconds). user_ratio=1.0 is
        identical to what encode() alone produces ("Original"); user_ratio=0.0 would
        be pure base-font-through-the-decoder (not used directly — the "Base" mode in
        the UI renders the base font as plain text instead, see SentenceRenderer).

        This is real latent-space interpolation, not image compositing: DM-Font's
        DynamicMemory (models/memory.py) stores one raw feature tensor per
        (style_id, component-address) and the decoder only ever sees what's stored
        there — so writing w*user_feat + (1-w)*base_feat at that address changes the
        decoder's input at the feature level, before any pixels exist.
        """
        if self._user_final is None:
            raise RuntimeError("encode()를 먼저 호출해야 합니다.")

        user_ratio = max(0.0, min(1.0, user_ratio))
        if self._encoded and abs(user_ratio - self._current_ratio) < 1e-6:
            return self._coverage_stats()

        if user_ratio < 0.999 and not self._base_ready:
            raise BaseFontUnavailableError("기본 폰트 특징이 아직 준비되지 않았습니다.")

        self.model.reset_dynamic_memory()
        self._glyph_cache.clear()
        self._written_addrs = set(self._user_written_addrs)

        style_ids = torch.zeros(len(self._user_chars), dtype=torch.long)
        with torch.no_grad():
            if user_ratio >= 0.999:
                blended_final = self._user_final
                blended_skip = self._user_skip
            else:
                base_final = torch.stack([self._base_final_by_char[c] for c in self._user_chars])
                blended_final = user_ratio * self._user_final + (1 - user_ratio) * base_final
                blended_skip = None
                if self._user_skip is not None:
                    base_skip = torch.stack([self._base_skip_by_char[c] for c in self._user_chars])
                    blended_skip = user_ratio * self._user_skip + (1 - user_ratio) * base_skip

            self.model.memory.write(style_ids, self._user_comp_ids, blended_final)
            if blended_skip is not None and hasattr(self.model, "skip_memory"):
                self.model.skip_memory.write(style_ids, self._user_comp_ids, blended_skip)

        self._encoded = True
        self._current_ratio = user_ratio
        return self._coverage_stats()

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
