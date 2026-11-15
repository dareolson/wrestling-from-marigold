# Cut the three 3x3 George expression atlases into 27 heads registered to the production head.png canvas
# (279x319, same headScale/anchor), so a cell can replace the head texture in game with no other change.
# Per cell: keep the largest opaque blob (drops the generated debris under the neck), then a scale + offset
# search that best overlaps the cell's skin with the production head's skin (hair is ignored: it changes with wear).
#   python3 research/art/george-expressions-2026-11-14/register_cells.py
import json, os
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
BASE = os.path.join(ROOT, 'src/assets/wrestlers/george-roster-v1/head.png')
OUT = os.path.join(ROOT, 'src/assets/wrestlers/george-roster-v1/expressions-trial')
REST = {'rest_1': 'george-rest-disheveled-v1.png', 'rest_2': 'george-rest-battered-v1.png'}
ATLASES = {'talk': 'george-expression-atlas-v1.png', 'pain': 'george-pain-atlas-v1.png', 'smug': 'george-smug-atlas-v1.png'}


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


def main():
    base = load(BASE)
    H, W = base.shape[:2]
    os.makedirs(OUT, exist_ok=True)
    report = {}
    for family, file in ATLASES.items():
        atlas = load(os.path.join(HERE, file))
        ch, cw = atlas.shape[0] // 3, atlas.shape[1] // 3
        for stage in range(3):
            ref = None
            for mouth in range(3):
                cell = main_blob(atlas[stage * ch:(stage + 1) * ch, mouth * cw:(mouth + 1) * cw])
                if ref is None:
                    iou, (scale, dx, dy) = register(cell, base)
                    out = place(cell, scale, dx, dy, W, H)
                    ref = out.copy()
                else:
                    iou, (dx, dy) = register_to_row(cell, ref, scale, W, H)
                    out = place(cell, scale, dx, dy, W, H)
                # the torso covers the neck stub: cut the neck where the production head's neck ends
                rows = np.nonzero(base[:, :, 3].max(axis=1) > 40)[0]
                out[rows.max() + 1:, :, 3] = 0
                name = f'{family}_{stage}_{mouth}'
                cv2.imwrite(os.path.join(OUT, name + '.png'), out)
                report[name] = {'skinIoU': round(float(iou), 3), 'scale': round(float(scale), 4), 'dx': round(float(dx), 1), 'dy': round(float(dy), 1)}
                print(name, report[name])
    # resting heads for the worn stages (Codex, drawn from head.png itself); the clean stage rests on head.png
    for name, file in REST.items():
        cell = main_blob(load(os.path.join(HERE, file)))
        iou, (scale, dx, dy) = register(cell, base)
        out = place(cell, scale, dx, dy, W, H)
        rows = np.nonzero(base[:, :, 3].max(axis=1) > 40)[0]
        out[rows.max() + 1:, :, 3] = 0
        cv2.imwrite(os.path.join(OUT, name + '.png'), out)
        report[name] = {'skinIoU': round(float(iou), 3), 'scale': round(float(scale), 4), 'dx': round(float(dx), 1), 'dy': round(float(dy), 1)}
        print(name, report[name])
    with open(os.path.join(OUT, 'registration.json'), 'w') as f:
        json.dump(report, f, indent=1)


if __name__ == '__main__':
    main()
