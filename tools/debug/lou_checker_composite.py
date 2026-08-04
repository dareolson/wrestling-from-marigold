#!/usr/bin/env python3
"""Build genuine Lou-over-checkerboard closeups from present/absent matte pairs.

For each raw/<name>_present.png + raw/<name>_absent.png, a pixel that is
(near-)identical between the two frames is BACKGROUND (ring/crowd) or a
transparent joint gap; a pixel that differs is Lou. Background pixels are
replaced by a magenta/teal checkerboard; Lou pixels are kept. A real seam gap
between two parts therefore renders as checker showing through.

    python3 tools/debug/lou_checker_composite.py
"""
import os
import glob
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, "Sprite sheets/AI Pilot/Lou/v2-layer-standardization/runtime-conformed/evidence/checker-final")
RAW = os.path.join(OUT, "raw")

DIFF_THRESH = 32   # per-channel delta below which a pixel counts as background
CELL = 10          # checker cell size in output px
DARK = (150, 0, 150)
LIGHT = (0, 170, 170)


def checker_px(x, y):
    return DARK if ((x // CELL) + (y // CELL)) % 2 == 0 else LIGHT


def composite(present_path, absent_path, out_path):
    a = Image.open(present_path).convert("RGB")
    b = Image.open(absent_path).convert("RGB")
    if a.size != b.size:
        b = b.resize(a.size)
    ap, bp = a.load(), b.load()
    w, h = a.size
    out = Image.new("RGB", (w, h))
    op = out.load()
    lou = 0
    for y in range(h):
        for x in range(w):
            r1, g1, b1 = ap[x, y]
            r2, g2, b2 = bp[x, y]
            if abs(r1 - r2) <= DIFF_THRESH and abs(g1 - g2) <= DIFF_THRESH and abs(b1 - b2) <= DIFF_THRESH:
                op[x, y] = checker_px(x, y)     # background / gap
            else:
                op[x, y] = (r1, g1, b1)          # Lou
                lou += 1
    # upscale 3x nearest for inspection
    out = out.resize((w * 3, h * 3), Image.NEAREST)
    out.save(out_path)
    return lou / (w * h)


def main():
    pairs = sorted(glob.glob(os.path.join(RAW, "*_present.png")))
    if not pairs:
        print("no matte pairs in", RAW)
        return
    for p in pairs:
        name = os.path.basename(p)[:-len("_present.png")]
        absent = os.path.join(RAW, name + "_absent.png")
        if not os.path.exists(absent):
            print("  skip", name, "(no absent)")
            continue
        frac = composite(p, absent, os.path.join(OUT, name + ".png"))
        print(f"  {name}.png  lou-fill {frac*100:5.1f}%")


if __name__ == "__main__":
    main()
