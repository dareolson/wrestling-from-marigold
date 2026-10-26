"""Build research/animation/gait-2026-10/g2.html (PLAN_GAIT T2.3) from g2/<column>/thesz-procreate-v1/right/{walk,run}/metrics.json."""
import json
root = 'research/animation/gait-2026-10'
COLS = [('v1', 'today (v1)', ''), ('a-lean', 'A: v2 lean only', 'gait=v2'), ('b-stride', 'B: A + stride x1.3', 'gait=v2&gaitStride=1.3'),
        ('c-knee', 'C: A + knee flex .1', 'gait=v2&gaitKnee=0.1'), ('d-all', 'D: A + stride + knee', 'gait=v2&gaitStride=1.3&gaitKnee=0.1')]
RIG = 'thesz-procreate-v1'
def M(col, sc): return json.load(open(f'{root}/g2/{col}/{RIG}/right/{sc}/metrics.json'))
def seg(m, sc): s = m['segments']; return s['walkA'] if sc == 'walk' else s['returning']
def cell(col, label, qs, sc):
    m = M(col, sc); v = seg(m, sc); p = f'g2/{col}/{RIG}/right/{sc}'
    stop = m['stopSlide'].get('stop1') or m['stopSlide'].get('after') or {}
    feet = sum(stop.get('footTravelPx', {'a': 0}).values()) / 2 if stop else 0
    return (f'<td><img src="{p}/loop.webp" alt="{label} {sc}"><details><summary>one-cycle strip</summary><img src="{p}/strip.png"></details>'
            f'<table class="m"><tr><td>steps/s</td><td>{v["cadenceStepsPerS"]}</td></tr><tr><td>planted-foot drift / stance (px)</td><td>{v["driftMedian"]} (max {v["driftMax"]})</td></tr>'
            f'<tr><td>lean (bend, rad)</td><td>{v["leanBendRad"]}</td></tr><tr><td>hip bob (px)</td><td>{v["hipBobPx"]}</td></tr>'
            f'<tr><td>arm segment length change (px)</td><td>{v["armLenVarPx"]}</td></tr><tr><td>feet travel in the stop (px, mean of 2)</td><td>{feet:.1f}</td></tr></table></td>')
head = ''.join(f'<th>{l}<br><small>{q or "no flag"}</small></th>' for _, l, q in COLS)
rows = ''.join(f'<tr><th class="row">{sc}</th>' + ''.join(cell(c, l, q, sc) for c, l, q in COLS) + '</tr>' for sc in ('walk', 'run'))
doc = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Gait G2</title>
<style>body{{font:14px/1.45 -apple-system,sans-serif;background:#16161a;color:#e8e8ec;margin:0 auto;max-width:2000px;padding:16px}}
table.cols{{border-collapse:collapse;width:100%;table-layout:fixed}} table.cols>tbody>tr>td,table.cols>tbody>tr>th,table.cols>thead>tr>th{{border:1px solid #3a3a44;padding:6px;vertical-align:top}}
th{{background:#24242c;font-weight:600}} th.row{{width:40px}} img{{max-width:100%}} small{{color:#9ab;font-weight:400}} table.m{{font-size:11.5px;margin-top:4px;width:100%;border-collapse:collapse}}
table.m td{{border-top:1px solid #2c2c34;padding:2px 4px}} summary{{cursor:pointer;color:#8ab}} p.note{{max-width:980px;color:#aab}} form{{background:#1f1f26;padding:10px;max-width:980px}}
label{{display:inline-block;margin:4px 12px 4px 0}} input{{width:70px;background:#101014;color:#e8e8ec;border:1px solid #444;padding:2px 4px}} a{{color:#8cf}}</style></head><body>
<h1>Gait G2: lean and the "a little off" A/B (Lou)</h1>
<p class="note">Right-facing Lou (thesz-procreate-v1), normal-speed loops, fixed seed. Every v2 column has the foot lock (planted-foot drift 0 px) and the lean; columns B to D add one change each so you can say which one fixes "a little off". These are measurements, not a verdict; the eye decides.
Lean is the torso pitch (bend, radians): walk .10 and run .25 to start, plus up to .06 into a start and back on a brake.</p>
<form id="f"><b>Play it in the game</b> (dev server must be running at localhost:5173):<br>
<label>leanWalk <input id="lw" value="0.10"></label><label>leanRun <input id="lr" value="0.25"></label><label>gaitStride <input id="gs" value="1"></label><label>gaitKnee <input id="gk" value="0"></label>
<a id="go" href="#" target="_blank">open the game with these values</a> · <small>R runs to the ropes, WASD walks. Add <code>&amp;p1=george-roster-v1</code> for George.</small></form>
<br><table class="cols"><thead><tr><th class="row"></th>{head}</tr></thead><tbody>{rows}</tbody></table>
<script>const f=()=>'http://localhost:5173/?arena=1&notitle=1&p1=thesz-procreate-v1&p2=george-roster-v1&gait=v2&leanWalk='+lw.value+'&leanRun='+lr.value+'&gaitStride='+gs.value+'&gaitKnee='+gk.value;
for(const i of ['lw','lr','gs','gk'])document.getElementById(i).oninput=()=>go.href=f();go.href=f();</script></body></html>"""
open(f'{root}/g2.html', 'w').write(doc)
print('wrote', f'{root}/g2.html')
