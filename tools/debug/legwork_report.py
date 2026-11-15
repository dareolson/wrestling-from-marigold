"""Preserve the completed browser audit and summarize both-role leg geometry."""
from pathlib import Path
import json,gzip,math,statistics,shutil,hashlib
root=Path('research/animation/legwork-2026-11-15');root.mkdir(parents=True,exist_ok=True)
results=[];errors=[];ratios={'a':1,'d':1}
with gzip.open(root/'final-frames.jsonl.gz','wt') as archive:
 for shard in Path('/private/tmp').glob('legwork-final-*/summary.json'):
  s=json.loads(shard.read_text());errors+=s['errors']
  for r in s['results']:
   raw=shard.parent/f"{r['move']}-{r['a'].split('-')[0]}-{r['d'].split('-')[0]}-{r['facing']}.json"
   data=json.loads(raw.read_text());archive.write(json.dumps({'case':{k:r[k] for k in ['move','a','d','facing']},'data':data},separators=(',',':'))+'\n')
   for role in ['a','d']:
    lengths={}
    for row in data['rows']:
     w=row[role]
     for side in ['near','far']:
      for p,q in [('Hip','Knee'),('Knee','Ankle')]:
       a=w['points'].get(side+p);b=w['points'].get(side+q)
       if a and b:lengths.setdefault(side+p,[]).append(math.dist(a,b)/w['scale'])
    r['metrics'][role]['segmentMaxMinRatio']=max(max(x)/min(x) for x in lengths.values() if min(x)>.01)
    ratios[role]=max(ratios[role],r['metrics'][role]['segmentMaxMinRatio'])
   results.append(r)
assert len(results)==320
assert len({(r['move'],r['a'],r['d'],r['facing']) for r in results})==320
summary={'cases':320,'errors':errors,'normalizedSegmentRatios':ratios,'results':results,'sourceHashes':{p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in ['src/Wrestler.js','src/animation/clips/lightStrikes.js','src/animation/clips/groundStrikes.js']}}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
# Preserve baseline raw data compactly; retain baseline pictures and summary.
baseline_raw=[p for p in (root/'before').glob('*.json') if p.name!='summary.json']
if baseline_raw:
 with gzip.open(root/'before-frames.jsonl.gz','wt') as archive:
  for raw in baseline_raw:
   data=json.loads(raw.read_text())
   if 'rows' in data:archive.write(json.dumps({'file':raw.name,'data':data},separators=(',',':'))+'\n')
for raw in (root/'before').glob('*.json'):
 if raw.name!='summary.json' and 'rows' in json.loads(raw.read_text()):raw.unlink()
for name in ['mount','sweep']:
 src=Path(f'/private/tmp/legwork-{name}-preview.png')
 if src.exists():shutil.copy2(src,root/f'{name}-preview.png')
rows=[]
for move in sorted({r['move'] for r in results}):
 rs=[r for r in results if r['move']==move];miss=[x for r in rs for x in r['hitMisses']]
 rows.append(f"| {move} | {sum(len(r['hits']) for r in rs)} | {statistics.median(miss):.1f} / {max(miss):.1f} | {max(r['plantMax'] or 0 for r in rs):.2f} |")
(root/'metrics-table.md').write_text('| Move | Impact events (32 cases each) | Contact median / max (px) | Max declared plant error (px) |\n|---|---:|---:|---:|\n'+'\n'.join(rows)+'\n')
print('Saved 320 unique cases, raw archives, source hashes and metrics table; errors:',len(errors),'normalized leg ratios:',ratios)
