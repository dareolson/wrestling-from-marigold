export const BASE_PART_FILES = Object.freeze({
    head: 'head.png',
    torso: 'torso.png',
    pelvisOverlay: 'pelvis_overlay.png',
    pelvisUnderlay: 'pelvis_underlay.png',
    pelvisMask: 'pelvis_mask.png',
    upperArm: 'upper_arm.png',
    forearm: 'forearm.png',
    thigh: 'thigh.png',
    shin: 'shin.png',
    nearShin: 'near_shin.png',
    farShin: 'far_shin.png',
    nearForearm: 'near_forearm.png',
    farForearm: 'far_forearm.png',
    hand: 'hand.png',
    boot: 'boot.png',
});

export const RENDER_PART_SLOTS = Object.freeze([
    'head', 'torso', 'pelvisOverlay', 'pelvisUnderlay', 'pelvisMask',
    'nearUpperArm', 'farUpperArm', 'nearForearm', 'farForearm',
    'nearHand', 'farHand',
    'nearThigh', 'farThigh', 'nearShin', 'farShin',
    'nearBoot', 'farBoot',
]);

const SLOT_BASE_KEYS = Object.freeze({
    head: ['head'],
    torso: ['torso'],
    pelvisOverlay: ['pelvisOverlay'],
    pelvisUnderlay: ['pelvisUnderlay'],
    pelvisMask: ['pelvisMask'],
    nearUpperArm: ['nearUpperArm', 'upperArm'],
    farUpperArm: ['farUpperArm', 'upperArm'],
    nearForearm: ['nearForearm', 'forearm'],
    farForearm: ['farForearm', 'forearm'],
    nearHand: ['nearHand', 'hand'],
    farHand: ['farHand', 'hand'],
    nearThigh: ['nearThigh', 'thigh'],
    farThigh: ['farThigh', 'thigh'],
    nearShin: ['nearShin', 'shin'],
    farShin: ['farShin', 'shin'],
    nearBoot: ['nearBoot', 'boot'],
    farBoot: ['farBoot', 'boot'],
});

const SLOT_VARIANT_FAMILY = Object.freeze({
    nearUpperArm: 'upperArm', farUpperArm: 'upperArm',
    nearForearm: 'forearm', farForearm: 'forearm',
    nearHand: 'hand', farHand: 'hand',
    nearThigh: 'thigh', farThigh: 'thigh',
    nearShin: 'shin', farShin: 'shin',
    nearBoot: 'boot', farBoot: 'boot',
});

const SHARED_VARIANT_FAMILIES = new Set([
    'upperArm', 'forearm', 'hand', 'thigh', 'shin', 'boot',
]);

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function textureKey(entry) {
    return typeof entry === 'string' ? entry : entry?.key;
}

export function baseEntryForSlot(textures, slot) {
    for (const key of SLOT_BASE_KEYS[slot] ?? [slot]) {
        if (textures[key]) return textures[key];
    }
    return null;
}

// A variant only needs to declare a texture key and file. Geometry omitted
// from it inherits from the calibrated base part, which makes expression,
// fist/grip-forearm, and bent-boot/shin swaps cheap and safe. A genuinely
// different cut may override box/anchors explicitly.
export function mergeVariantEntry(baseEntry, variantEntry) {
    if (!variantEntry) return baseEntry;
    if (typeof variantEntry === 'string') {
        if (isObject(baseEntry)) return { ...baseEntry, key: variantEntry };
        return variantEntry;
    }
    if (!isObject(variantEntry)) return baseEntry;
    const base = isObject(baseEntry) ? baseEntry : {};
    return {
        ...base,
        ...variantEntry,
        box: variantEntry.box ?? base.box,
        distalAnchorFrac: variantEntry.distalAnchorFrac ?? base.distalAnchorFrac,
        soleAnchorFrac: variantEntry.soleAnchorFrac ?? base.soleAnchorFrac,
        binding: variantEntry.binding ?? base.binding,
        semanticAnchors: variantEntry.semanticAnchors ?? base.semanticAnchors,
        displayScale: variantEntry.displayScale ?? base.displayScale,
    };
}

export function resolvePartSelection(textures, selection = {}) {
    const variants = textures.variants ?? {};
    const resolved = {};
    for (const slot of RENDER_PART_SLOTS) {
        const base = baseEntryForSlot(textures, slot);
        const requested = selection[slot] ?? 'base';
        const family = SLOT_VARIANT_FAMILY[slot];
        const variant = requested === 'base' ? null
            : variants[slot]?.[requested] ?? variants[family]?.[requested];
        resolved[slot] = mergeVariantEntry(base, variant);
    }
    return resolved;
}

// Produces the single source of truth used by Phaser preload and the CLI
// validator. Variant files are explicit because their names are content, not
// rig behavior; base filenames retain the existing convention.
export function enumerateCharacterAssets(character) {
    const root = character.assetRoot ?? `src/assets/wrestlers/${character.id}`;
    const assets = [];
    for (const [part, file] of Object.entries(BASE_PART_FILES)) {
        const entry = character.textures?.[part];
        const key = textureKey(entry);
        if (key) assets.push({ key, file: `${root}/${file}`, slot: part, variant: 'base' });
    }
    for (const [slot, variants] of Object.entries(character.textures?.variants ?? {})) {
        for (const [name, entry] of Object.entries(variants)) {
            const key = textureKey(entry);
            if (key && entry?.file) {
                assets.push({ key, file: `${root}/${entry.file}`, slot, variant: name });
            }
        }
    }
    return assets;
}

