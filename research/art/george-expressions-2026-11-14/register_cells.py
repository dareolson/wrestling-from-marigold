# Cut the three 3x3 George expression atlases into 27 heads registered to the production head.png canvas
# (279x319, same headScale/anchor), so a cell can replace the head texture in game with no other change.
# Per cell: keep the largest opaque blob (drops the generated debris under the neck), then a scale + offset
# search that best overlaps the cell's skin with the production head's skin (hair is ignored: it changes with wear).
#   python3 research/art/george-expressions-2026-11-14/register_cells.py [rigId artDir namePrefix]
# Another wrestler: e.g. `guido-roster-v1 research/art/guido-expressions-<date> guido` reads <prefix>-expression-atlas-v1.png,
# <prefix>-pain-atlas-v1.png, <prefix>-smug-atlas-v1.png, <prefix>-rest-disheveled-v1.png, <prefix>-rest-battered-v1.png from artDir.
import json, os, sys
import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../..'))
RIG, ART, NAME = sys.argv[1:4] if len(sys.argv) >= 4 else ('george-roster-v1', 'research/art/george-expressions-2026-11-14', 'george')
HERE = os.path.join(ROOT, ART)
BASE = os.path.join(ROOT, f'src/assets/wrestlers/{RIG}/head.png')
OUT = os.path.join(ROOT, f'src/assets/wrestlers/{RIG}/expressions-trial')
REST = {'rest_1': f'{NAME}-rest-disheveled-v1.png', 'rest_2': f'{NAME}-rest-battered-v1.png'}
V = sys.argv[4] if len(sys.argv) >= 5 else ('v2' if NAME == 'george' else 'v1')   # atlas version; George's v2 rows are drawn from his resting heads
ATLASES = {'talk': f'{NAME}-expression-atlas-{V}.png', 'pain': f'{NAME}-pain-atlas-{V}.png', 'smug': f'{NAME}-smug-atlas-{V}.png'}


def load(path):
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    return im if im.shape[2] == 4 else cv2.cvtColor(im, cv2.COLOR_BGR2BGRA)


def skin(im):
    # skin tone: warm, not the saturated yellow hair, opaque
    hsv = cv2.cvtColor(im[:, :, :3], cv2.COLOR_BGR2HSV)
    h, s, v = hsv[:, :, 0].astype(int), hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    m = (im[:, :, 3] > 128) & (h >= 3) & (h <= 17) & (s >= 50) & (s <= 150) & (v >= 150)
    return m.astype(np.uint8)


def main_blob(im):
    a = (im[:, :, 3] > 40).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(a, 8)
    if n <= 1:
        return im
    keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    out = im.copy()
    out[lab != keep, 3] = 0
    return out


