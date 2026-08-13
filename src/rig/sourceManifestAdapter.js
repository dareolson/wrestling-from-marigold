const FILE_KEYS = Object.freeze({
    head: 'head', torso: 'torso', upperArm: 'upper_arm', forearm: 'forearm',
    hand: 'hand', thigh: 'thigh', shin: 'shin', boot: 'boot',
});

function frac(point, canvas) {
    return { u: point.x / canvas.w, v: point.y / canvas.h };
}

function segmentEntry(manifest, partName, proximalName, distalName, keyPrefix) {
    const part = manifest.parts[partName];
    return {
        key: `${keyPrefix}_${FILE_KEYS[partName]}`,
        box: { ...part.canvas },
        binding: {
            proximal: frac(part.anchors[proximalName], part.canvas),
            ...(distalName ? { distal: frac(part.anchors[distalName], part.canvas) } : {}),
        },
    };
}

// Converts the production source contract directly into Skeleton's runtime
// contract. This is the only translation seam: cutter/tuner coordinates stay
// in export pixels, while rendering consumes normalized anchors.
export function sourceManifestToTextures(manifest, keyPrefix = manifest.characterId) {
    const parts = manifest.parts;
    const textures = {
        head: `${keyPrefix}_head`,
        torso: {
            key: `${keyPrefix}_torso`,
            box: { w: 112 * parts.torso.canvas.w / parts.torso.canvas.h, h: 112 },
        },
        upperArm: segmentEntry(manifest, 'upperArm', 'shoulder', 'elbow', keyPrefix),
        forearm: segmentEntry(manifest, 'forearm', 'elbow', 'wrist', keyPrefix),
        hand: {
            ...segmentEntry(manifest, 'hand', 'wrist', null, keyPrefix),
            displayScale: 25 / parts.hand.canvas.h,
            semanticAnchors: { contact: frac(parts.hand.anchors.contact, parts.hand.canvas) },
        },
        thigh: segmentEntry(manifest, 'thigh', 'hip', 'knee', keyPrefix),
        shin: segmentEntry(manifest, 'shin', 'knee', 'ankle', keyPrefix),
        boot: {
            ...segmentEntry(manifest, 'boot', 'ankle', null, keyPrefix),
            displayScale: 25 / parts.boot.canvas.h,
            semanticAnchors: { sole: frac(parts.boot.anchors.sole, parts.boot.canvas) },
        },
        headAnchorFrac: frac(parts.head.anchors.neck, parts.head.canvas),
        rigProfile: {
            sockets: Object.fromEntries(Object.entries(parts.torso.anchors)
                .map(([name, point]) => [name, frac(point, parts.torso.canvas)])),
        },
        variants: {},
    };
    const torsoBox = textures.torso.box;
    if (parts.pelvisUnderlay) {
        textures.pelvisUnderlay = { key: `${keyPrefix}_pelvis_underlay`, box: { ...torsoBox } };
    }
    if (parts.pelvisMask) {
        textures.pelvisMask = { key: `${keyPrefix}_pelvis_mask`, box: { ...torsoBox } };
    }

    for (const family of ['hand', 'boot']) {
        for (const side of ['near', 'far']) {
            const slot = `${side}${family[0].toUpperCase()}${family.slice(1)}`;
            textures.variants[slot] = {};
            for (const variant of manifest.variantFamilies?.[family] ?? []) {
                const contactName = family === 'hand' ? 'contact' : 'sole';
                textures.variants[slot][variant.id] = {
                    key: `${keyPrefix}_${side}_${FILE_KEYS[family]}_${variant.id}`,
                    file: variant.file ?? `${FILE_KEYS[family]}_${variant.id}.png`,
                    box: { ...variant.canvas },
                    binding: { proximal: frac(variant.anchors[family === 'hand' ? 'wrist' : 'ankle'], variant.canvas) },
                    semanticAnchors: { [contactName]: frac(variant.anchors[contactName], variant.canvas) },
                    displayScale: 25 / variant.canvas.h,
                };
            }
        }
    }
    return textures;
}
