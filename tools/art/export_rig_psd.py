"""Write Lou's IN-GAME art back into a layered PSD that Procreate imports (ART_REVISION.md, step 0).

    python3 tools/art/export_rig_psd.py [--out 'Sprite sheets/RosterNew/<date>/Lou-current.psd']

Derek 2026-11-25: "next time I do an update, I should probably take the existing art and start with that instead
of my previous archived art ... I could work with exactly the image we are using."

The PSD has Lou2.psd's canvas (4096x1714) and its first ten layers in the same order and names (ids 0-9), so the
generator's hand landmarks (shoulder, wrist, ankle... in PSD pixels) still hold and the export inventory carries over:
  - body layers = the cleaned layers the generator cuts the game parts from (the exact game pixels, before rotation)
  - Head = the production Procreate head (the one the expressions are drawn on), at its fitted spot (+6,+6 in the cut)
Above them, HIDDEN reference layers named "ref ...": every same-canvas variant the game draws (grip/clasp/chop
forearms, chop upper arms, the far-arm forearm, both ankle twists) and the expression faces, each mapped back from
its part canvas to where that part sits on this canvas. Rotated parts go through one bicubic resample to get here.
Own-canvas art (projected arms: headlock wrap, chop sweeps; sleeper wrap) is not placed: it does not sit on a part.

Writes the PSD, an inventory.json (roles by layer id, as export-roster-psds.py expects; refs are
hidden_full_figure_reference) and verify.json (round-trip through psd-layer-reader.py; base layers re-cut by the
generator's transform vs the game PNGs).
"""
import argparse, importlib.util, json, math, struct
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'Sprite sheets/RosterNew/2026-11-22/Lou2/extracted-v1'
ASSETS = ROOT / 'src/assets/wrestlers/thesz-procreate-v1'
MEAS = json.loads((SRC / 'cleaned-v1/comparison-v1/measurements.json').read_text())
W, H = 4096, 1714
# Production head canvas (197x241) sits at +6,+6 inside the generator's head cut (research/art-revisions/2026-11-24-lou/head-fit.json).
HEAD_AT = (MEAS['parts']['head']['source_crop'][0] + 6, MEAS['parts']['head']['source_crop'][1] + 6)
# Lou2.psd ids 0-9: (name, visible, source png)
BASE = [('Background', False, 'excluded-layers/00-background.png'), ('L Arm', False, 'excluded-layers/01-hidden_full_figure_reference.png'),
        ('Torso', True, 'cleaned-v1/layers-full-canvas/02-torso.png'), ('L Upper Leg', True, 'cleaned-v1/layers-full-canvas/03-left_thigh.png'),
        ('L Lower Leg', True, 'cleaned-v1/layers-full-canvas/04-left_shin.png'), ('R Upper Leg', True, 'cleaned-v1/layers-full-canvas/05-right_thigh.png'),
        ('R Lower Leg', True, 'cleaned-v1/layers-full-canvas/06-right_shin.png'), ('Head', True, None),
        ('R Upper Arm', True, 'cleaned-v1/layers-full-canvas/08-right_upper_arm.png'), ('R Lower Arm', True, 'cleaned-v1/layers-full-canvas/09-right_forearm_hand.png')]
ROLES = ['background', 'hidden_full_figure_reference', 'torso', 'left_thigh', 'left_shin', 'right_thigh', 'right_shin', 'head', 'right_upper_arm', 'right_forearm_hand']
# game part -> generator part record; refs placed on that part
PART_OF = {'forearm': 'forearm', 'upper_arm': 'upper_arm', 'shin': 'shin', 'far_shin': 'far_shin', 'thigh': 'thigh', 'far_thigh': 'far_thigh', 'torso': 'torso'}
ANCH = MEAS['anchorsCanvasPx']
PROX = {'upper_arm': 'nearShoulder', 'forearm': 'elbow', 'thigh': 'nearHip', 'shin': 'knee', 'far_thigh': 'farHip', 'far_shin': 'farKnee'}


def part_to_psd(part):
    """Affine coeffs for PIL (PSD px -> part canvas px), i.e. the generator's forward transform."""
    r = MEAS['parts'][part]
    if part not in PROX:   # crop only
        x0, y0 = r['source_crop'][:2]
        return (1, 0, -x0, 0, 1, -y0)
    a = math.radians(r['rotation_degrees']); c, s = math.cos(a), math.sin(a)
    px, py = ANCH[PROX[part]]
    cx, cy = r['proximal']
    # canvas = R(psd) + T, R = [[c,-s],[s,c]]; T so that the proximal joint lands on its canvas point
    tx, ty = cx - (c * px - s * py), cy - (s * px + c * py)
    return (c, -s, tx, s, c, ty)


