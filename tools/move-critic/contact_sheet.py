"""Contact sheet of a sample.mjs --strip directory: frames cropped to the
union of the bodies across the whole move, laid out in a grid with times.

    python3 tools/move-critic/contact_sheet.py <stripDir> <out.png> [--every 3] [--fps 60] [--cols 8]
"""
import sys, os, re
from PIL import Image, ImageDraw, ImageChops

args = sys.argv[1:]
def flag(name, default):
    return type(default)(args[args.index(name) + 1]) if name in args else default
strip, out = args[0], args[1]
every, fps, cols = flag('--every', 3), flag('--fps', 60), flag('--cols', 8)
files = sorted(f for f in os.listdir(strip) if f.endswith('.png'))
picked = files[::every]
if files[-1] not in picked:
    picked.append(files[-1])
frames = [Image.open(os.path.join(strip, f)).convert('RGB') for f in picked]
# Background = per-pixel median-ish: the darkest frame difference threshold.
bg = frames[0].copy()
box = None
for im in frames:
    diff = ImageChops.difference(im, Image.new('RGB', im.size, im.getpixel((5, 5)))).convert('L').point(lambda v: 255 if v > 40 else 0)
    b = diff.getbbox()
    if b:
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
pad = 12
box = (max(0, box[0] - pad), max(0, box[1] - pad), min(frames[0].width, box[2] + pad), min(frames[0].height, box[3] + pad))
w, h = box[2] - box[0], box[3] - box[1]
rows = (len(frames) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 16)), (20, 22, 28))
draw = ImageDraw.Draw(sheet)
for i, (name, im) in enumerate(zip(picked, frames)):
    x, y = (i % cols) * w, (i // cols) * (h + 16)
    sheet.paste(im.crop(box), (x, y + 16))
    t = int(re.findall(r'\d+', name)[0]) / fps
    draw.text((x + 4, y + 2), f'{t:.3f}s', fill=(220, 220, 220))
sheet.save(out)
print(out, sheet.size, f'{len(frames)} frames')
