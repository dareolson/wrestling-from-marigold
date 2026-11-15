"""Package imagegen hand art on source forearm canvas; no runtime registration."""
from pathlib import Path
from PIL import Image
import json
import sys
P=Path(__file__).parent
base=Image.open(P/'references/forearm.png').convert('RGBA')
assert base.size==(426,439)
report_path=P/'canvas-check.json'
report=json.loads(report_path.read_text()) if report_path.exists() else {}
names=sys.argv[1:] or ['presentPalm','dismiss']
for name in names:
    assert name in ['presentPalm','dismiss','chestTouch','hairSmooth','inspect']
    # Scale the entire generated canvas, never its alpha bounding box.
    generated=Image.open(P/f'generated/{name}-source-v1.png').convert('RGBA')
    full=generated.resize(base.size,Image.Resampling.LANCZOS)
    # Align the generated wrist to the supplied source joint. All pixels through
    # the wrist remain the original, including the unoutlined elbow cap.
    aligned=Image.new('RGBA',base.size)
    aligned.alpha_composite(full,(5,-12))
    out=aligned.copy()
    out.paste(base.crop((0,0,426,234)),(0,0))
    # Short transition below the wrist, preserving original pixels above it.
    for y in range(234,246):
        w=(y-233)/12
        out.paste(Image.blend(base.crop((0,y,426,y+1)),aligned.crop((0,y,426,y+1)),w),(0,y))
    target=P/f'forearm_{name}-v1.png'
    out.save(target)
    assert out.crop((0,0,426,234)).tobytes()==base.crop((0,0,426,234)).tobytes()
    report[name]={'file':target.name,'canvas':[426,439], 'originalPixelsPreservedThroughRow':233,
        'jointPivotFrac':.1559,'distalAnchorFrac':{'u':.5010,'v':.5298},
        'semanticAnchors':{},'alphaExtrema':list(out.getchannel('A').getextrema()),
        'sourceSize':list(generated.size),'wholeCanvasTranslation':[5,-12],
        'note':'Art candidate; on-body review pending.'}
    if name=='hairSmooth':
        report[name]['note']='Far-arm hair smoothing; hairContact measured separately on packaged art in semantic-anchors.json. Forearm length unchanged; original face-overlap concern requires in-game review.'
        anchor_path=P/'semantic-anchors.json'
        if anchor_path.exists():
            report[name]['semanticAnchors']=json.loads(anchor_path.read_text())['hairSmooth']['semanticAnchors']
(P/'canvas-check.json').write_text(json.dumps(report,indent=2)+'\n')
print(f'{len(names)} 426x439 RGBA variants; original elbow/forearm pixels unchanged through wrist row 233.')
