"""PLAN_GRAPPLES T2.0b: exact RGBA proof; never modifies the fitted assets.
python3 tools/debug/prove_george_clasps.py [output-directory]
Requires Pillow. 3x inspection panels use nearest-neighbor scaling.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, subprocess, sys, io, struct
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'research/art/clasps-2026-11/t2-0b-george'
OUT.mkdir(parents=True,exist_ok=True)
DONORS=ROOT/'Sprite sheets/AI Pilot/shared/articulation-donors/2026-11-07-george-clasps-v2'
OLD=ROOT/'Sprite sheets/AI Pilot/shared/articulation-donors/2026-11-07-clasps-v1'
base_path=ROOT/'src/assets/wrestlers/george-roster-v1/forearm.png'
base=Image.open(base_path).convert('RGBA'); w,h=base.size
manifest=json.loads((DONORS/'protected-baseline.json').read_text())
for path,sha in manifest.items():
    assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==sha, f'Protected file changed: {path}'
records=[]
for name,snake in [('collarTie','collar_tie'),('elbowCup','elbow_cup'),('waistClasp','waist_clasp')]:
    fit=json.loads((OLD/name/'fit-measurements.json').read_text())['rigs']['george-roster-v1']
    asset=f'src/assets/wrestlers/george-roster-v1/forearm_{snake}.png'
    candidate=Image.open(ROOT/asset).convert('RGBA'); assert candidate.size==base.size
    before=Image.open(io.BytesIO(subprocess.check_output(['git','show',f'c9a2c2d:{asset}'],cwd=ROOT))).convert('RGBA')
    wrist=fit['wristRow']; A=list(struct.iter_unpack('4B',base.tobytes())); B=list(struct.iter_unpack('4B',candidate.tobytes())); C=list(struct.iter_unpack('4B',before.tobytes()))
    changed=[i for i,(a,b) in enumerate(zip(A,B)) if a!=b]
    above=[i for i in changed if i//w<=wrist]; assert not above, (name,len(above))
    old_above=sum(a!=c for i,(a,c) in enumerate(zip(A,C)) if i//w<=wrist)
    xs=[i%w for i in changed]; ys=[i//w for i in changed]; box=[min(xs),min(ys),max(xs),max(ys)]
    visible_changed=sum(A[i][3]>0 or B[i][3]>0 for i in changed)
    # Raw binary diff is unannotated: white = any changed RGBA byte in that pixel.
    mask=Image.new('L',(w,h)); mask.putdata([255 if a!=b else 0 for a,b in zip(A,B)]);mask.save(OUT/f'{name}-diff-mask.png')
    def backed(im):
        bg=Image.new('RGBA',(w,h),(75,78,82,255));bg.alpha_composite(im);return bg.convert('RGB')
    overlay=Image.blend(backed(base),backed(candidate),.5)
    diff=Image.new('RGB',(w,h),(27,30,34));pix=diff.load()
    for i in changed:pix[i%w,i//w]=(247,80,178)
    panels={'base':backed(base),'clasp':backed(candidate),'overlay':overlay,'diff':diff}
    for label,im in panels.items():
        im=im.resize((w*3,h*3),Image.Resampling.NEAREST);d=ImageDraw.Draw(im)
        d.line((0,wrist*3,w*3,wrist*3),fill=(80,220,255),width=2)
        if label in ['overlay','diff']: d.rectangle(tuple(v*3 for v in box),outline=(255,225,75),width=3)
        im.save(OUT/f'{name}-{label}-3x.png')
    sheet=Image.new('RGB',(w*3*4,h*3+42),(20,22,25));draw=ImageDraw.Draw(sheet)
    for j,label in enumerate(panels):
        im=Image.open(OUT/f'{name}-{label}-3x.png');sheet.paste(im,(j*w*3,42));draw.text((j*w*3+12,12),f'{name}: {label} (3x)',fill='white')
    sheet.save(OUT/f'{name}-proof-3x.png')
    records.append({'variant':name,'canvas':[w,h],'wristRowInclusive':wrist,'preservedRows':[0,wrist],
                    'changedPixelsAboveWrist':len(above),'beforeChangedPixelsAboveWrist':old_above,
                    'changedPixelsTotal':len(changed),'visibleChangedPixels':visible_changed,'changedBounds':box,
                    'contact':fit['contact'],'clutch':fit['semanticAnchors']['clutch'],
                    'pivot':fit['pivot'],'baseSha256':hashlib.sha256(base_path.read_bytes()).hexdigest(),
                    'outputSha256':hashlib.sha256((ROOT/asset).read_bytes()).hexdigest(),
                    'skinMedianTarget':fit['targetSkinMedian'],'skinMedianHand':fit['fittedHandSkinMedian']})
(OUT/'pixel-diff.json').write_text(json.dumps(records,indent=2)+'\n')
body='''<!doctype html><meta charset="utf-8"><title>George clasp hand-only revision — T2.0b</title><style>body{font:16px system-ui;background:#181b20;color:#eee;margin:24px}a{color:#9dcaff}img{max-width:100%;height:auto}.row{display:flex;gap:8px}.row a{width:25%}table{border-collapse:collapse}td,th{padding:8px;border:1px solid #555}</style><h1>George clasps — hand-only revision (T2.0b)</h1><p>426×439 canvas, original elbow pivot. Rows 0–252 inclusive are copied pixel for pixel from George’s forearm.png, including transparent RGB. Only the hand side of that wrist boundary changes. No Lou wrist oval or elbow notch is transplanted. Uncommitted candidates for Opus review.</p><p>Each panel uses the identical canvas and pose. Overlay = 50% base + 50% clasp. Magenta = changed RGBA pixel, yellow rectangle = actual changed bounds, cyan line = wrist boundary. Open an image for full 3× pixels. Raw binary masks have no annotations.</p><table><tr><th>Clasp</th><th>Old changed shaft px</th><th>New changed shaft px</th><th>All changed px</th><th>Changed bounds</th></tr>'''
for r in records:body+=f'<tr><td>{r["variant"]}</td><td>{r["beforeChangedPixelsAboveWrist"]}</td><td><b>{r["changedPixelsAboveWrist"]}</b></td><td>{r["changedPixelsTotal"]}</td><td>{r["changedBounds"]}</td></tr>'
body+='</table>'
for r in records:
    n=r['variant'];body+=f'<h2>{n}</h2><div class="row">'
    for label in ['base','clasp','overlay','diff']:body+=f'<a href="{n}-{label}-3x.png">{label}<img src="{n}-{label}-3x.png"></a>'
    body+=f'</div><p><a href="{n}-proof-3x.png">Combined proof</a> · <a href="{n}-diff-mask.png">Raw pixel diff</a></p>'
body+='<p><a href="REPORT.md">Report</a> · <a href="pixel-diff.json">Exact measurements</a></p>'
(OUT/'index.html').write_text(body)
print(json.dumps(records,indent=2))
