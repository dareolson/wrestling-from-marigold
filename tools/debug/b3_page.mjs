// B3 G3 + G4 page: the leg-hold table per wrestler (?light=v1 kits), the crab's B1 packet, and the soak results.
//   node tools/debug/b3_page.mjs research/animation/light-moves-2026-11/b3-soak
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { ROSTER_KITS, lightKit } from '../../src/characters/rosterKits.js';
import { PERSONALITIES } from '../../src/AIHandler.js';
import { ROSTER_PERSONALITIES } from '../../src/characters/rosterKits.js';
const [dir] = process.argv.slice(2);
const NAMES = { thesz: 'Lou', george: 'George', kowalski: 'Kowalski', guido: 'Guido' };
const LEG = ['figureFour', 'ankleLock', 'halfBostonCrab'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const common = Object.keys(ROSTER_KITS).map(n => new Set(lightKit(n))).reduce((a, b) => new Set([...a].filter(x => b.has(x))));
const rows = Object.keys(ROSTER_KITS).map(n => {
  const kit = lightKit(n), cfg = PERSONALITIES[ROSTER_PERSONALITIES[n]];
  return `<tr><th>${NAMES[n]}</th><td><b>${kit.filter(m => LEG.includes(m)).join(', ')}</b></td><td>${kit.filter(m => !common.has(m) && !LEG.includes(m)).join(', ')}</td><td>${cfg.groundHoldOdds ?? '-'}</td><td>${ROSTER_KITS[n].filter(m => LEG.includes(m)).join(', ')}</td></tr>`;
}).join('\n');
const soaks = readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => ({ f, j: JSON.parse(readFileSync(`${dir}/${f}`)) }));
const soakRows = soaks.map(({ f, j }) => {
  const mv = Object.entries(j.moves ?? {}).filter(([k]) => /ankleLock|halfBostonCrab|armBar|figureFour/.test(k)).map(([k, v]) => `${k} ×${v}`).join(', ') || 'none played';
  return `<tr><th>${f.replace('.json', '')}</th><td>${j.pass === undefined ? '' : j.pass ? 'pass' : 'FAIL'}</td><td>${j.gameMin ? j.gameMin + ' game min' : ''}</td><td>${j.matches ?? '?'} matches</td><td>${(j.failures ?? []).length} failures${(j.failures ?? []).length ? ': ' + esc((j.failures ?? []).slice(0, 4).map(x => `${x.kind} ${x.who} ${x.detail ?? ''}`).join('; ')) : ''}</td><td>${esc(mv)}</td></tr>`;
}).join('\n');
writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset=utf-8><title>B3 leg holds and soak</title><style>body{font:15px system-ui;background:#151515;color:#eee;margin:18px auto;max-width:1100px}table{border-collapse:collapse;margin:10px 0}td,th{border:1px solid #444;padding:6px 10px;text-align:left;font-size:13px}a{color:#8cf}</style>
<h1>B3: leg-hold slot per wrestler, and the soak (?light=v1)</h1>
<p>Opus's defaults for Derek (2026-11-13), kits in <code>src/characters/rosterKits.js</code> (<code>LIGHT_KIT_SWAPS</code>); flag off every kit is unchanged. Press Finisher beside a downed man; Down picks the crab where held.</p>
<table><tr><th></th><th>Leg hold (light)</th><th>Other moves only he (or some) hold</th><th>groundHoldOdds</th><th>Leg hold flag off</th></tr>${rows}</table>
<p>The crab: <a href="../b1-half-crab/index.html">B1 page</a> (four cases, normal speed, numbers and misses). Ankle lock: G2 approved 2026-11-10. Figure-four is parked.</p>
<h2>Soak: AI vs AI, nothing placed by hand (<code>LIGHT=v1 tools/debug/grapples_soak.mjs</code>, 3x speed)</h2>
<table><tr><th>pair</th><th></th><th>length</th><th>matches</th><th>stuck / failures</th><th>mat holds played</th></tr>${soakRows}</table>`);
console.log('wrote', `${dir}/index.html`);
