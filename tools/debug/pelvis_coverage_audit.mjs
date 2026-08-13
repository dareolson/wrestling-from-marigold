import { readFile } from 'node:fs/promises';

import { george } from '../../src/characters/george.js';
import { thesz } from '../../src/characters/thesz.js';
import { decodeRgbaPng } from '../wrestler-cutter/validate-source-manifest.mjs';

function diskCoverage(image, point, radius = 12) {
    let opaque = 0, total = 0;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        total++;
        const x = Math.round(point.u * image.w + dx), y = Math.round(point.v * image.h + dy);
        if (x >= 0 && x < image.w && y >= 0 && y < image.h && image.alpha[y * image.w + x] > 10) opaque++;
    }
    return Math.round(opaque / total * 1000) / 10;
}

async function png(character, file) {
    return decodeRgbaPng(await readFile(new URL(`../../src/assets/wrestlers/${character}/${file}`, import.meta.url)));
}

const georgeTorso = await png('george', 'torso.png');
const georgePatch = await png('george', 'pelvis_overlay.png');
const hips = george.textures.rigProfile.sockets;
console.log('George hip-disk alpha (torso / legacy pelvisOverlay):');
for (const name of ['nearHip', 'farHip']) {
    console.log(`  ${name}: ${diskCoverage(georgeTorso, hips[name])}% / ${diskCoverage(georgePatch, hips[name])}%`);
}
console.log('  Runtime semantics: pelvisOverlay depth is between far and near thighs; it is neither a behind-both underlay nor an above-both front mask.');

const louTorso = await png('thesz', 'torso.png');
console.log(`Lou torso: ${louTorso.w}x${louTorso.h}; explicit hip sockets: ${!!(thesz.textures.rigProfile?.sockets?.nearHip && thesz.textures.rigProfile?.sockets?.farHip)}`);
console.log('  Lou cannot run the production pelvis sweep until anatomical nearHip/farHip sockets and a declared coverage region are authored.');