function validFrac(point) {
    return isObject(point)
        && Number.isFinite(point.u) && point.u >= 0 && point.u <= 1
        && Number.isFinite(point.v) && point.v >= 0 && point.v <= 1;
}

function sameFrac(a, b) {
    return a?.u === b?.u && a?.v === b?.v;
}

function sameBox(a, b) {
    return a?.w === b?.w && a?.h === b?.h;
}

export function validateCharacterArt(character) {
    const errors = [];
    const warnings = [];
    const textures = character?.textures;
    if (!character?.id) errors.push('character.id is required');
    if (!isObject(textures)) errors.push('character.textures must be an object');
    if (errors.length) return { ok: false, errors, warnings };

    const validateEntry = (entry, path) => {
        if (!entry || typeof entry === 'string') return;
        if (!textureKey(entry)) errors.push(`${path}.key is required`);
        if (entry.box !== undefined && (!isObject(entry.box)
            || !Number.isFinite(entry.box.w) || entry.box.w <= 0
            || !Number.isFinite(entry.box.h) || entry.box.h <= 0)) {
            errors.push(`${path}.box: expected positive {w,h}`);
        }
        if (entry.jointPivotFrac !== undefined
            && (!Number.isFinite(entry.jointPivotFrac) || entry.jointPivotFrac < 0 || entry.jointPivotFrac >= 1)) {
            errors.push(`${path}.jointPivotFrac must be in [0,1)`);
        }
        for (const anchor of ['distalAnchorFrac', 'soleAnchorFrac']) {
            if (entry[anchor] !== undefined && !validFrac(entry[anchor])) {
                errors.push(`${path}.${anchor}: expected normalized {u,v}`);
            }
        }
        if (entry.binding !== undefined) {
            const binding = entry.binding;
            if (!isObject(binding) || !validFrac(binding.proximal)
                || (binding.distal !== undefined && !validFrac(binding.distal))) {
                errors.push(`${path}.binding: expected normalized proximal and optional distal anchors`);
            }
        }
        if (entry.displayScale !== undefined
            && (!Number.isFinite(entry.displayScale) || entry.displayScale <= 0)) {
            errors.push(`${path}.displayScale must be a positive number`);
        }
        for (const [name, point] of Object.entries(entry.semanticAnchors ?? {})) {
            if (!validFrac(point)) errors.push(`${path}.semanticAnchors.${name}: expected normalized {u,v}`);
        }
    };

    for (const part of Object.keys(BASE_PART_FILES)) {
        if (textures[part]) validateEntry(textures[part], `textures.${part}`);
    }
    for (const [socket, point] of Object.entries(textures.rigProfile?.sockets ?? {})) {
        if (!validFrac(point)) errors.push(`rigProfile.sockets.${socket}: expected normalized {u,v}`);
    }

    for (const [slot, variants] of Object.entries(textures.variants ?? {})) {
        if (!RENDER_PART_SLOTS.includes(slot) && !SHARED_VARIANT_FAMILIES.has(slot)) {
            errors.push(`variants.${slot}: unknown render slot`);
            continue;
        }
        if (!isObject(variants)) {
            errors.push(`variants.${slot} must be an object`);
            continue;
        }
        const base = baseEntryForSlot(textures, slot);
        if (!base) errors.push(`variants.${slot}: no calibrated base part to inherit`);
        for (const [name, entry] of Object.entries(variants)) {
            if (name === 'base') errors.push(`variants.${slot}.base is reserved`);
            if (!textureKey(entry)) errors.push(`variants.${slot}.${name}: key is required`);
            if (!isObject(entry) || !entry.file) errors.push(`variants.${slot}.${name}: file is required`);
            validateEntry(entry, `variants.${slot}.${name}`);
            if (isObject(base) && isObject(entry)) {
                if (entry.box !== undefined && !sameBox(entry.box, base.box)) {
                    errors.push(`variants.${slot}.${name}.box must exactly match its base geometry`);
                }
                if (entry.displayScale !== undefined && entry.displayScale !== base.displayScale) {
                    errors.push(`variants.${slot}.${name}.displayScale must exactly match its base geometry`);
                }
                for (const anchorName of ['proximal', 'distal']) {
                    if (entry.binding?.[anchorName] !== undefined
                        && !sameFrac(entry.binding[anchorName], base.binding?.[anchorName])) {
                        errors.push(`variants.${slot}.${name}.binding.${anchorName} must exactly match its base geometry`);
                    }
                }
            }
        }
    }

    const keys = new Map();
    for (const asset of enumerateCharacterAssets(character)) {
        if (keys.has(asset.key)) {
            errors.push(`texture key "${asset.key}" is reused by ${keys.get(asset.key)} and ${asset.slot}.${asset.variant}`);
        } else {
            keys.set(asset.key, `${asset.slot}.${asset.variant}`);
        }
    }

    if (!textures.rigProfile?.sockets) {
        warnings.push('rigProfile.sockets is missing; legacy screen-space seating remains active');
    }
    return { ok: errors.length === 0, errors, warnings };
}