def place(img, coeffs):
    """Part-canvas image -> full PSD canvas. PIL's transform wants output(PSD)->input(part) = the forward map."""
    return img.transform((W, H), Image.Transform.AFFINE, coeffs, Image.Resampling.BICUBIC)


def packbits(row):
    out = bytearray(); n = len(row); i = 0
    edges = np.flatnonzero(np.diff(row)) + 1
    starts = np.concatenate(([0], edges)); ends = np.concatenate((edges, [n]))
    lit = bytearray()
    def flush():
        nonlocal lit
        for k in range(0, len(lit), 128):
            ch = lit[k:k + 128]; out.append(len(ch) - 1); out.extend(ch)
        lit = bytearray()
    for a, b in zip(starts.tolist(), ends.tolist()):
        L = b - a
        if L >= 3:
            flush(); v = int(row[a])
            while L > 0:
                m = min(L, 128); out.append(257 - m if m > 1 else 0); out.append(v); L -= m
        else:
            lit.extend(row[a:b].tobytes())
    flush()
    return bytes(out)


def rle_planes(arr):
    """arr: (h, w, ch) uint8 -> (list of per-channel bytes with compression=1 header)"""
    res = []
    for ch in range(arr.shape[2]):
        rows = [packbits(arr[y, :, ch]) for y in range(arr.shape[0])]
        res.append(struct.pack('>H', 1) + struct.pack('>' + 'H' * len(rows), *map(len, rows)) + b''.join(rows))
    return res


def pascal(name):
    b = name.encode('latin1', 'replace')[:255]; s = bytes([len(b)]) + b
    return s + b'\0' * (-len(s) % 4)


