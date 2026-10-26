"""Pack gait_film.mjs frames: loop.webp (normal speed, 33.3 ms/frame) and strip.png (12 frames). Usage: gait_pack.py <run dir>"""
import json, sys, os
from PIL import Image

d = sys.argv[1]
meta = json.load(open(os.path.join(d, 'frames.json')))
files = [os.path.join(d, 'frames', s['file']) for s in meta['shots']]
imgs = [Image.open(f).convert('RGB') for f in files]
imgs[0].save(os.path.join(d, 'loop.webp'), save_all=True, append_images=imgs[1:], duration=1000 / 30, loop=0, quality=80, method=4)
if meta['strip']:
    pick = [imgs[i] for i in meta['strip']]
    w, h = pick[0].size
    sheet = Image.new('RGB', (w * 6, h * 2))
    for i, im in enumerate(pick):
        sheet.paste(im, ((i % 6) * w, (i // 6) * h))
    sheet.save(os.path.join(d, 'strip.png'))
