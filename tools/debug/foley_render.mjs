// Render the match foley (CrowdAudio.impact) offline over the crowd bed and
// save WAVs for audition, with peak/RMS figures. Expects the dev server.
//   node tools/debug/foley_render.mjs <outDir>
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.goto((process.env.WFM_URL ?? 'http://127.0.0.1:5173') + '/tools/move-editor/');
const result = await page.evaluate(async () => {
    const { default: CrowdAudio } = await import('/src/CrowdAudio.js');
    const rate = 44100, render = async (fn, seconds) => {
        const ctx = new OfflineAudioContext(1, rate * seconds, rate);
        const Real = window.AudioContext;
        window.AudioContext = function () { return ctx; };
        const crowd = new CrowdAudio(); crowd.start(); crowd.setHeat(0.4);
        window.AudioContext = Real;
        fn(crowd, ctx);
        const buf = await ctx.startRendering();
        return Array.from(buf.getChannelData(0));
    };
    // impact() schedules at ctx.currentTime, which is 0 offline, so shift
    // each sound by suspending: render each kind in its own pass at t=0.3.
    const kinds = { mat: ['mat', 1.0], strike: ['strike', 0.6], kick: ['kick', 0.9], bed: null };
    const res = {};
    for (const [name, args] of Object.entries(kinds)) {
        res[name] = await render((crowd, ctx) => {
            if (args) ctx.suspend(0.3).then(() => { crowd.impact(...args); ctx.resume(); });
        }, 1.3);
    }
    return res;
});
const wav = samples => {
    const n = samples.length, b = Buffer.alloc(44 + n * 2);
    b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
    b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28);
    b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
    samples.forEach((v, i) => b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), 44 + i * 2));
    return b;
};
const db = x => (20 * Math.log10(Math.max(x, 1e-9))).toFixed(1);
const bedRms = Math.sqrt(result.bed.slice(0, 44100).reduce((t, v) => t + v * v, 0) / 44100);
for (const [name, s] of Object.entries(result)) {
    writeFileSync(`${out}/${name}.wav`, wav(s));
    const win = s.slice(Math.round(0.3 * 44100), Math.round(0.6 * 44100));
    const peak = Math.max(...win.map(Math.abs));
    const rms = Math.sqrt(win.reduce((t, v) => t + v * v, 0) / win.length);
    console.log(`${name.padEnd(6)} peak ${db(peak)} dBFS, rms(0.3-0.6s) ${db(rms)} dBFS, ${name === 'bed' ? '' : `${(20 * Math.log10(rms / bedRms)).toFixed(1)} dB over the crowd bed`}`);
}
await browser.close();
