"""3x crop pairs (last rising | first standing) from rise_handoff_probe.mjs shots.

  python3 tools/debug/rise_handoff_pairs.py <probe out dir> [facing=-1]

Reads <dir>/shots/<rig>__<case>__f<facing>__{rise,standing}.png, writes <dir>/pairs/<rig>__<case>.jpg
and deletes the raw shots dir.
"""
import os, shutil, sys
from PIL import Image, ImageDraw

d = sys.argv[1]
facing = sys.argv[2] if len(sys.argv) > 2 else '-1'
shots, out = os.path.join(d, 'shots'), os.path.join(d, 'pairs')
os.makedirs(out, exist_ok=True)
keys = sorted({f.rsplit('__', 1)[0] for f in os.listdir(shots) if f.endswith('__rise.png') and f'__f{facing}' in f})
for k in keys:
    a = Image.open(os.path.join(shots, k + '__rise.png')).convert('RGB')
    b = Image.open(os.path.join(shots, k + '__standing.png')).convert('RGB')
    W, H = a.size
    sheet = Image.new('RGB', (W * 6 + 6, H * 3 + 22), (24, 24, 24))
    sheet.paste(a.resize((W * 3, H * 3), Image.LANCZOS), (0, 22))
    sheet.paste(b.resize((W * 3, H * 3), Image.LANCZOS), (W * 3 + 6, 22))
    g = ImageDraw.Draw(sheet)
    g.text((6, 5), 'last rising frame', fill=(230, 230, 230))
    g.text((W * 3 + 12, 5), 'first standing frame', fill=(230, 230, 230))
    sheet.save(os.path.join(out, k.replace(f'__f{facing}', '') + '.jpg'), quality=72)
shutil.rmtree(shots)
print(len(keys), 'pairs')
