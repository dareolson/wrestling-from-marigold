// Scale the generated whole canvas to the base forearm, then restore the binding end byte-for-byte.
// Rows 0-244 come from forearm.png as raw decoded PNG bytes (Node zlib, no canvas round trip);
// rows 245-259 blend base -> generated; rows 260+ are the generated, canvas-scaled pixels.
// Needs only playwright-core (to scale the generated image). Check: node tools/debug/build_george_grip.mjs --check
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
const root = 'Sprite sheets/AI Pilot/George/articulation-donors/2026-10-26-forearm-grip-v1';
const base = 'src/assets/wrestlers/george-roster-v1/forearm.png';
const out = 'src/assets/wrestlers/george-roster-v1/forearm_grip.png';
const KEEP = 245, BLEND = 15;

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function decodePng(file) {
  const b = readFileSync(file);
  let p = 8, w, h, idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('latin1', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); if (d[8] !== 8 || d[9] !== 6 || d[12] !== 0) throw new Error('need 8-bit RGBA non-interlaced: ' + file); }
    if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * 4, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? px[y * stride + i - 4] : 0, up = y ? px[(y - 1) * stride + i] : 0, c = i >= 4 && y ? px[(y - 1) * stride + i - 4] : 0;
      const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c);
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      px[y * stride + i] = (src[i] + [0, a, up, (a + up) >> 1, paeth][f]) & 255;
    }
  }
  return { w, h, px };
}
function encodePng({ w, h, px }) {
  const stride = w * 4, raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'latin1'), l = Buffer.alloc(4), c = Buffer.alloc(4);
    l.writeUInt32BE(data.length); c.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([l, t, data, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function diffRows(a, b, rows) {
  let n = 0; const end = rows * a.w * 4;
  for (let i = 0; i < end; i++) if (a.px[i] !== b.px[i]) n++;
  return n;
}

const orig = decodePng(base);
if (process.argv.includes('--check')) {
  const g = decodePng(out);
  console.log({ width: g.w, height: g.h, differingBytesRows0to244: diffRows(orig, g, KEEP) });
  process.exit(0);
}
const url = p => 'data:image/png;base64,' + readFileSync(p).toString('base64');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const scaled = await page.evaluate(async ({ donor, width, height }) => {
    const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = donor; });
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, width, height);
    return Array.from(x.getImageData(0, 0, width, height).data);
  }, { donor: url(root + '/generated-source.png'), width: orig.w, height: orig.h });
  const gen = Buffer.from(scaled), px = Buffer.alloc(orig.px.length), stride = orig.w * 4;
  for (let y = 0; y < orig.h; y++) for (let i = 0; i < stride; i++) {
    const j = y * stride + i, w = Math.max(0, Math.min(1, (y - KEEP) / BLEND));
    px[j] = y < KEEP ? orig.px[j] : Math.round(orig.px[j] * (1 - w) + gen[j] * w);
  }
  const png = encodePng({ w: orig.w, h: orig.h, px });
  const result = { width: orig.w, height: orig.h, changedBytesAbove245: diffRows(orig, { w: orig.w, px }, KEEP) };
  writeFileSync(root + '/forearm-grip-donor-v1.png', png);
  writeFileSync(out, png);
  writeFileSync(root + '/validation.json', JSON.stringify(result, null, 2) + '\n');
  console.log(result);
} finally { await browser.close(); }
