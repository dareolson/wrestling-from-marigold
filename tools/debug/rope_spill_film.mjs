// PLAN_ROPES TS.4: side-by-side mp4s, old (left) | rope spill (right), from the frame folders rope_order_probe.mjs --spillfilm wrote. System Chrome encodes (MediaRecorder, H.264), 30 fps, normal speed.
//   node tools/debug/rope_spill_film.mjs <offDir> <onDir> <outDir>   -> <outDir>/<name>.mp4 + <outDir>/index.html
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
const [offDir, onDir, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const names = JSON.parse(readFileSync(join(onDir, 'index.json'))).map(e => e.name);
const srv = createServer((req, res) => { try { const p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') { res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>enc</title>'); return; } const f = p.startsWith('/off/') ? join(offDir, p.slice(5)) : p.startsWith('/on/') ? join(onDir, p.slice(4)) : null; if (!f) { res.writeHead(404).end(); return; } res.writeHead(200, { 'content-type': 'image/jpeg', 'access-control-allow-origin': '*' }).end(readFileSync(f)); } catch { res.writeHead(404).end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ channel: 'chrome' }), page = await browser.newPage();
await page.goto(`http://localhost:${port}/`);
const mime = await page.evaluate(() => ['video/mp4;codecs=avc1.42E01E', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t)) ?? null);
if (!mime) { console.error('no H.264 MediaRecorder in this Chrome'); process.exit(1); }
const rows = [];
for (const name of names) {
    const n = Math.min(readdirSync(join(offDir, name)).length, readdirSync(join(onDir, name)).length);
    const b64 = await page.evaluate(async ({ name, n, port, mime }) => {
        const load = src => new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = no; i.src = src; });
        const pad = i => String(i).padStart(4, '0'), first = await load(`/off/${name}/f0000.jpg`), w = first.width, h = first.height;
        const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h + 22; const cx = cv.getContext('2d');
        const stream = cv.captureStream(30), rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6e6 }), chunks = [];
        rec.ondataavailable = e => chunks.push(e.data);
        const done = new Promise(r => { rec.onstop = r; });
        rec.start();
        for (let i = 0; i < n; i++) {
            const [a, b] = await Promise.all([load(`/off/${name}/f${pad(i)}.jpg`), load(`/on/${name}/f${pad(i)}.jpg`)]);
            cx.fillStyle = '#16161a'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(a, 0, 22); cx.drawImage(b, w, 22);
            cx.fillStyle = '#ddd'; cx.font = '14px system-ui'; cx.fillText('old', 8, 15); cx.fillText('?ropeSpill=v1', w + 8, 15);
            await new Promise(r => setTimeout(r, 1000 / 30));
        }
        rec.stop(); await done;
        const blob = new Blob(chunks, { type: mime }), buf = new Uint8Array(await blob.arrayBuffer());
        let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        return btoa(s);
    }, { name, n, port, mime });
    writeFileSync(join(outDir, `${name}.mp4`), Buffer.from(b64, 'base64')); rows.push({ name, n }); console.log(`[film] ${name}.mp4 (${n} frames)`);
}
await browser.close(); srv.close();
writeFileSync(join(outDir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rope spill footage</title>
<style>body{font:14px system-ui;background:#16161a;color:#ddd;margin:16px}video{width:100%;max-width:1320px;display:block;margin-bottom:18px}h3{margin:14px 0 4px;font-size:14px}</style>
<h1>Rope spill: old | ?ropeSpill=v1 (30 fps, normal speed)</h1>${rows.map(r => `<h3>${r.name}</h3><video src="${r.name}.mp4" controls loop muted playsinline></video>`).join('')}`);
console.log('wrote', join(outDir, 'index.html'));
