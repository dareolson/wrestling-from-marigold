import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const vite = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url));
const port = 5196;
const url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
let serverFailure = null;
server.stdout.setEncoding('utf8');
server.stderr.setEncoding('utf8');
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
server.on('error', error => { serverFailure = error; });
server.on('exit', (code, signal) => {
    if (code && code !== 0) serverFailure = new Error(`Vite exited ${code}${signal ? ` (${signal})` : ''}`);
});

try {
    const deadline = Date.now() + 15000;
    let ready = false;
    while (Date.now() < deadline) {
        try {
            if ((await fetch(url)).ok) { ready = true; break; }
        } catch { /* retry */ }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!ready) {
        const detail = [serverFailure?.message, serverOutput.trim()].filter(Boolean).join('\n');
        throw new Error(`Dev server never came up at ${url}${detail ? `\n${detail}` : ''}`);
    }

    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${url}/tools/wrestler-cutter/canonical-sheet.html`);
    await page.waitForFunction(() => window.__CANONICAL_SHEET?.layout().occupiedCells.length === 95);
    const result = await page.evaluate(async () => {
        const tool = window.__CANONICAL_SHEET;
        const layout = tool.layout();
        const first = layout.occupiedCells[0];
        const profileTorso = layout.occupiedCells[38];
        const last = layout.occupiedCells[94];
        const blob = await tool.guideBlob();
        const cleanBlob = await tool.cleanBlob();
        const cleanBitmap = await createImageBitmap(cleanBlob);
        const cleanProbe = document.createElement('canvas');
        cleanProbe.width = 1; cleanProbe.height = 1;
        cleanProbe.getContext('2d').drawImage(cleanBitmap, 2048, 2048, 1, 1, 0, 0, 1, 1);
        const cleanPixel = [...cleanProbe.getContext('2d').getImageData(0, 0, 1, 1).data];
        cleanBitmap.close();
        const ctx = tool.canvas().getContext('2d');
        const alphaAt = (x, y) => ctx.getImageData(x, y, 1, 1).data[3];
        const manifest = tool.manifest();
        const frontPanel = manifest.sourceSheet.masterPanels.front;
        const frontMarks = manifest.views.front.masterLandmarks;
        const frontTorso = layout.occupiedCells.find(cell => cell.view === 'front' && cell.slot === 'torso');
        const frontUpperArm = layout.occupiedCells.find(cell => cell.view === 'front' && cell.slot === 'upperArm');
        const anchors = (view, part) => ({
            ...manifest.parts[part].anchors,
            ...(manifest.views[view].anchorOverrides?.[part] ?? {}),
        });
        const torsoAnchors = anchors('front', 'torso');
        const upperArmAnchors = anchors('front', 'upperArm');
        const masterMid = {
            x: frontPanel.x + (frontMarks.crown.x + frontMarks.neck.x) / 2,
            y: frontPanel.y + (frontMarks.crown.y + frontMarks.neck.y) / 2,
        };
        const cellPoint = (cell, point) => ({ x: cell.exportRect.x + point.x, y: cell.exportRect.y + point.y });
        return {
            canvas: { w: tool.canvas().width, h: tool.canvas().height },
            masters: layout.masterPanels.map(panel => panel.view),
            occupied: layout.occupiedCells.length,
            reserved: layout.reservedCells.map(cell => cell.index),
            first: { view: first.view, slot: first.slot, exportRect: first.exportRect },
            profileTorso: { view: profileTorso.view, slot: profileTorso.slot },
            last: { view: last.view, slot: last.slot },
            blob: { type: blob.type, size: blob.size },
            cleanBlob: { type: cleanBlob.type, size: cleanBlob.size, pixel: cleanPixel },
            guideStats: layout.guideStats,
            allRectsInsideCells: layout.occupiedCells.every(cell => {
                const m = cell.macro, r = cell.exportRect;
                return r.x >= m.x && r.y >= m.y
                    && r.x + r.w <= m.x + m.w && r.y + r.h <= m.y + m.h;
            }),
            guidePixels: {
                masterBone: alphaAt(masterMid.x, masterMid.y),
                torsoAxis: alphaAt(...Object.values(cellPoint(frontTorso, torsoAnchors.spineAxis))),
                neckCore: alphaAt(...Object.values(cellPoint(frontTorso, torsoAnchors.neck))),
                torsoShoulderCoverage: alphaAt(...Object.values(cellPoint(frontTorso, torsoAnchors.leftShoulder))),
                pelvisHipSweep: alphaAt(...Object.values(cellPoint(frontTorso, torsoAnchors.leftHip))),
                upperArmCore: alphaAt(...Object.values(cellPoint(frontUpperArm, upperArmAnchors.shoulder))),
            },
        };
    });
    await browser.close();

    if (errors.length) throw new Error(errors.join('\n'));
    if (result.canvas.w !== 4096 || result.canvas.h !== 4096) throw new Error('master canvas is not 4096×4096');
    if (result.masters.join(',') !== 'front,front3q,profile,back3q,back') throw new Error('five master panels are not registered');
    if (result.occupied !== 95 || result.reserved.join(',') !== '95') throw new Error('production/reserved cell registry is wrong');
    if (result.first.view !== 'front' || result.first.slot !== 'torso') throw new Error('first production cell is wrong');
    if (JSON.stringify(result.first.exportRect) !== JSON.stringify({ x: 193, y: 1310, w: 190, h: 260 })) throw new Error('first exact export rectangle is wrong');
    if (result.profileTorso.view !== 'profile' || result.profileTorso.slot !== 'torso') throw new Error('profile registry offset is wrong');
    if (result.last.view !== 'back' || result.last.slot !== 'boot.toePoint') throw new Error('last production cell is wrong');
    if (!result.allRectsInsideCells) throw new Error('an exact export rectangle escapes its registered macro-cell');
    if (Object.values(result.guidePixels).some(alpha => alpha === 0)) throw new Error('master bone, part axis, or opaque-core guide is missing');
    const expectedGuideStats = {
        overlapZones: 120, overlapHalves: 240,
        pelvisRoundedBounds: 5, hipCoverageDisks: 10, hipSweepDisks: 10,
        neckCoverageDisks: 5, shoulderCoverageDisks: 10, shoulderSweepDisks: 10,
    };
    if (JSON.stringify(result.guideStats) !== JSON.stringify(expectedGuideStats)) {
        throw new Error(`authoring guide registry is incomplete: ${JSON.stringify(result.guideStats)}`);
    }
    if (result.blob.type !== 'image/png' || result.blob.size < 10000) throw new Error('guide PNG did not encode');
    if (result.cleanBlob.type !== 'image/png' || result.cleanBlob.size === 0) throw new Error('blank clean PNG did not encode');
    if (result.cleanBlob.pixel.some(channel => channel !== 0)) throw new Error('blank clean PNG is not transparent RGB 0');
    console.log('canonical sheet smoke passed: 4096 master, 5 skeleton panels, 95 exact cells, 120 overlap zones, pelvis/shoulder coverage, separate guide/blank-clean PNGs');
} finally {
    server.kill('SIGTERM');
}
