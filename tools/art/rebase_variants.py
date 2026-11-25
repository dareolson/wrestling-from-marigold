"""Re-fit a rig's part variants onto revised base art (ART_REVISION.md).

When Derek re-cuts a base part (new knee/elbow overlap, new trunks), every variant drawn on the OLD
base canvas (grip forearms, chop arms, bent boots...) still lines up with the old drawing. This tool
finds the old-canvas -> new-canvas mapping and resamples each variant through it, so the variant sits
where the same drawing now sits, then reports the moved semantic anchors.

    python3 tools/art/rebase_variants.py <job.json> [--dry]

job.json:
{
  "out": "src/assets/wrestlers/<rig>",            # where rebased variants are written
  "report": "research/art-revisions/<date>-<rig>/rebase.json",
  "parts": {
    "<name>": {
      "old": "<old base png>", "new": "<new base png>",
      "oldPivot": [x, y], "newPivot": [x, y],       # proximal joint, canvas px (optional seed)
      "scale": 1.37,                                # old px -> new px seed (world-per-px ratio), optional
      "splice": {"v": 0.38, "feather": 18},          # optional: rows above v (new canvas) come from the NEW base;
                                                    # or {"oldV": 0.80, ...}: where the variant's repaint starts, old canvas
      "anchors": {"backWaist": [u, v]},              # optional: the base part's own anchors, old canvas fractions
      "variants": [{"src": "<old variant png>", "dst": "<file name in out>", "anchors": {"clutch": [u, v]}}]
    }
  }
}

Splice: a variant usually differs from its base only at the far end (hand, foot). When the revision is
at the joint end (Derek's knee/elbow overlap edits), `splice` keeps the NEW base's joint end and the
variant's own far end, cross-faded over `feather` rows, so a re-fitted grip never brings back the old
elbow cap. Leave it out when the variant repaints the joint end too.

Mapping: similarity (scale, rotation, translation). Seeded from the pivots/scale when given, else from
alpha-mask moments, then refined by a coarse-to-fine search that maximises alpha IoU of the transformed
OLD base against the NEW base. The report gives IoU before/after and every variant's clipped ink, so a
bad fit (the drawings differ, not just the cut) is visible. Nothing here judges looks: Derek does.
"""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


def alpha(im):
    return np.asarray(im.getchannel('A'), dtype=np.float32) / 255.0


def moments(a):
    ys, xs = np.nonzero(a > 0.5)
    return np.array([xs.mean(), ys.mean()]), math.sqrt(len(xs))


def warp(im, size, s, th, t):
    """Image of `im` under new = s*R(th)*old + t, on a canvas of `size`."""
    c, d = math.cos(th), math.sin(th)
    # inverse: old = R(-th)*(new - t)/s
    a, b = c / s, d / s
    coeffs = (a, b, -(a * t[0] + b * t[1]), -b, a, -(-b * t[0] + a * t[1]))
    return im.transform(size, Image.Transform.AFFINE, coeffs, Image.Resampling.BICUBIC)


def iou(old, new_a, s, th, t, down=1):
    size = (new_a.shape[1], new_a.shape[0])
    w = alpha(warp(old, size, s, th, t))
    if down > 1:
        w, n = w[::down, ::down], new_a[::down, ::down]
    else:
        n = new_a
    A, B = w > 0.5, n > 0.5
    return float((A & B).sum() / max(1, (A | B).sum()))


def fit(old, new, seed):
    new_a = alpha(new)
    s, th, t = seed
    best = iou(old, new_a, s, th, t, 2)
    start = iou(old, new_a, s, th, t)
    for step_s, step_t, step_r in [(0.04, 8, 0.03), (0.01, 2, 0.01), (0.0025, 0.5, 0.0025)]:
        improved = True
        while improved:
            improved = False
            for ds, dx, dy, dr in [(step_s, 0, 0, 0), (-step_s, 0, 0, 0), (0, step_t, 0, 0), (0, -step_t, 0, 0),
                                   (0, 0, step_t, 0), (0, 0, -step_t, 0), (0, 0, 0, step_r), (0, 0, 0, -step_r)]:
                cand = (s * (1 + ds), th + dr, (t[0] + dx, t[1] + dy))
                v = iou(old, new_a, *cand, 2)
                if v > best + 1e-5:
                    best, (s, th, t), improved = v, cand, True
    return (s, th, t), start, iou(old, new_a, s, th, t)


