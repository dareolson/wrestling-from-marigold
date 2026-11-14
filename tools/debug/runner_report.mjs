// node tools/debug/runner_report.mjs runner.json
import { readFileSync } from 'node:fs';
const R = JSON.parse(readFileSync(process.argv[2])), f = (n, d = 1) => +n.toFixed(d);
for (const [tag, { answer, called, added, rows, errors }] of Object.entries(R)) {
  if (called === null) { console.log(tag, JSON.stringify({ answer, note: 'window never opened', errors })); continue; }
  const sgn = Math.sign(rows[0].dx - rows[0].ax);   // runner starts on this side of the attacker
  const pre = rows[Math.max(0, called - 1)], after = rows.slice(called);
  const maxStep = rows.slice(called).reduce((m, r, i, a) => i ? Math.max(m, Math.abs(r.dx - a[i - 1].dx)) : m, 0);
  const stopAt = after.findIndex(r => Math.abs(r.runSpeed) < 20 && r.dst !== 'running');
  const end = rows.at(-1), pins = [...new Set(rows.flatMap(r => r.pin))];
  const lastHeld = [...after].reverse().find(r => r.dst === 'down') ?? end;
  console.log(tag, JSON.stringify({ answer, kitAddedForTest: added, contactFrame: called, windowOpenedAtX: f(rows[0].dx - rows[0].ax), runnerSpeedAtCallPxPerS: f(Math.abs(pre.runSpeed), 0), maxRunnerXStepAfterPxPerFrame: f(maxStep), framesUntilRunnerStopsMoving: stopAt, runnerEndsAtPxBehindAttacker: f((end.ax - end.dx) * sgn), runnerEndState: `${end.dst}/${end.dlying}`, attackerEnd: end.ast, pinned: pins, errors }));
}
