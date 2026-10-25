# Rise -> standing handoff (PLAN_RISE_HANDOFF)

Open `viewer.html` (needs `g5/` next to it). Columns: default | `?risefix=1`. Rows: Lou (suplex receiver with the
thrower behind = he turns; from his back; from his front; quick rise), George (back, front, thrower behind = turns).
Both facings, 1x / 0.5x, scrub, frame step, "jump to swap". The number under each picture is the largest part step
from the previous frame (px on the 300x330 crop), facing mirror taken out; at +0 ms it is the pop at the swap.

## What is committed

| path | what | size |
|---|---|---|
| `viewer.html`, `g5/` | the G5 viewer; `g5/` = 1115 downscaled (<= 480 px) WebP frames + `data.js` | 9.3 MB |
| `baseline/` | T1.1/T1.2 probe of the default game: `handoff.json`, `attribution.{json,md}`, 3x pairs | 12 MB |
| `fixed/` | T2.2 probe with `risefix=1`: `handoff.json`, `table.md` (before -> after), `pairs/` for the two rigs that miss | 7 MB |

Not committed (regenerate; both are raw captures): `g5-film/` (26 MB, input of `g5/`), `fixed/shots/` (24 MB; the
probe's pair script deletes it).

## Regenerate

Node 22, dev server on 127.0.0.1:5173 (`WFM_URL`).

```
export PATH=~/.nvm/versions/node/v22.23.1/bin:$PATH WFM_URL=http://127.0.0.1:5173
R=research/animation/rise-handoff-2026-10
# T1.1 baseline (default + sellart/aftermath off)         ~10 min
node tools/debug/rise_handoff_probe.mjs $R/baseline all default,off && python3 -I tools/debug/rise_handoff_pairs.py $R/baseline
# T2.2 with the fix                                       ~10 min
node tools/debug/rise_handoff_probe.mjs $R/fixed all fix,fixoff
python3 -I tools/debug/rise_handoff_report.py $R/baseline $R/fixed 3 > $R/fixed/table.md
# T3.1 viewer frames                                      ~3 min
node tools/debug/rise_handoff_film.mjs $R/g5-film all
python3 -I tools/debug/g4_package.py $R/g5-film -250 --configs default,risefix \
  --scenarios $(ls $R/g5-film/default | paste -sd, -) --out ../g5 --var G5 --t0 swap
```

Attribution table: `node tools/debug/rise_handoff_attribution.mjs` + `rise_handoff_table.py` (see their headers).
