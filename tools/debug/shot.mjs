// Grab a screenshot after N seconds of play (default 5).
//
//   npm run debug:shot             — tools/debug/shots/<timestamp>.png
//   npm run debug:shot -- 15       — after 15 seconds

import { launch } from './harness.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const seconds = Number(process.argv[2]) || 5;
const dir = fileURLToPath(new URL('./shots', import.meta.url));
fs.mkdirSync(dir, { recursive: true });

const h = await launch();
await h.page.waitForTimeout(seconds * 1000);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const path = `${dir}/${stamp}.png`;
await h.screenshot(path);
console.log(path);
await h.close();
