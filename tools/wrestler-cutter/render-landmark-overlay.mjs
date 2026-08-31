#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '../..');
const DEFAULT_MANIFEST = path.join(SCRIPT_DIR, 'templates/rig-source-manifest.v2.example.json');
const DEFAULT_SHEET = path.resolve(ROOT,
    'Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v3.png');
const DEFAULT_OUTPUT = path.resolve(ROOT,
    'Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v7-profile-foot-guide.png');
const PORT = 5197;

const args = process.argv.slice(2);
const manifestPath = path.resolve(args.find(arg => arg.endsWith('.json')) ?? DEFAULT_MANIFEST);
const pngArgs = args.filter(arg => arg.endsWith('.png'));
const sheetPath = path.resolve(pngArgs[0] ?? DEFAULT_SHEET);
const outputPath = path.resolve(pngArgs[1] ?? DEFAULT_OUTPUT);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const relativeSheet = path.relative(ROOT, sheetPath).split(path.sep).map(encodeURIComponent).join('/');
if (relativeSheet.startsWith('..')) throw new Error('source sheet must be inside the repository for deterministic rendering');

const vite = path.resolve(ROOT, 'node_modules/vite/bin/vite.js');
const server = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
server.stdout.setEncoding('utf8');
server.stderr.setEncoding('utf8');
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });

try {
    const baseUrl = `http://127.0.0.1:${PORT}`;
    const deadline = Date.now() + 15000;
    while (true) {
        try { if ((await fetch(baseUrl)).ok) break; } catch { /* retry */ }
        if (Date.now() > deadline) throw new Error(`Vite did not start\n${serverOutput}`);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
    await page.setContent('<style>html,body{margin:0;background:transparent}</style><canvas id="overlay" width="4096" height="4096"></canvas>');
    await page.evaluate(async ({ manifest, sourceUrl }) => {
        const canvas = document.querySelector('#overlay');
        const ctx = canvas.getContext('2d');
        const source = new Image();
        source.src = sourceUrl;
        await source.decode();
        ctx.drawImage(source, 0, 0);
        const bones = [
            ['crown', 'neck'], ['neck', 'leftShoulder'], ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
            ['neck', 'rightShoulder'], ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'],
            ['neck', 'leftHip'], ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'], ['leftAnkle', 'leftSole'],
            ['neck', 'rightHip'], ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'], ['rightAnkle', 'rightSole'],
        ];
        const radii = { neck: 8, Shoulder: 12, Elbow: 10, Wrist: 8, Hip: 12, Knee: 10, Ankle: 8 };
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const viewName of manifest.sourceSheet.productionGrid.viewOrder) {
            const panel = manifest.sourceSheet.masterPanels[viewName];
            const marks = manifest.views[viewName].masterLandmarks;
            ctx.save();
            ctx.translate(panel.x, panel.y);
            ctx.strokeStyle = 'rgba(64, 224, 255, 0.9)';
            ctx.lineWidth = 3;
            for (const [from, to] of bones) {
                ctx.beginPath(); ctx.moveTo(marks[from].x, marks[from].y); ctx.lineTo(marks[to].x, marks[to].y); ctx.stroke();
            }
            for (const [name, mark] of Object.entries(marks)) {
                const suffix = Object.keys(radii).find(key => name === key || name.endsWith(key));
                const radius = radii[suffix] ?? 5;
                ctx.fillStyle = 'rgba(255, 55, 105, 0.32)';
                ctx.strokeStyle = '#ff3769';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(mark.x, mark.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#fff4f7';
                ctx.font = '10px ui-monospace, monospace';
                ctx.fillText(name, mark.x + radius + 3, mark.y - 5);
            }
            ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(8, 8, 270, 24);
            ctx.fillStyle = '#55d9ff'; ctx.font = 'bold 15px ui-monospace, monospace';
            ctx.fillText(`${viewName.toUpperCase()} · ANKLE REFIT`, 16, 25);
            ctx.restore();
        }
    }, { manifest, sourceUrl: `${baseUrl}/${relativeSheet}` });
    await page.locator('#overlay').screenshot({ path: outputPath, omitBackground: true });
    await browser.close();
    console.log(`rendered landmark overlay ${outputPath}`);
} finally {
    server.kill('SIGTERM');
}
