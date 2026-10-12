// Drives a REAL match in Chrome and watches the rig while it plays.
//
// Posing a frozen skeleton (front3q_candidate_comparison.mjs) proves assembly.
// It does not prove a match: moves that complete, both facings reached by the
// AI rather than set by hand, grounding held through get-ups, and no texture
// silently missing. This plays the match and samples the live skeleton.
//
//   node tools/debug/live_match_check.mjs [--p1 <id>] [--p2 <id>] [--out <dir>]
//
// Exits non-zero if any sample is non-finite or any texture is missing.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './harness.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const p1 = flag('--p1', 'thesz-procreate-v1');
const p2 = flag('--p2', 'george');
const outDir = flag('--out', path.join(ROOT, 'tools/debug/shots/live-match'));

process.env.WFM_P1 = p1;
process.env.WFM_P2 = p2;
process.env.WFM_TS = process.env.WFM_TS ?? '2';

await mkdir(outDir, { recursive: true });
const pageErrors = [];
const h = await launch();
h.page.on('pageerror', e => pageErrors.push(String(e.message)));

for (let i = 0; i < 60 && !(await h.snap())?.w1; i++) await h.page.waitForTimeout(500);
if (!(await h.snap())?.w1) throw new Error('match never started');
await h.page.waitForTimeout(9000);

// Both sides default to keyboard; with nobody at the keys the match is two men
// standing still. '1' and '2' hand each side to its AIHandler (Arena.js:3064,
// :3071), which is what makes this a match rather than a pose.
await h.page.locator('canvas').click();
for (const key of ['Digit1', 'Digit2']) {
    await h.page.keyboard.press(key);
    await h.page.waitForTimeout(250);
}
console.log('  both sides handed to AI; clock', (await h.snap()).clock);

const SAMPLER = `(() => {
  const sc = window.__WFM_GAME?.scene?.scenes?.[0];
  if (!sc?.w1) return null;
  const SLOTS = ['torso','head','nearUpArm','farUpArm','nearForearm','farForearm',
                 'nearThigh','farThigh','nearShin','farShin','nearHand','farHand',
                 'nearBoot','farBoot'];
  const read = (w, tag) => {
    const sk = w.skeleton, bad = [];
    for (const s of SLOTS) {
      const img = sk?.[s];
      if (!img) continue;
      for (const f of ['x','y','rotation','displayWidth','displayHeight']) {
        if (!Number.isFinite(img[f])) bad.push(tag+'.'+s+'.'+f+'='+img[f]);
      }
      const key = img.texture?.key;
      if (key === '__MISSING' || key === '__DEFAULT') bad.push(tag+'.'+s+' texture '+key);
    }
    return { bad, facing: w.facing, state: w.state, y: Math.round(w.y),
             soleY: Math.round((sk?.nearShin?.y ?? 0) + (sk?.nearShin?.displayHeight ?? 0)/2) };
  };
  return { t: Math.round(sc._matchTime*10)/10, over: sc.matchOver,
           w1: read(sc.w1,'w1'), w2: read(sc.w2,'w2'),
           events: sc.matchEvents.length };
})()`;

const problems = [];
const facings = { w1: new Set(), w2: new Set() };
const states = new Set();
let shots = 0, lastEvents = 0, samples = 0;

for (let i = 0; i < 150; i++) {
    const s = await h.page.evaluate(SAMPLER);
    if (!s) break;
    samples++;
    for (const side of ['w1', 'w2']) {
        problems.push(...s[side].bad);
        facings[side].add(s[side].facing);
    }
    states.add(s.w1.state);
    if (s.events > lastEvents && shots < 14) {
        lastEvents = s.events;
        await h.screenshot(path.join(outDir, `t${String(s.t).padStart(5,'0')}-${s.w1.state}.png`),
            { x: 180, y: 120, width: 760, height: 400 });
        shots++;
    }
    if (s.over) break;
    await h.page.waitForTimeout(400);
}

const ev = await h.events(0);
const kinds = [...new Set(ev.map(e => e.type ?? e.kind ?? Object.keys(e)[0]))];
const report =
`# live match — ${p1} vs ${p2}

samples            ${samples}
match events       ${ev.length}
event kinds        ${kinds.join(', ') || '(none)'}
states reached     ${[...states].join(', ')}
facings reached    w1 ${[...facings.w1].join('/')}   w2 ${[...facings.w2].join('/')}
screenshots        ${shots} -> ${path.relative(ROOT, outDir)}

non-finite / missing-texture samples: ${problems.length}
${problems.slice(0, 20).map(p => '  ' + p).join('\n') || '  none'}

page errors: ${pageErrors.length}
${pageErrors.slice(0, 10).map(p => '  ' + p).join('\n') || '  none'}
`;
await writeFile(path.join(outDir, 'REPORT.md'), report);
console.log(report);
await h.close();
if (problems.length || pageErrors.length) process.exit(1);
