#!/opt/homebrew/bin/python3
"""Deterministic thigh knee-preserving distal trim for Lou (2026-07-29 rebuild).

The standardized thigh canvas (150x150) paints a long, narrowing "hooked" skin
tail past the anatomical knee (box.h 85 vs bone thighH 49 => the source's ink
keeps going ~36 display-units below the knee). That tail escapes from behind the
shin during the walk and reads as a pink flap (see lou_thigh_protrusion_sweep.mjs).

The PRIOR crop over-trimmed: it cropped to 150x126 (box.h 71.4) but rounded a
20-row cap whose TOP landed at row 106 -- ABOVE the anatomical knee (~row 111).
That masking ate real kneecap anatomy (source width ~44-45px at rows 106-116
became 36-42px) and produced the pinched/hourglass connection.

This rebuild fixes the two failures:
  * It reads the pristine 150x150 standardized SOURCE from the repository
    (Sprite sheets/.../runtime-conformed/parts/thigh.png), not a scratch file.
  * The rounding/masking is HARD-GUARANTEED to begin distal to the anatomical
    knee: capTop (= cropRow - capRows) must be >= the true-knee row, or the tool
    aborts. Every row at and above the knee is passed through byte-identical
    (removal-only, alpha never touched above capTop, palette never repainted).

    /opt/homebrew/bin/python3 tools/debug/lou_thigh_knee_crop.py <cropRow> <capRows>

cropRow: new canvas height (rows 0..cropRow-1 kept from the 150-row source).
capRows: number of bottom rows rounded into the knee cap (capTop = cropRow-capRows).

Vertical scale is preserved: new box.h = cropRow * (85/150), so the retained art
is NOT squished -- the hip and the whole knee are byte-identical above capTop and
render at exactly the same display position as the untrimmed source.

Env overrides (default to the repository source in / out of the repo tree):
  WFM_THIGH_ORIG  source PNG  (default: the standardized 150x150 repo source)
  WFM_THIGH_OUT   output PNG basename under src/assets/wrestlers/thesz
                  (default: thigh.png -- the shipped asset)
"""
import sys, os
from PIL import Image
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DEFAULT_ORIG = os.path.join(
    ROOT, 'Sprite sheets', 'AI Pilot', 'Lou', 'v2-layer-standardization',
    'runtime-conformed', 'parts', 'thigh.png')
ORIG = os.environ.get('WFM_THIGH_ORIG', DEFAULT_ORIG)
OUT = os.path.join(ROOT, 'src/assets/wrestlers/thesz',
                   os.environ.get('WFM_THIGH_OUT', 'thigh.png'))

cropRow = int(sys.argv[1]) if len(sys.argv) > 1 else 126
capRows = int(sys.argv[2]) if len(sys.argv) > 2 else 10

ORIG_H, ORIG_BOX_H, THIGHH, HIP_OVERLAP = 150, 85, 49, 14
scale = ORIG_BOX_H / ORIG_H                      # display units per PNG row
# The thigh's canvas row 0 is placed at the RENDER origin, which _attachChild
# pulls up the bone by HIP_OVERLAP from the true skeletal hip so the painted hip
# tucks under the trunks. So along the canvas: row0 = trueHip - HIP_OVERLAP;
# trueKnee = trueHip + thighH = display (HIP_OVERLAP + THIGHH) from row0.
trueKneeRow = ((HIP_OVERLAP + THIGHH) / ORIG_BOX_H) * ORIG_H   # ~111.2
capTop = cropRow - capRows

# HARD GUARANTEE: the rounding must begin distal to (below) the anatomical knee.
# If capTop is at or above the knee the cap would eat real kneecap anatomy (the
# exact defect this rebuild exists to undo), so abort rather than ship a pinch.
if capTop < trueKneeRow:
    sys.exit(f'ABORT: capTop {capTop} is at/above the anatomical knee row '
             f'{trueKneeRow:.1f}. The knee cap must start DISTAL to the knee. '
             f'Reduce capRows or raise cropRow so cropRow-capRows >= {int(trueKneeRow)+1}.')

im = Image.open(ORIG).convert('RGBA')
a = np.array(im)
H, W = a.shape[:2]
assert H == ORIG_H, f'unexpected original height {H}'
alpha = a[:, :, 3]

def row_extent(y):
    xs = np.where(alpha[y] >= 32)[0]
    if len(xs) == 0:
        return None
    return xs.min(), xs.max(), (xs.min() + xs.max()) / 2.0, (xs.max() - xs.min()) / 2.0

out = a[:cropRow].copy()

# Rounded knee cap: an ellipse whose vertical semi-axis = capRows and whose
# horizontal semi-axis = the ink half-width at the top of the cap. Each row
# follows its own ink center so the dome tracks the thigh's lean. Only rows in
# [capTop, cropRow) are touched -- everything above (the hip + the whole knee)
# is byte-identical to the source.
te = row_extent(capTop) or row_extent(capTop - 1)
halfTop = te[3]
removed = 0
for y in range(capTop, cropRow):
    ext = row_extent(y)
    if ext is None:
        continue
    c = ext[2]
    d = (y - capTop) + 0.5
    mult = max(0.0, 1.0 - (d / capRows) ** 2) ** 0.5
    allowed = halfTop * mult
    for x in range(W):
        if out[y, x, 3] < 32:
            continue
        if abs(x - c) > allowed:
            out[y, x, 3] = 0
            removed += 1

Image.fromarray(out, 'RGBA').save(OUT)

newBoxH = round(cropRow * scale, 3)
# bottom-most surviving ink row
lastInk = 0
for y in range(cropRow - 1, -1, -1):
    if (out[y, :, 3] >= 32).any():
        lastInk = y
        break
kneeDisp = HIP_OVERLAP + THIGHH   # display units from row0 to the true knee
print(f'source   {ORIG}')
print(f'out      {OUT}')
print(f'cropRow={cropRow} capRows={capRows} capTop={capTop}  true-knee row ~{trueKneeRow:.1f}')
print(f'  capTop {capTop} is {capTop - trueKneeRow:.1f} rows DISTAL to the knee (must be > 0) OK')
print(f'new canvas {W}x{cropRow}, removed {removed} cap px (rows 0..{capTop-1} byte-identical)')
print(f'>>> thesz.js thigh box.h = {newBoxH}   '
      f'(canvas bottom {cropRow*scale-kneeDisp:.2f} disp past knee; '
      f'last ink row {lastInk} = {lastInk*scale-kneeDisp:.2f} past knee)')
