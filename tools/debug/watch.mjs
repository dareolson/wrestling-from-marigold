// Watch a live match from the terminal: wrestler states every 500ms plus
// every matchEvents entry as it lands.
//
//   npm run debug:watch            — watch for 30s
//   npm run debug:watch -- 120     — watch for 120s
//   HEADED=1 npm run debug:watch   — with a visible browser
//   WFM_URL=http://localhost:5176 npm run debug:watch  — attach to your server

import { launch } from './harness.mjs';

const seconds = Number(process.argv[2]) || 30;
const h = await launch();

let lastEvents = 0;
const ticks = seconds * 2;
for (let i = 0; i < ticks; i++) {
    await h.page.waitForTimeout(500);
    const s = await h.snap();
    if (!s) { console.log('scene not ready'); continue; }
    console.log(
        `${s.clock}  w1(${s.w1.x},${s.w1.y}) ${s.w1.st} ${s.w1.stam}% | ` +
        `w2(${s.w2.x},${s.w2.y}) ${s.w2.st} ${s.w2.stam}% | heat ${s.heat}${s.over ? ' [matchOver]' : ''}`
    );
    if (s.eventCount > lastEvents) {
        for (const e of await h.events(lastEvents)) console.log('  EVENT:', JSON.stringify(e));
        lastEvents = s.eventCount;
    }
}

await h.close();
