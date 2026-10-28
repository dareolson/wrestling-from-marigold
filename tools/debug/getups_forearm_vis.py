"""Visible forearm pixels per frame from the shot pairs getups_forearm_vis.mjs wrote (T2.4).
   python3 -I tools/debug/getups_forearm_vis.py <outRoot> [name=lou]   -> <outRoot>/forearm-vis-<name>.json (adds visiblePx),
   and jpg copies of the shown frames (the png pairs stay local)."""
import json, sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd
root = sys.argv[1]; name = sys.argv[2] if len(sys.argv) > 2 else 'lou'
path = os.path.join(root, f'forearm-vis-{name}.json')
res = json.load(open(path))
for blk in res:
    d = os.path.join(root, 'frames', blk['column'], f"{name}-{'l' if blk['facing'] < 0 else 'r'}")
    for row in blk['rows']:
        i = row['i']
        a = np.asarray(Image.open(f'{d}/s{i:04d}.png').convert('L'), dtype=int)
        b = np.asarray(Image.open(f'{d}/h{i:04d}.png').convert('L'), dtype=int)
        m = nd.binary_opening(np.abs(a - b) > 45, structure=np.ones((3, 3)))
        row['visiblePx'] = int(m.sum())
        Image.open(f'{d}/s{i:04d}.png').convert('RGB').save(f'{d}/s{i:04d}.jpg', quality=85)
json.dump(res, open(path, 'w'))
print('ok', path)
