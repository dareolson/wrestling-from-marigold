"""Slice a downloaded sprite sheet into numbered frames for the move editor.

    python3 tools/sprites/slice_sheet.py <sheet image> <sheet id> "<label>"

e.g. python3 tools/sprites/slice_sheet.py "Sprite sheets/44464.png" \\
         wwf-royal-rumble-snes/44464-ric-flair "Ric Flair — WWF Royal Rumble (SNES)"

Writes Sprite sheets/reference/<sheet id>/ (git-ignored, like all sheet art):
  fNNN.png      one per frame, numbered row by row, left to right
  frames.json   each frame's box on the source sheet
  index.png     the source sheet with every frame boxed and numbered
  rows/         one labelled, 2x strip per sheet row, for reading moves
and adds the sheet to Sprite sheets/reference/sheets.json, which the move
editor's reference panel lists.

Rows are split on fully blank horizontal bands and frames on blank columns
within a row (connected components mis-group lying and airborne frames, which
sit at different heights). The background is the sheet's most common corner
colour, so black, magenta or blue sheets all work. Pose reference only:
nothing here ships with the game.
"""

import json
import os
import sys
from collections import Counter

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'Sprite sheets', 'reference')
TOLERANCE = 30      # colour distance from the background that still counts as background
                    # (30 reproduces the Bret Hart sheet's original slicing exactly)
ROW_GAP_MERGE = 6   # blank bands thinner than this stay inside one row
COL_GAP_MERGE = 8   # blank columns thinner than this stay inside one frame
MIN_FRAME = 6       # narrower specks are ignored


def background(im):
    w, h = im.size
    px = im.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    return Counter(corners).most_common(1)[0][0]


def runs(flags, merge):
    out = []
    i = 0
    while i < len(flags):
        if flags[i]:
            start = i
            while i < len(flags) and flags[i]:
                i += 1
            if out and start - out[-1][1] < merge:
                out[-1][1] = i - 1
            else:
                out.append([start, i - 1])
        i += 1
    return out


def main(src, sheet_id, label):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    bg = background(im)
    px = im.load()
    fg = [[sum(abs(a - b) for a, b in zip(px[x, y], bg)) > TOLERANCE for x in range(w)] for y in range(h)]

    out_dir = os.path.join(ROOT, sheet_id)
    os.makedirs(os.path.join(out_dir, 'rows'), exist_ok=True)
    for name in os.listdir(out_dir):
        if name.endswith('.png') and name.startswith('f'):
            os.remove(os.path.join(out_dir, name))

    frames = []
    for row, (y0, y1) in enumerate(runs([any(r) for r in fg], ROW_GAP_MERGE)):
        cols = [any(fg[y][x] for y in range(y0, y1 + 1)) for x in range(w)]
        for x0, x1 in runs(cols, COL_GAP_MERGE):
            if x1 - x0 < MIN_FRAME:
                continue
            ys = [y for y in range(y0, y1 + 1) if any(fg[y][x] for x in range(x0, x1 + 1))]
            frames.append({'id': len(frames), 'row': row, 'box': [x0, ys[0], x1, ys[-1]]})

    for f in frames:
        x0, y0, x1, y1 = f['box']
        crop = im.crop((x0, y0, x1 + 1, y1 + 1)).convert('RGBA')
        # Background to transparent, so the editor overlay shows only the figure.
        cp = crop.load()
        for yy in range(crop.height):
            for xx in range(crop.width):
                r, g, b, _ = cp[xx, yy]
                if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) <= TOLERANCE:
                    cp[xx, yy] = (r, g, b, 0)
        crop.save(os.path.join(out_dir, f"f{f['id']:03d}.png"))
    with open(os.path.join(out_dir, 'frames.json'), 'w') as fh:
        json.dump({'source': os.path.basename(src), 'label': label, 'background': bg, 'frames': frames}, fh)

    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 20)
    except OSError:
        font = None
    index = im.copy()
    draw = ImageDraw.Draw(index)
    for f in frames:
        draw.rectangle(f['box'], outline=(60, 160, 255))
        draw.text((f['box'][0], max(0, f['box'][1] - 12)), str(f['id']), fill=(255, 255, 0))
    index.save(os.path.join(out_dir, 'index.png'))

    rows = {}
    for f in frames:
        rows.setdefault(f['row'], []).append(f)
    for row, members in rows.items():
        tiles = [Image.open(os.path.join(out_dir, f"f{f['id']:03d}.png")) for f in members]
        height = max(t.height for t in tiles) * 2 + 26
        width = sum(max(t.width * 2, 44) + 6 for t in tiles)
        strip = Image.new('RGB', (width, height), (30, 30, 30))
        d = ImageDraw.Draw(strip)
        x = 0
        for f, t in zip(members, tiles):
            big = t.resize((t.width * 2, t.height * 2), Image.NEAREST)
            strip.paste(big, (x, height - big.height), big)
            d.text((x + 2, 2), str(f['id']), fill=(255, 255, 0), font=font)
            x += max(t.width * 2, 44) + 6
        strip.save(os.path.join(out_dir, 'rows', f'row{row:02d}.png'))

    manifest_path = os.path.join(ROOT, 'sheets.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else []
    manifest = [entry for entry in manifest if entry['id'] != sheet_id]
    manifest.append({'id': sheet_id, 'label': label, 'frames': len(frames)})
    manifest.sort(key=lambda entry: entry['id'])
    with open(manifest_path, 'w') as fh:
        json.dump(manifest, fh, indent=2)

    print(f'{len(frames)} frames in {len(rows)} rows -> {out_dir}')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
