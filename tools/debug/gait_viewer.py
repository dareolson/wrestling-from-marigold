"""Build research/animation/gait-2026-10/g1.html from g1/*/*/*/metrics.json. Usage: gait_viewer.py"""
import json, os, glob, html
root = 'research/animation/gait-2026-10'
RIGS = ['thesz-procreate-v1', 'george-roster-v1']
SC = {'walk': ('walkA', 'walkB'), 'run': ('toRope', 'returning'), 'whip': ('toRope', 'returning')}
M = {}
for r in RIGS:
    for f in ('right', 'left'):
        for s in SC:
            M[(r, f, s)] = json.load(open(f'{root}/g1/{r}/{f}/{s}/metrics.json'))
def seg(r, f, s, i=0): return M[(r, f, s)]['segments'][SC[s][i]]
def med(vals): v = sorted(vals); return v[len(v) // 2]
def rng(vals, d=1):
    lo, hi = min(vals), max(vals); return f'{lo:.{d}f}' if abs(hi - lo) < 10 ** -d else f'{lo:.{d}f}–{hi:.{d}f}'
def sl(r, s, key, i=0): return [seg(r, f, s, i)[key] for f in ('right', 'left')]
L, G = RIGS
stop = lambda r, s, k: [M[(r, f, s)]['stopSlide'][k] for f in ('right', 'left') if k in M[(r, f, s)]['stopSlide']]
def feet(r, s, k):
    v = [sum(x['footTravelPx'].values()) / 2 for x in stop(r, s, k)]; return rng(v, 0)
turn = lambda r, s, key: rng([M[(r, f, s)]['ropeTurn'][key] for f in ('right', 'left') if 'ropeTurn' in M[(r, f, s)]], 1)

rows = [
 ('A', 'Run phase advances at WALK_FREQ × 0.8', 'confirmed',
  f"Run, planted-foot speed vs body: Lou {rng(sl(L,'run','plantedFootSpeedPctOfBody'),0)}%, George {rng(sl(G,'run','plantedFootSpeedPctOfBody'),0)}% (the ×0.8 alone predicts 20%). Drift per stance: Lou {rng(sl(L,'run','driftMedian'))} px, George {rng(sl(G,'run','driftMedian'))} px."),
 ('B', 'Run reuses walk STRIDE/STANCE: no flight, cadence ~5.3', 'confirmed',
  f"Run cadence {rng(sl(G,'run','cadenceStepsPerS',1),2)} steps/s (walk {rng(sl(G,'walk','cadenceStepsPerS'),2)}); flight fraction {rng(sl(L,'run','flightFraction',1)+sl(G,'run','flightFraction',1),2)}; double support {rng(sl(L,'run','doubleSupportFraction',1)+sl(G,'run','doubleSupportFraction',1),3)}."),
 ('C', 'Run hip uses the walk bob (highest mid-stance)', 'confirmed',
  f"Hip at near-foot mid-stance vs mean, run: Lou {rng(sl(L,'run','hipAtNearMidStancePx',1),2)} px, George {rng(sl(G,'run','hipAtNearMidStancePx',1),2)} px (negative = up, the walk model). Bob peak-to-peak {rng(sl(L,'run','hipBobPx',1),1)} / {rng(sl(G,'run','hipBobPx',1),1)} px, same as walk."),
 ('D', 'Lean 0.07 × gaitBlend for walk and run', 'confirmed from source, not measured',
  "Wrestler.js:2918 uses 0.07 × moveBlend for both. skeleton.torso.rotation reads 0 in every frame, so lean is applied elsewhere and the film has no lean number. Derek's eye decides."),
 ('E', 'Stop: walkPhase decays with no travel, feet move', 'confirmed',
  f"Body moved 0 px; mean foot travel per foot while still: Lou walk-stop {feet(L,'walk','stop1')}–{feet(L,'walk','stop2')} px, George {feet(G,'walk','stop1')}–{feet(G,'walk','stop2')} px, run-stop {feet(L,'run','after')} (Lou) / {feet(G,'run','after')} (George) px. walkPhase reaches 0 in ~35 frames."),
 ('F', 'STANCE .55: walk double support ~5%', 'low confirmed; the number was off',
  f"Measured walk double support {rng(sl(L,'walk','doubleSupportFraction')+sl(G,'walk','doubleSupportFraction'),3)} (plan guessed ~5%); STANCE .55 gives ~10%. Walk cadence {rng(sl(G,'walk','cadenceStepsPerS'),2)} steps/s (plan said ~2.75)."),
 ('G', 'One global GAIT for every body', 'confirmed',
  f"Cadence is identical on both rigs ({rng(sl(L,'walk','cadenceStepsPerS')+sl(G,'walk','cadenceStepsPerS'),2)} walk, {rng(sl(L,'run','cadenceStepsPerS',1)+sl(G,'run','cadenceStepsPerS',1),2)} run) though Lou draws at height scale {seg(L,'right','walk')['heightScale']} and George at {seg(G,'right','walk')['heightScale']}."),
 ('H', 'NEW: gait phase uses s, the rig is drawn at s × _heightScale', 'found by the film',
  f"Walk planted-foot speed vs body: Lou {rng(sl(L,'walk','plantedFootSpeedPctOfBody'),1)}% ({rng(sl(L,'walk','driftMedian'))} px drift per stance), George {rng(sl(G,'walk','plantedFootSpeedPctOfBody'),1)}% ({rng(sl(G,'walk','driftMedian'),2)} px). 1 − 0.7907 = 21%, 1 − 1/1.012 = 1.2%: the heightScale accounts for it. So the planted foot of a 0.79-scale rig moves forward at about a fifth of body speed at a plain walk."),
 ('R', 'Rope turn (run, whip)', 'measured',
  f"Largest one-frame foot step relative to the body in ±12 frames of the turn: run Lou {turn(L,'run','maxFootStepPx')} px, George {turn(G,'run','maxFootStepPx')} px; whip Lou {turn(L,'whip','maxFootStepPx')}, George {turn(G,'whip','maxFootStepPx')} px. Planted-foot world slip in the window: run {turn(L,'run','plantedFootWorldSlipPx')} / {turn(G,'run','plantedFootWorldSlipPx')} px. The window includes the facing flip."),
]
def runtable(s):
    out = ['<table><tr><th>rig</th><th>facing</th><th>segment</th><th>v px/s</th><th>drift med/max px</th><th>foot spd % body</th><th>steps/s</th><th>stance</th><th>dbl supp</th><th>flight</th><th>hip bob px</th><th>hip @ mid-stance px</th></tr>']
    for r in RIGS:
        for f in ('right', 'left'):
            for i in (0, 1):
                m = seg(r, f, s, i)
                if 'driftMedian' not in m: continue
                out.append(f"<tr><td>{r}</td><td>{f}</td><td>{SC[s][i]}</td><td>{m['vmax']}</td><td>{m['driftMedian']}/{m['driftMax']}</td><td>{m['plantedFootSpeedPctOfBody']}</td><td>{m['cadenceStepsPerS']}</td><td>{m['stanceFraction']}</td><td>{m['doubleSupportFraction']}</td><td>{m['flightFraction']}</td><td>{m['hipBobPx']}</td><td>{m['hipAtNearMidStancePx']}</td></tr>")
    return ''.join(out) + '</table>'
def loops(s):
    cells = []
    for r in RIGS:
        for f in ('right', 'left'):
            p = f'g1/{r}/{f}/{s}'
            cells.append(f'<figure><img src="{p}/loop.webp" alt="{r} {f} {s}"><figcaption>{r} · facing {f}</figcaption><details><summary>one-cycle strip</summary><img src="{p}/strip.png"></details></figure>')
    return '<div class="grid">' + ''.join(cells) + '</div>'
verdict_rows = ''.join(f"<tr><td>{a}</td><td>{html.escape(b)}</td><td><b>{html.escape(c)}</b></td><td>{html.escape(d)}</td></tr>" for a, b, c, d in rows)
doc = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Gait G1</title>
<style>body{{font:14px/1.45 -apple-system,sans-serif;background:#16161a;color:#e8e8ec;margin:0 auto;max-width:1300px;padding:16px}}
h1,h2{{font-weight:600}} table{{border-collapse:collapse;width:100%;margin:8px 0 24px;font-size:12.5px}} td,th{{border:1px solid #3a3a44;padding:4px 7px;text-align:left;vertical-align:top}}
th{{background:#24242c}} .grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}} figure{{margin:0;background:#1f1f26;padding:8px}} img{{max-width:100%;image-rendering:auto}}
figcaption{{margin:4px 0;color:#aab}} summary{{cursor:pointer;color:#8ab}} p.note{{color:#aab;max-width:900px}}</style></head><body>
<h1>Gait G1: today's walk and run, measured</h1>
<p class="note">Loops are normal speed (30 fps capture of 1/60 s steps, played at 30 fps). Numbers are measurements; nothing here says the gait reads right or wrong. Derek names what is bad, ranked, in his words; only those items go to Stage 2/3.
Seed 0x5eed1234 installed before game init. Rigs: thesz-procreate-v1 (Lou) and george-roster-v1, both facings; the other rig stands at the far end so the subject faces it.</p>
<h2>Plan table A–G</h2><table><tr><th></th><th>Observation</th><th>Verdict</th><th>Key numbers</th></tr>{verdict_rows}</table>
<h2>Walk (forward, stop, back away, stop)</h2>{loops('walk')}{runtable('walk')}
<h2>Run (run key: to the rope, rebound, back)</h2>{loops('run')}{runtable('run')}
<h2>Whip (Irish-whipped by the other rig)</h2>{loops('whip')}{runtable('whip')}
</body></html>"""
doc = doc.replace("HEAD " + "", "")
open(f'{root}/g1.html', 'w').write(doc)
print('wrote', f'{root}/g1.html')