def write_psd(path, layers):
    """layers: bottom-to-top list of (name, visible, RGBA full-canvas np array)."""
    recs, data = b'', b''
    for name, visible, a in layers:
        ys, xs = np.nonzero(a[..., 3])
        if len(xs): t, l, btm, r = int(ys.min()), int(xs.min()), int(ys.max()) + 1, int(xs.max()) + 1
        else: t = l = 0; btm = r = 1
        crop = a[t:btm, l:r]
        planes = rle_planes(crop[..., [3, 0, 1, 2]])
        rec = struct.pack('>iiiiH', t, l, btm, r, 4)
        for cid, p in zip((-1, 0, 1, 2), planes): rec += struct.pack('>hI', cid, len(p))
        uni = name.encode('utf-16-be'); luni = struct.pack('>I', len(name)) + uni
        luni += b'\0' * (len(luni) % 2)
        extra = struct.pack('>I', 0) + struct.pack('>I', 0) + pascal(name) + b'8BIMluni' + struct.pack('>I', len(luni)) + luni
        rec += b'8BIMnorm' + bytes([255, 0, 8 if visible else 10, 0]) + struct.pack('>I', len(extra)) + extra
        recs += rec; data += b''.join(planes)
    info = struct.pack('>h', -len(layers)) + recs + data
    info += b'\0' * (len(info) % 2)
    lm = struct.pack('>I', len(info)) + info + struct.pack('>I', 0)
    comp = np.zeros((H, W, 4), np.float32)
    for _, visible, a in layers:
        if not visible: continue
        sa = a[..., 3:4] / 255.0; comp[..., :3] = a[..., :3] * sa + comp[..., :3] * (1 - sa); comp[..., 3:] = sa * 255 + comp[..., 3:] * (1 - sa)
    comp = comp.clip(0, 255).astype(np.uint8)
    # merged image: compression 1, all channels' row counts first, then rows
    rows = [packbits(comp[y, :, ch]) for ch in range(4) for y in range(H)]
    merged = struct.pack('>H', 1) + struct.pack('>' + 'H' * len(rows), *map(len, rows)) + b''.join(rows)
    hdr = b'8BPS' + struct.pack('>H', 1) + b'\0' * 6 + struct.pack('>HIIHH', 4, H, W, 8, 3)
    path.write_bytes(hdr + struct.pack('>I', 0) + struct.pack('>I', 0) + struct.pack('>I', len(lm)) + lm + merged)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default='Sprite sheets/RosterNew/2026-11-25/Lou-current.psd')
    out = ROOT / ap.parse_args().out; out.parent.mkdir(parents=True, exist_ok=True)
    rgba = lambda p: np.array(Image.open(p).convert('RGBA'))
    layers = []
    head = Image.open(ASSETS / 'head.png').convert('RGBA'); full = Image.new('RGBA', (W, H)); full.paste(head, HEAD_AT)
    for name, vis, src in BASE:
        layers.append((name, vis, np.array(full) if src is None else rgba(SRC / src)))
    refs = []
    # same-canvas variants, by size match to their game part
    for part in PART_OF:
        base = ASSETS / f'{part}.png'; size = Image.open(base).size; co = part_to_psd(part)
        for f in sorted(ASSETS.glob(f'{part}_*.png')) + ([ASSETS / 'far_forearm.png'] if part == 'forearm' else []):
            im = Image.open(f).convert('RGBA')
            if im.size != size: continue
            refs.append((f'ref {f.stem.replace("_", " ")}', np.array(place(im, co))))
    for f in sorted((ASSETS / 'expressions-trial').glob('*.png')):
        fm = Image.new('RGBA', (W, H)); fm.paste(Image.open(f).convert('RGBA'), HEAD_AT); refs.append((f'ref face {f.stem}', np.array(fm)))
    layers += [(n, False, a) for n, a in refs]
    write_psd(out, layers)
    inv = {'source': out.name, 'note': 'Written by tools/art/export_rig_psd.py from the in-game art (2026-11-25). Ids 0-9 = Lou2.psd; "ref ..." layers are hidden references.',
           'layers': [{'id': i, 'name': n, 'visible': v, 'visual_role': ROLES[i] if i < len(ROLES) else 'hidden_full_figure_reference'} for i, (n, v, _) in enumerate(layers)]}
    inv_dir = out.parent / out.stem; inv_dir.mkdir(exist_ok=True)
    (inv_dir / 'inventory.json').write_text(json.dumps(inv, indent=1) + '\n')
    # the delivery list export-roster-psds.py checks (sha256 pins this exact file)
    import hashlib
    src_list = out.parent / 'sources.json'
    entries = [e for e in (json.loads(src_list.read_text()) if src_list.exists() else []) if e['file'] != out.name]
    entries.append({'file': out.name, 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(), 'canvas': [W, H], 'layers': len(layers)})
    src_list.write_text(json.dumps(entries, indent=2) + '\n')
    # verify: 1) re-parse; 2) base parts re-cut from the PSD layers by the generator's transform vs the game PNGs
    spec = importlib.util.spec_from_file_location('r', ROOT / 'tools/wrestler-cutter/psd-layer-reader.py'); rd = importlib.util.module_from_spec(spec); spec.loader.exec_module(rd)
    hdr, parsed = rd.parse(out)
    rt = []
    for (name, vis, a), L in zip(layers, parsed):
        got = np.zeros((H, W, 4), np.uint8)
        if L['w'] and L['h']:
            for cid, ch in ((0, 0), (1, 1), (2, 2), (-1, 3)): got[L['top']:L['bottom'], L['left']:L['right'], ch] = np.frombuffer(L['pixels'][cid], np.uint8).reshape(L['h'], L['w'])
        ink = a[..., 3] > 0   # fully transparent pixels carry no colour (outside the layer bounds they are not stored)
        rt.append({'name': L['name'], 'visible': L['visible'], 'exact': bool((got[..., 3] == a[..., 3]).all() and (got[ink] == a[ink]).all()) and L['visible'] == vis and L['name'] == name})
    recut = {}
    srcs = {'torso': 2, 'far_thigh': 3, 'far_shin': 4, 'thigh': 5, 'shin': 6, 'upper_arm': 8, 'forearm': 9}
    for part, i in srcs.items():
        game = Image.open(ASSETS / f'{part}.png').convert('RGBA'); co = part_to_psd(part)
        inv_co = np.linalg.inv(np.array([[co[0], co[1], co[2]], [co[3], co[4], co[5]], [0, 0, 1]]))
        cut = Image.fromarray(layers[i][2]).transform(game.size, Image.Transform.AFFINE, tuple(inv_co[:2].ravel()), Image.Resampling.BICUBIC)
        A, B = np.array(cut)[..., 3] > 128, np.array(game)[..., 3] > 128
        recut[part] = {'alphaIoU': round(float((A & B).sum() / max(1, (A | B).sum())), 4),
                       'meanAbsRGBInInk': round(float(np.abs(np.array(cut, float)[..., :3] - np.array(game, float)[..., :3])[A & B].mean()), 2)}
    hA = np.array(full)[..., 3] > 128; lA = rgba(SRC / 'cleaned-v1/layers-full-canvas/07-head.png')[..., 3] > 128
    report = {'psd': str(out.relative_to(ROOT)), 'header': hdr, 'layers': len(layers), 'roundTripExact': all(r['exact'] for r in rt), 'roundTrip': rt,
              'baseRecutVsGame': recut, 'headVsLou2HeadIoU': round(float((hA & lA).sum() / (hA | lA).sum()), 4), 'bytes': out.stat().st_size}
    (inv_dir / 'verify.json').write_text(json.dumps(report, indent=1) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'roundTrip'}, indent=1))


if __name__ == '__main__':
    main()
