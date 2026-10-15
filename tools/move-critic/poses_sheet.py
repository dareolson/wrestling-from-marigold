"""Key-pose sheet from a sample.mjs --times strip: frames cropped to the union
of the bodies, labelled with the given times.
    python3 tools/move-critic/poses_sheet.py <stripDir> <out.png> <t1,t2,...> [--cols 4]
"""
import sys, os
from PIL import Image, ImageDraw, ImageChops
strip, out, times = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
cols = int(sys.argv[sys.argv.index('--cols') + 1]) if '--cols' in sys.argv else 4
files = sorted(f for f in os.listdir(strip) if f.endswith('.png'))
frames = [Image.open(os.path.join(strip, f)).convert('RGB') for f in files]
box = None
for im in frames:
    diff = ImageChops.difference(im, Image.new('RGB', im.size, im.getpixel((5, 5)))).convert('L').point(lambda v: 255 if v > 40 else 0)
    b = diff.getbbox()
    if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
box = (box[0] - 10, box[1] - 10, box[2] + 10, box[3] + 10)
w, h = box[2] - box[0], box[3] - box[1]
rows = (len(frames) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 18)), (20, 22, 28))
d = ImageDraw.Draw(sheet)
for i, im in enumerate(frames):
    x, y = (i % cols) * w, (i // cols) * (h + 18)
    sheet.paste(im.crop(box), (x, y + 18))
    d.text((x + 4, y + 3), f'{times[i]}s', fill=(230, 230, 230))
sheet.save(out); print(out, sheet.size)