def atlas_cells(atlas):
    # the 9 heads by their own pixels, not cut at equal thirds: worn hair pokes past the third lines and was being cut flat.
    # Each opaque piece goes to the grid cell holding its centre; a piece that spans two rows (heads touching) is split at the row line.
    a = (atlas[:, :, 3] > 40).astype(np.uint8)
    H, W = a.shape
    ch, cw = H / 3, W / 3
    n, lab, stats, cent = cv2.connectedComponentsWithStats(a, 8)
    owner = np.full(a.shape, -1, np.int32)
    yy, xx = np.mgrid[0:H, 0:W]
    for i in range(1, n):
        m = lab == i
        x, y, w, h = stats[i, :4]
        if h > 1.3 * ch or w > 1.3 * cw:
            owner[m] = (np.minimum(2, yy[m] // ch) * 3 + np.minimum(2, xx[m] // cw)).astype(np.int32)
        else:
            owner[m] = int(min(2, cent[i][1] // ch) * 3 + min(2, cent[i][0] // cw))
    cells = [[None] * 3 for _ in range(3)]
    for k in range(9):
        m = owner == k
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        cell = atlas[y0:y1, x0:x1].copy()
        cell[~m[y0:y1, x0:x1], 3] = 0
        cells[k // 3][k % 3] = cell
    return cells


def place(cell, scale, dx, dy, W, H):
    M = np.float32([[scale, 0, dx], [0, scale, dy]])
    return cv2.warpAffine(cell, M, (W, H), flags=cv2.INTER_AREA if scale < 1 else cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))


def register(cell, base):
    H, W = base.shape[:2]
    target = skin(base)
    cs = skin(cell)
    # start from bounding boxes of skin, then refine on a grid
    ys, xs = np.nonzero(target); y2, x2 = np.nonzero(cs)
    s0 = (ys.max() - ys.min()) / (y2.max() - y2.min())
    best = (-1, None)
    for scale in s0 * np.linspace(0.88, 1.12, 25):
        cx = xs.mean() - x2.mean() * scale
        cy = ys.mean() - y2.mean() * scale
        for dx in np.arange(cx - 14, cx + 15, 2):
            for dy in np.arange(cy - 14, cy + 15, 2):
                m = place(cs * 255, scale, dx, dy, W, H) > 127
                inter = np.logical_and(m, target).sum(); union = np.logical_or(m, target).sum()
                iou = inter / union
                if iou > best[0]:
                    best = (iou, (scale, dx, dy))
    scale, dx, dy = best[1]
    for ddx in np.arange(dx - 2, dx + 2.01, 0.5):
        for ddy in np.arange(dy - 2, dy + 2.01, 0.5):
            m = place(cs * 255, scale, ddx, ddy, W, H) > 127
            iou = np.logical_and(m, target).sum() / np.logical_or(m, target).sum()
            if iou > best[0]:
                best = (iou, (scale, ddx, ddy))
    return best


def register_to_row(cell, ref, scale, W, H):
    # mouth frames follow the row's closed frame: same scale, offset from the opaque shape above the mouth
    # (hair, ear, eyes), so the head does not pulse or slide while he talks
    cut = int(H * 0.55)
    want = ref[:cut, :, 3] > 127
    best = (-1, None)
    a = cell.copy()
    for dx in np.arange(-W * 0.5, W * 0.5, 2):
        for dy in np.arange(-20, 21, 2):
            m = place(a, scale, dx, dy, W, H)[:cut, :, 3] > 127
            iou = np.logical_and(m, want).sum() / max(1, np.logical_or(m, want).sum())
            if iou > best[0]:
                best = (iou, (dx, dy))
    dx, dy = best[1]
    for ddx in np.arange(dx - 2, dx + 2.01, 0.5):
        for ddy in np.arange(dy - 2, dy + 2.01, 0.5):
            m = place(a, scale, ddx, ddy, W, H)[:cut, :, 3] > 127
            iou = np.logical_and(m, want).sum() / max(1, np.logical_or(m, want).sum())
            if iou > best[0]:
                best = (iou, (ddx, ddy))
    return best


def ink(im):
    g = cv2.cvtColor(im[:, :, :3], cv2.COLOR_BGR2GRAY)
    return ((g < 70) & (im[:, :, 3] > 128)).astype(np.uint8)


def ink_px(out, ref):
    # mean symmetric distance (px, capped at 10) between the two drawings' ink lines: 0 = the lines sit on each other
    a, b = ink(out), ink(ref)
    da = cv2.distanceTransform(1 - a, cv2.DIST_L2, 3); db = cv2.distanceTransform(1 - b, cv2.DIST_L2, 3)
    return float((np.minimum(db[a > 0], 10).mean() + np.minimum(da[b > 0], 10).mean()) / 2)


def refine(cell, ref, scale, dx, dy):
    # the row's closed frame fitted onto its resting head (head.png when clean) by the ink lines: hair, ear, jaw and neck outline
    W, H = ref.shape[1], ref.shape[0]
    dref = np.minimum(cv2.distanceTransform(1 - ink(ref), cv2.DIST_L2, 3), 10)
    def score(sc, x, y):
        out = place(cell, sc, x, y, W, H)
        m = ink(out) > 0
        return float(dref[m].mean()) if m.any() else 99
    best = (score(scale, dx, dy), scale, dx, dy)
    for step_s, step_xy, span in ((0.01, 2, 6), (0.004, 0.5, 2)):
        _, s0, x0, y0 = best
        for sc in s0 * (1 + np.arange(-span, span + 1) * step_s):
            # keep the head's centre fixed while scaling, then search the offset
            cx, cy = x0 + (s0 - sc) * cell.shape[1] / 2, y0 + (s0 - sc) * cell.shape[0] / 2
            for x in np.arange(cx - span * step_xy * 2, cx + span * step_xy * 2 + 0.01, step_xy):
                for y in np.arange(cy - span * step_xy * 2, cy + span * step_xy * 2 + 0.01, step_xy):
                    v = score(sc, x, y)
                    if v < best[0]:
                        best = (v, sc, x, y)
    return best[1:]


def main():
    base = load(BASE)
    H, W = base.shape[:2]
    os.makedirs(OUT, exist_ok=True)
    report = {}
    neck = np.nonzero(base[:, :, 3].max(axis=1) > 40)[0].max() + 1   # the torso covers the neck stub: cut where head.png's neck ends
    def save(name, out, **fit):
        out[neck:, :, 3] = 0
        cv2.imwrite(os.path.join(OUT, name + '.png'), out)
        report[name] = {k: round(float(v), 3) for k, v in fit.items()}
        print(name, report[name])
        return out
    # resting heads for the worn stages (Codex, drawn from head.png itself); the clean stage rests on head.png
    refs = [base]
    for name, file in REST.items():
        cell = main_blob(load(os.path.join(HERE, file)))
        iou, (scale, dx, dy) = register(cell, base)
        scale, dx, dy = refine(cell, base, scale, dx, dy)
        out = place(cell, scale, dx, dy, W, H)
        refs.append(save(name, out, skinIoU=iou, scale=scale, inkPxToHead=ink_px(out, base)))
    for family, file in ATLASES.items():
        cells = atlas_cells(load(os.path.join(HERE, file)))
        for stage in range(3):
            row = None
            for mouth in range(3):
                cell = main_blob(cells[stage][mouth])
                name = f'{family}_{stage}_{mouth}'
                if row is None:
                    iou, (scale, dx, dy) = register(cell, base)
                    raw = ink_px(place(cell, scale, dx, dy, W, H), refs[stage])
                    scale, dx, dy = refine(cell, refs[stage], scale, dx, dy)
                    out = place(cell, scale, dx, dy, W, H)
                    row = out.copy()
                    save(name, out, scale=scale, inkPxSkinFit=raw, inkPxToRest=ink_px(out, refs[stage]))
                else:
                    iou, (dx, dy) = register_to_row(cell, row, scale, W, H)
                    out = place(cell, scale, dx, dy, W, H)
                    save(name, out, scale=scale, rowIoU=iou, inkPxToRest=ink_px(out, refs[stage]))
    with open(os.path.join(OUT, 'registration.json'), 'w') as f:
        json.dump(report, f, indent=1)

if __name__ == '__main__':
    main()