def seed_for(part, old, new):
    oa, na = alpha(old), alpha(new)
    (oc, osz), (nc, nsz) = moments(oa), moments(na)
    s = part.get('scale') or nsz / osz
    if part.get('oldPivot') and part.get('newPivot'):
        op, np_ = np.array(part['oldPivot'], float), np.array(part['newPivot'], float)
        return s, 0.0, tuple(np_ - s * op)
    return s, 0.0, tuple(nc - s * oc)


def main():
    job = json.loads(Path(sys.argv[1]).read_text())
    dry = '--dry' in sys.argv
    out = Path(job['out']) if job['out'].startswith('/') else ROOT / job['out']
    report = {}
    for name, part in job['parts'].items():
        old = Image.open(ROOT / part['old']).convert('RGBA')
        new = Image.open(ROOT / part['new']).convert('RGBA')
        (s, th, t), before, after = fit(old, new, seed_for(part, old, new))
        c, d = math.cos(th), math.sin(th)
        mapf = lambda x, y: (s * (c * x - d * y) + t[0], s * (d * x + c * y) + t[1])
        rec = {'scale': s, 'rotationDeg': math.degrees(th), 'translate': list(t),
               'baseIoUSeed': round(before, 4), 'baseIoUFit': round(after, 4),
               'oldCanvas': list(old.size), 'newCanvas': list(new.size), 'variants': {},
               # the base part's own semantic anchors (backWaist, heel, toe...), carried to the new canvas
               'anchors': {an: dict(zip('uv', (lambda x, y: (x / new.size[0], y / new.size[1]))(*mapf(u * old.size[0], vv * old.size[1]))))
                           for an, (u, vv) in (part.get('anchors') or {}).items()}}
        for v in part.get('variants', []):
            src = Image.open(ROOT / v['src']).convert('RGBA')
            if src.size != old.size:
                raise SystemExit(f"{v['src']}: canvas {src.size} is not the old base canvas {old.size}; "
                                 'only same-canvas variants inherit base geometry')
            res = warp(src, new.size, s, th, t)
            # ink that falls outside the new canvas is lost: count it on a canvas big enough to hold it
            pad = 400
            big = warp(src, (new.size[0] + 2 * pad, new.size[1] + 2 * pad), s, th, (t[0] + pad, t[1] + pad))
            lost = int((alpha(big) > 0.5).sum() - (alpha(res) > 0.5).sum())
            anchors = {}
            for an, (u, vv) in (v.get('anchors') or {}).items():
                x, y = mapf(u * old.size[0], vv * old.size[1])
                anchors[an] = {'u': x / new.size[0], 'v': y / new.size[1]}
            sp = v.get('splice', part.get('splice'))
            if sp:
                # `v`: new-canvas fraction; `oldV`: old-canvas fraction (where the variant's repaint starts), mapped
                y0 = sp['v'] * new.size[1] if 'v' in sp else mapf(old.size[0] / 2, sp['oldV'] * old.size[1])[1] - sp['feather']
                rows = np.arange(new.size[1], dtype=np.float32)
                m = np.clip((rows - (y0 - sp['feather'])) / (2 * sp['feather']), 0, 1)[:, None, None]
                nb = np.asarray(new, dtype=np.float32); vv_ = np.asarray(res, dtype=np.float32)
                pa, pb = nb[..., 3:] / 255, vv_[..., 3:] / 255
                a = pa * (1 - m) + pb * m
                rgb = (nb[..., :3] * pa * (1 - m) + vv_[..., :3] * pb * m) / np.maximum(a, 1e-6)
                res = Image.fromarray(np.dstack([rgb, a * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
            if not dry:
                res.save(out / v['dst'])
            rec['variants'][v['dst']] = {'src': v['src'], 'lostInkPx': lost, 'anchors': anchors}
        report[name] = rec
        print(f"{name}: IoU {before:.3f} -> {after:.3f}  scale {s:.4f} rot {math.degrees(th):+.2f}deg  "
              + ', '.join(f"{k} lost {r['lostInkPx']}px" for k, r in rec['variants'].items()))
    if job.get('report'):
        rp = ROOT / job['report']
        rp.parent.mkdir(parents=True, exist_ok=True)
        rp.write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
