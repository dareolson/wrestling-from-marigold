import { W, H, RING, ringBoundsAtY } from '../constants.js';
import Wrestler from '../Wrestler.js';
import InputHandler from '../InputHandler.js';
import AIHandler from '../AIHandler.js';
import CrowdAudio from '../CrowdAudio.js';
import { george } from '../characters/george.js';
import { thesz } from '../characters/thesz.js';

// All characters whose PNGs should be preloaded
const CHARACTERS = [george, thesz];
const PART_FILES  = { head: 'head.png', torso: 'torso.png', upperArm: 'upper_arm.png', forearm: 'forearm.png', thigh: 'thigh.png', shin: 'shin.png' };

// Named crowd extras: each is one chroma-keyed multi-frame reference sheet
// cut via tools/audience-cutter into src/assets/audience/<slug>/frame1..N.png
// (not the wrestler rig pipeline — these are flat multi-frame sprites, not
// jointed body parts). `restFrame` is the idle texture (usually 1); reacting
// plays forward from restFrame through `frames` and back down, mirrored (see
// _reactCrowdExtras). `spots` place repeated instances of that one source
// design around the ring — x/h/flip/tint jitter so a single design doesn't
// read as an obvious clone row.
//
// `sizeBasis` picks what spot.h anchors to when frames are re-scaled
// (see _setExtraFrame): 'height' scales off the tallest frame — correct
// when the frames genuinely change height (oldman's sit→stand). 'width'
// scales off the resting frame's width instead, for extras that stay
// seated throughout — their raised-arm frames (and any per-sheet crop/
// scale drift between separately-cut source sheets) still vary in raw
// pixel height, and height-basis scaling would render that as growing
// taller, i.e. looking like she's standing up.
const CROWD_EXTRAS = [
    {
        // Sit→stand cutout. Planted right behind the ring (not the deep
        // background crowd) at a prominent "camera favorite" scale. Was 6
        // spots; the center one (x = W/2 - 40) was handed to elvis below —
        // Derek's call, since oldman repeats 6x and one fewer instance of
        // him isn't noticeable (see AI_HANDOFF.md 2026-07-15, fifth extra).
        slug: 'oldman',
        frames: 4,
        restFrame: 1,
        sizeBasis: 'height',
        spots: [
            { x: W / 2 - 260, h: 118, flip: false, tint: 0x554f45 },
            { x: W / 2 - 150, h: 132, flip: true,  tint: 0x625b4c },
            { x: W / 2 + 70,  h: 140, flip: true,  tint: 0x4f4a3f },
            { x: W / 2 + 190, h: 126, flip: false, tint: 0x6b6355 },
            { x: W / 2 + 300, h: 116, flip: true,  tint: 0x554f45 },
        ],
    },
    {
        // Seated cheer cycle, not a stand-up: frame1 is her resting seated
        // pose; frames 2-8 build clap → hands-up → fist-pump peak → settle
        // back down (order confirmed against the two source sheets, see
        // AI_HANDOFF.md 2026-07-15). First attempt flanked outside the
        // oldman row (x 220-780) at ±380 and Derek reported her essentially
        // invisible out there — the visible "core" of the front row is
        // that 220-780 span. Tucked her into the row's two open gaps
        // instead (between oldman spots 2-3 and 4-5), smaller/higher than
        // the oldman spots so she reads as sitting a touch further back,
        // peeking between them, rather than colliding shoulder-to-shoulder.
        slug: 'browndresslady',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        spots: [
            { x: W / 2 - 95,  h: 100, flip: false, tint: 0x625b4c },
            { x: W / 2 + 125, h: 96,  flip: true,  tint: 0x554f45 },
        ],
    },
    {
        // Seated throughout (frame1 calm w/ popcorn bucket; frames 2-4 eat,
        // frames 5-8 build to an open-mouth shout and a fist-pump peak with
        // popcorn flying — two source sheets, same merge pattern as
        // browndresslady). The remaining open gaps in the front row (see
        // browndresslady's note above) are outside oldman spots 1-2 and 5-6;
        // placed him there rather than flanking outside the 220-780 core span,
        // which read as invisible for browndresslady's first attempt.
        slug: 'popcornguy',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        spots: [
            { x: W / 2 - 205, h: 98,  flip: true,  tint: 0x6b6355 },
            { x: W / 2 + 245, h: 104, flip: false, tint: 0x5c5648 },
        ],
    },
    {
        // Seated throughout (frame1 calm w/ sunglasses + a sipped drink;
        // frames 2-4 sip and lose the sunglasses in surprise; frames 5-8
        // build to a full glass-raised, fist-pumping cheer — two source
        // sheets, same merge pattern as browndresslady/popcornguy).
        // Unlike those two, the front row's pair-of-gaps supply is used
        // up: oldman's 6 spots left exactly one ungapped seam (between
        // oldman 3-4, the center of the row) after browndresslady and
        // popcornguy took the other four. One spot only, in that seam,
        // rather than forcing a second instance out past the 220-780
        // core span where browndresslady's first flanking attempt read
        // as invisible. Unconfirmed guess like the last two — flag for
        // Derek's live check before calling it done.
        slug: 'marilyn',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        spots: [
            { x: W / 2 + 15, h: 102, flip: false, tint: 0x5c5648 },
        ],
    },
    {
        // Seated throughout, never stands (frame1 calm hands-folded rest;
        // frames 2-4 a subtle settle micro-loop; frames 5-8 legs spread
        // wider and one arm raises to a fist-pump peak — two source
        // sheets, same calm-then-build merge pattern as browndresslady/
        // popcornguy/marilyn; order was visually obvious from the QA
        // preview, no round-trip needed).
        //
        // Fifth extra — the front row's gap supply was already exhausted
        // (see marilyn's note above). Derek's call: rather than a new back
        // row or flanking outside the 220-780 core span (both previously
        // flagged as options, the latter known to read as invisible), took
        // over oldman's former center spot (x = W/2 - 40) since oldman
        // repeats 6x and losing one instance isn't noticeable — Derek also
        // wanted him seated right next to marilyn (x = W/2 + 15, just 55px
        // away), which this freed spot already sits immediately beside.
        slug: 'elvis',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        spots: [
            { x: W / 2 - 40, h: 122, flip: false, tint: 0x5c5648 },
        ],
    },
];

// Crowd reaction swell per match event type (0..1)
const POP_SIZES = {
    pinfall: 1.0, sleeperKO: 1.0, nearfall: 0.9, kickout: 0.6,
    knockdown: 0.55, ropeBreak: 0.5, sleeperEscape: 0.5, grappleBlock: 0.5,
    pinAttempt: 0.45, sleeperApplied: 0.4, dodge: 0.3, stagger: 0.25, move: 0.18,
};

export default class Arena extends Phaser.Scene {
    constructor() {
        super('Arena');
    }

    preload() {
        for (const char of CHARACTERS) {
            // Only load actual body-part textures — char.textures can also carry
            // non-file metadata (e.g. headScale) that isn't a loadable part.
            for (const part of Object.keys(PART_FILES)) {
                const entry = char.textures[part];
                if (!entry) continue;
                // entry is either a plain texture key or { key, box } (see
                // Skeleton.js's resolveTexEntry) — only the key is a load path.
                const key = typeof entry === 'string' ? entry : entry.key;
                this.load.image(key, `src/assets/wrestlers/${char.id}/${PART_FILES[part]}`);
            }
        }
        for (const extra of CROWD_EXTRAS) {
            for (let i = 1; i <= extra.frames; i++) {
                this.load.image(`${extra.slug}${i}`, `src/assets/audience/${extra.slug}/frame${i}.png`);
            }
        }
    }

    create() {
        this.drawArenaBackground();
        this.drawCrowd();
        this._setupCrowdExtras();
        this.drawSideCrowd();
        this.drawFarApronAndRopes();
        this.drawRingMat();
        this.drawNearApron();
        this._setupDynamicRopes();
        this.drawPosts();
        this.createScanlines();

        this.grainGfx = this.add.graphics().setDepth(60);

        this.flickerOverlay = this.add.graphics().setDepth(70);
        this.flickerOverlay.fillStyle(0xffffff, 1);
        this.flickerOverlay.fillRect(0, 0, W, H);
        this.flickerOverlay.setAlpha(0);

        try {
            const cam = this.cameras.main;
            const cm = cam.filters.internal.addColorMatrix();
            cm.colorMatrix.grayscale(1);
            cam.filters.external.addVignette(0.5, 0.5, 0.82, 0.45);
        } catch (e) {
            console.warn('Camera filters unavailable:', e.message);
        }

        // Debug time-scale (?ts=3): game dt, tween clocks, and delayed calls all
        // scale together so move timing stays in sync. For headless sims only —
        // makes big-N balance runs feasible (8-min matches at 2× headless slowdown
        // were taking ~16 wall-minutes each).
        this.timeScale = Number(new URLSearchParams(location.search).get('ts')) || 1;
        if (this.timeScale !== 1) {
            this.tweens.timeScale = this.timeScale;
            this.time.timeScale   = this.timeScale;
        }

        this.showTitleCard();
        this._setupGame();

        // HUD camera — renders meters/clock without the vignette so they stay
        // readable at the frame edges. Gets its own grayscale filter so the
        // colored stamina bars keep the B/W broadcast look. Objects created
        // after this point render on both cameras unless ignored on one.
        try {
            const hudObjects = [this.staminaGfx, this.heatGfx, this.heatLbl, this.clockLbl, this.p1ModeLbl, this.p2ModeLbl];
            this.hudCam = this.cameras.add(0, 0, W, H);
            const cmHud = this.hudCam.filters.internal.addColorMatrix();
            cmHud.colorMatrix.grayscale(1);
            this.hudCam.ignore(this.children.list.filter(o => !hudObjects.includes(o)));
            this.cameras.main.ignore(hudObjects);
        } catch (e) {
            console.warn('HUD camera unavailable:', e.message);
        }
    }

    drawArenaBackground() {
        const gfx = this.add.graphics().setDepth(0);
        gfx.fillStyle(0x0e0e0e, 1);
        gfx.fillRect(0, 0, W, H);

        // Arena light warming the upper half where the crowd sits
        gfx.fillStyle(0x222220, 1);
        gfx.fillRect(0, 0, W, 170);

        gfx.fillStyle(0x1a1a18, 1);
        gfx.fillRect(0, 170, W, 200);
    }

    drawCrowd() {
        const gfx = this.add.graphics().setDepth(1);

        let s = 7331;
        const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

        // r = 5ft person head radius at that depth (ring: 43px/ft near, ~0.37× at far stands)
        const rows = [
            { y: 248, r: 9,  count: 26, gap: 28, lum: 120 }, // floor-level seats behind far ropes
            { y: 222, r: 8,  count: 24, gap: 29, lum: 116 },
            { y: 196, r: 8,  count: 22, gap: 30, lum: 112 },
            { y: 170, r: 7,  count: 20, gap: 31, lum: 108 },
            { y: 152, r: 7,  count: 24, gap: 32, lum: 105 },
            { y: 134, r: 6,  count: 22, gap: 34, lum: 92  },
            { y: 117, r: 5,  count: 20, gap: 36, lum: 82  },
            { y: 101, r: 5,  count: 18, gap: 38, lum: 72  },
            { y: 86,  r: 4,  count: 16, gap: 42, lum: 64  },
            { y: 72,  r: 4,  count: 14, gap: 44, lum: 56  },
            { y: 59,  r: 3,  count: 13, gap: 48, lum: 50  },
            { y: 47,  r: 3,  count: 11, gap: 52, lum: 44  },
            { y: 36,  r: 2,  count: 10, gap: 56, lum: 38  },
            { y: 26,  r: 2,  count: 9,  gap: 60, lum: 32  },
            { y: 16,  r: 2,  count: 8,  gap: 65, lum: 26  },
        ];

        rows.forEach(row => {
            for (let j = 0; j < row.count; j++) {
                const t = j / (row.count - 1);
                const cx = 20 + t * 920 + (rand() - 0.5) * row.gap * 0.4;
                const heightFt = 4 + Math.floor(rand() * 3); // 4, 5, or 6ft person
                const r = row.r * heightFt / 5;
                const col = (row.lum << 16) | (row.lum << 8) | row.lum;
                gfx.fillStyle(col, 1);
                gfx.fillCircle(cx, row.y, r);
                gfx.fillEllipse(cx, row.y + r + r * 0.8, r * 2.6, r * 1.5);
            }
        });

        // Signs — lighter so they read against the crowd
        gfx.fillStyle(0x888888, 1);
        [[120, 95, 42, 20], [360, 78, 38, 18], [590, 85, 45, 22], [780, 72, 36, 17]].forEach(([x, y, w, h]) => {
            gfx.fillRect(x - w / 2, y - h / 2, w, h);
        });
    }

    // Test crowd: named audience members (CROWD_EXTRAS, each a multi-frame
    // cutout), repeated with enough variation (x spread, flip, size/tint
    // jitter) that a given design doesn't read as an obvious clone row —
    // but each IS one source design, so this is a ceiling-of-repetition
    // test, not a real varied crowd. Planted right behind the ring (not the
    // deep background crowd) at a prominent "camera favorite" scale. Depth
    // 1.5 sits below drawRingMat (depth 3); each one's ground line is set so
    // RING.farLeft.y (258 — the mat's crowd-side edge) crosses at the torso,
    // same occlusion mechanism the side-crowd rows use against the ring
    // boundary.
    _setupCrowdExtras() {
        this.crowdFans = [];
        for (const extra of CROWD_EXTRAS) {
            // Per-frame natural pixel dimensions — needed for both
            // sizeBasis modes, and because a seated extra's raised-arm
            // frames (or, across separately-cut source sheets, ordinary
            // crop/scale drift) naturally have a different bounding-box
            // height per frame even though the character never grows.
            extra._dims = {};
            for (let i = 1; i <= extra.frames; i++) {
                const src = this.textures.get(`${extra.slug}${i}`).getSourceImage();
                extra._dims[i] = { w: src.width, h: src.height };
            }
            for (const spot of extra.spots) {
                const fan = { img: this.add.image(spot.x, 0, `${extra.slug}${extra.restFrame}`)
                    .setOrigin(0.5, 1)
                    .setTint(spot.tint)
                    .setDepth(1.5), extra, spot, reacting: false };
                this._setExtraFrame(fan, extra.restFrame);
                this.crowdFans.push(fan);
            }
        }
    }

    // Sets a crowd extra instance to reference frame `f`, rescaling to match.
    // sizeBasis 'height' scales off the tallest frame — frame-to-frame
    // height growth is the point (oldman's sit→stand). sizeBasis 'width'
    // scales off the resting frame's width instead, pinning it constant
    // across frames — for an extra that stays seated throughout, letting
    // raised-arm frames vary in height (naturally, via their own aspect
    // ratio) without that height difference reading as her standing up.
    _setExtraFrame(fan, f) {
        const { extra, spot } = fan;
        const dims = extra._dims[f];
        let scale;
        if (extra.sizeBasis === 'width') {
            const rest = extra._dims[extra.restFrame];
            const targetW = spot.h * (rest.w / rest.h);
            scale = targetW / dims.w;
        } else {
            const refH = Math.max(...Object.values(extra._dims).map(d => d.h));
            scale = spot.h / refH;
        }
        const groundY = RING.farLeft.y + spot.h * 0.45; // ~torso-height occlusion by the mat
        fan.img.setTexture(`${extra.slug}${f}`)
            .setY(groundY)
            .setScale(spot.flip ? -scale : scale, scale);
    }

    // Plays a subset of the crowd fans forward through their reference
    // frames (from restFrame) and back down, each on its own random
    // delay/hold so they don't move in lockstep — hooked off _logEvent so
    // they react to real match spots, not idle ticks.
    _reactCrowdExtras() {
        for (const fan of this.crowdFans) {
            if (fan.reacting) continue;
            if (Math.random() > 0.65) continue; // not everyone reacts to every spot
            fan.reacting = true;
            const up = Array.from({ length: fan.extra.frames }, (_, i) => i + 1);
            const down = up.slice(0, -1).reverse();
            const start = Math.random() * 300;
            const STEP = 130, HOLD = 1400 + Math.random() * 900;
            up.forEach((f, i) => this.time.delayedCall(start + i * STEP, () => this._setExtraFrame(fan, f)));
            const downStart = start + up.length * STEP + HOLD;
            down.forEach((f, i) => this.time.delayedCall(downStart + i * STEP, () => this._setExtraFrame(fan, f)));
            this.time.delayedCall(downStart + down.length * STEP, () => { fan.reacting = false; });
        }
    }

    drawSideCrowd() {
        const gfx = this.add.graphics().setDepth(10);
        const { nearLeft, nearRight, farLeft, farRight } = RING;

        let s = 9173;
        const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

        // At a given y, find the x boundary of the ring on each side
        const leftBoundary  = y => nearLeft.x  + (farLeft.x  - nearLeft.x)  * (nearLeft.y  - y) / (nearLeft.y  - farLeft.y);
        const rightBoundary = y => nearRight.x + (farRight.x - nearRight.x) * (nearRight.y - y) / (nearRight.y - farRight.y);

        // baseR = head radius for a 5ft person at that y, from ring perspective scale
        // (43px/ft at near edge y=445, 0.6× at far edge y=258; head ≈ 9" = 0.75ft, r = px_per_ft * 0.375)
        const sideRows = [
            { y: 430, baseR: 16 },
            { y: 400, baseR: 15 },
            { y: 368, baseR: 14 },
            { y: 335, baseR: 13 },
            { y: 302, baseR: 11 },
            { y: 270, baseR: 10 },
            { y: 240, baseR: 9  },
        ];

        sideRows.forEach(({ y, baseR }) => {
            const lx = leftBoundary(y);
            const rx = rightBoundary(y);
            const baseLum = Math.floor(58 + (y - 240) * 0.13);

            // Left flank — pack from ring edge toward left canvas edge,
            // leaving a ringside strip of bare floor (press row, photographers)
            // so the crowd doesn't read as pressed against the apron
            let x = lx - baseR * 3.4;
            while (x > -baseR) {
                const heightFt = 4 + Math.floor(rand() * 3); // 4, 5, or 6ft
                const r = Math.round(baseR * heightFt / 5);
                const jitter = (rand() - 0.5) * baseR * 0.5;
                const lum = Math.min(100, Math.floor(baseLum * (0.85 + rand() * 0.30)));
                const col = (lum << 16) | (lum << 8) | lum;
                gfx.fillStyle(col, 1);
                gfx.fillCircle(x + jitter, y, r);
                gfx.fillEllipse(x + jitter, y + r + r * 0.75, r * 2.4, r * 1.4);
                x -= r * 2.1 + rand() * r * 0.5;
            }

            // Right flank
            x = rx + baseR * 3.4;
            while (x < W + baseR) {
                const heightFt = 4 + Math.floor(rand() * 3);
                const r = Math.round(baseR * heightFt / 5);
                const jitter = (rand() - 0.5) * baseR * 0.5;
                const lum = Math.min(100, Math.floor(baseLum * (0.85 + rand() * 0.30)));
                const col = (lum << 16) | (lum << 8) | lum;
                gfx.fillStyle(col, 1);
                gfx.fillCircle(x + jitter, y, r);
                gfx.fillEllipse(x + jitter, y + r + r * 0.75, r * 2.4, r * 1.4);
                x += r * 2.1 + rand() * r * 0.5;
            }
        });

        // Foreground crowd — backs of heads, closest to camera, partially cropped
        const fgGfx = this.add.graphics().setDepth(11);

        // Second row of foreground (slightly further back, fully visible)
        const fgRow2 = [
            { x: 35,  r: 22, lum: 48 },
            { x: 118, r: 20, lum: 44 },
            { x: 200, r: 24, lum: 50 },
            { x: 288, r: 21, lum: 46 },
            { x: 375, r: 23, lum: 48 },
            { x: 460, r: 20, lum: 42 },
            { x: 548, r: 22, lum: 47 },
            { x: 635, r: 24, lum: 50 },
            { x: 720, r: 21, lum: 44 },
            { x: 808, r: 23, lum: 48 },
            { x: 892, r: 20, lum: 45 },
        ];

        fgRow2.forEach(({ x, r, lum }) => {
            const col = (lum << 16) | (lum << 8) | lum;
            const jitter = (rand() - 0.5) * 14;
            const y = H - r * 4.2;
            fgGfx.fillStyle(col, 1);
            fgGfx.fillCircle(x + jitter, y, r);
            fgGfx.fillEllipse(x + jitter, y + r + r * 0.7, r * 2.8, r * 1.6);
        });

        // Front row — largest, cropped just below shoulders
        const fgRow1 = [
            { x: 55,  r: 42, lum: 32 },
            { x: 168, r: 38, lum: 28 },
            { x: 278, r: 44, lum: 34 },
            { x: 390, r: 36, lum: 30 },
            { x: 490, r: 40, lum: 33 },
            { x: 595, r: 38, lum: 29 },
            { x: 700, r: 42, lum: 32 },
            { x: 810, r: 37, lum: 31 },
            { x: 910, r: 44, lum: 30 },
        ];

        fgRow1.forEach(({ x, r, lum }) => {
            const col = (lum << 16) | (lum << 8) | lum;
            const jitter = (rand() - 0.5) * 20;
            const y = H - r * 1.4;
            fgGfx.fillStyle(col, 1);
            fgGfx.fillCircle(x + jitter, y, r);
            fgGfx.fillEllipse(x + jitter, y + r * 0.5, r * 3.4, r * 2);
        });
    }

    drawFarApronAndRopes() {
        const gfx = this.add.graphics().setDepth(2);
        const { farLeft, farRight } = RING;

        gfx.fillStyle(0x909088, 1);
        gfx.fillRect(farLeft.x, farRight.y, farRight.x - farLeft.x, 16);
    }

    drawRingMat() {
        const gfx = this.add.graphics().setDepth(3);
        const { nearLeft, nearRight, farLeft, farRight } = RING;

        gfx.fillStyle(0xb0b0a8, 1);
        gfx.beginPath();
        gfx.moveTo(nearLeft.x, nearLeft.y);
        gfx.lineTo(nearRight.x, nearRight.y);
        gfx.lineTo(farRight.x, farRight.y);
        gfx.lineTo(farLeft.x, farLeft.y);
        gfx.closePath();
        gfx.fillPath();

        // Center seam
        const mnx = (nearLeft.x + nearRight.x) / 2;
        const mfx = (farLeft.x + farRight.x) / 2;
        gfx.lineStyle(1, 0xb0b0a8, 0.4);
        gfx.lineBetween(mnx, nearLeft.y, mfx, farLeft.y);

        // MWF logo circle
        const lx = (mnx + mfx) / 2;
        const ly = (nearLeft.y + farLeft.y) / 2 + 15;
        gfx.lineStyle(2, 0xb0b0a8, 0.5);
        gfx.strokeCircle(lx, ly, 38);
        gfx.lineStyle(1, 0xb0b0a8, 0.3);
        gfx.strokeCircle(lx, ly, 30);
    }

    drawNearApron() {
        const gfx = this.add.graphics().setDepth(6);
        const { nearLeft, nearRight, apronY } = RING;

        gfx.fillStyle(0xa0a098, 1);
        gfx.fillRect(nearLeft.x, nearLeft.y, nearRight.x - nearLeft.x, apronY - nearLeft.y);

        gfx.lineStyle(2, 0xb8b8b0, 1);
        gfx.lineBetween(nearLeft.x, apronY, nearRight.x, apronY);

        // MWF banner block on apron
        const mx = (nearLeft.x + nearRight.x) / 2;
        const my = nearLeft.y + (apronY - nearLeft.y) / 2;
        gfx.fillStyle(0x888880, 1);
        gfx.fillRect(mx - 55, my - 7, 110, 14);
    }

    _setupDynamicRopes() {
        // Near ropes sit between the camera and everything in the ring, so by
        // default they render above the deepest wrestler depth (12 + 445*0.03
        // = 25.35). They're banded by x — like the side ropes are banded by
        // depth — so when a wrestler is pressed into them, just the strands at
        // his back re-sort behind his body while the rest of the span keeps
        // crossing in front of the ring broadcast-style.
        this.nearRopeBands = [];
        for (let i = 0; i < 24; i++) {
            this.nearRopeBands.push(this.add.graphics().setDepth(25.5));
        }
        this.farRopeGfx  = this.add.graphics().setDepth(2);
        this.nearRopeSag = { val: 0, vel: 0 };
        this.farRopeSag  = { val: 0, vel: 0 };

        // Side ropes span the ring's whole depth, so no single depth value can
        // sort them against a wrestler standing mid-ring. Draw them in bands,
        // each depth-sorted with the wrestler formula (12 + groundY * 0.03) at
        // the band's ground position along the ring edge.
        this.sideRopeBands = [];
        const BANDS = 8;
        for (let i = 0; i < BANDS; i++) {
            const tMid    = (i + 0.5) / BANDS; // 0 = near corner → 1 = far corner
            const groundY = RING.nearLeft.y + (RING.farLeft.y - RING.nearLeft.y) * tMid;
            const g = this.add.graphics().setDepth(12 + groundY * 0.03);
            g._baseDepth = 12 + groundY * 0.03;
            this.sideRopeBands.push(g);
        }
    }

    // Wrestlers close enough to a rope wall press into it: 0 press at 34px
    // inside the plane, full press at the movement clamp (20px), so contact
    // peaks exactly where whip bounces, rope breaks, and cornered stalling
    // put a body. Airborne/held/climbing states don't press; grounded bodies
    // only reach the bottom strand.
    _ropePresses() {
        const SKIP = new Set(['climbing', 'onTurnbuckle', 'diving', 'grabbed',
                              'falling', 'flipping', 'slamming', 'dropkicking']);
        const LOW  = new Set(['down', 'gettingUp', 'possum', 'pinned',
                              'sleeping', 'pin', 'elbowDrop', 'elbowDropping']);
        const press = d => Math.min(1, Math.max(0, (34 - d) / 14));
        // near presses only feed the depth re-sort (horizontal ropes don't
        // deform — the toward-camera bow read badly); side presses also bow
        const out = { near: [], side: { '-1': [], 1: [] } };
        for (const w of [this.w1, this.w2]) {
            if (!w || SKIP.has(w.state)) continue;
            // per-strand weight bottom→top: an upright back bends the middle
            // and top ropes; a body on the mat only nudges the bottom one
            const wRope = LOW.has(w.state) ? [1, 0.15, 0] : [0.8, 1, 0.85];
            const depth = 12 + w.y * 0.03;
            const b = ringBoundsAtY(w.y);
            const t = (RING.nearLeft.y - w.y) / (RING.nearLeft.y - RING.farLeft.y);
            const kNear = press(RING.nearLeft.y - w.y);
            const kL    = press(w.x - b.left);
            const kR    = press(b.right - w.x);
            if (kNear) out.near.push({ x: w.x, k: kNear, depth, w: wRope });
            if (kL)    out.side[-1].push({ t, k: kL, depth, w: wRope });
            if (kR)    out.side[1].push({ t, k: kR, depth, w: wRope });
        }
        return out;
    }

    triggerRopeBounce(side) {
        const sag = side === 'far' ? this.farRopeSag : this.nearRopeSag;
        sag.vel += 90;
    }

    _updateRopes(dt) {
        const { nearLeft, nearRight, farLeft, farRight, ropes } = RING;

        for (const s of [this.nearRopeSag, this.farRopeSag]) {
            s.vel += (-s.val * 30 - s.vel * 8) * dt;
            s.val += s.vel * dt;
        }

        const farG = this.farRopeGfx;
        farG.clear();
        for (const b of this.nearRopeBands) b.clear();
        for (const b of this.sideRopeBands) b.clear();

        const ns = this.nearRopeSag.val;
        const fs = this.farRopeSag.val;

        // Local rope deformation: wrestlers pressed into a wall bow the
        // strands around their position with a smooth cosine falloff.
        const presses = this._ropePresses();
        const bump = (u, c, r) => {
            const q = Math.abs(u - c) / r;
            return q >= 1 ? 0 : 0.5 + 0.5 * Math.cos(q * Math.PI);
        };

        // Sample an arched rope as a polyline — sag peaks mid-span; warp(x)
        // adds local press deformation on top of the uniform sag
        const archPts = (x0, y0, x1, y1, sag, warp, segs = 24) => {
            const pts = [];
            for (let i = 0; i <= segs; i++) {
                const t = i / segs;
                const x = x0 + (x1 - x0) * t;
                pts.push({ x, y: y0 + (y1 - y0) * t + sag * Math.sin(t * Math.PI) + (warp ? warp(x) : 0) });
            }
            return pts;
        };

        // Crack-free ribbon: stroked polylines tear at the segment joints once
        // lines get thick (Graphics has no line joins) — fill one continuous
        // quad strip instead. halfW may be an array for tapered width.
        const ribbonEdges = (pts, halfW) => {
            const top = [], bot = [];
            for (let i = 0; i < pts.length; i++) {
                const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
                const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
                const hw = Array.isArray(halfW) ? halfW[i] : halfW;
                top.push({ x: pts[i].x + nx * hw, y: pts[i].y + ny * hw });
                bot.push({ x: pts[i].x - nx * hw, y: pts[i].y - ny * hw });
            }
            return { top, bot };
        };
        // Two passes: a slightly wider faint halo under the solid core fakes
        // the antialiasing the post-filter framebuffers throw away — without
        // it the rope edges stair-step, worst on the diagonal side ropes.
        const AA = 0.9;
        const drawStrip = (gfx, top, bot, color, alpha) => {
            gfx.fillStyle(color, alpha);
            gfx.fillPoints([...top, ...[...bot].reverse()], true);
        };
        const fillRibbon = (gfx, pts, halfW, color, alpha, hlColor) => {
            const grow = w => Array.isArray(w) ? w.map(v => v + AA) : w + AA;
            const halo = ribbonEdges(pts, grow(halfW));
            drawStrip(gfx, halo.top, halo.bot, color, alpha * 0.3);
            const core = ribbonEdges(pts, halfW);
            drawStrip(gfx, core.top, core.bot, color, alpha);
            // Arena light catches the top of the strand — a thin bright edge
            // keeps dark ropes readable where they cross the crowd shadows
            if (hlColor) {
                const shrink = w => Array.isArray(w)
                    ? w.map(v => v - Math.max(0.7, v * 0.55))
                    : halfW - Math.max(0.7, halfW * 0.55);
                const inner = ribbonEdges(pts, shrink(halfW));
                const mid = pts.length >> 1;
                const useTop = core.top[mid].y < core.bot[mid].y; // pick the visually-upper edge
                const o = useTop ? core.top : core.bot;
                const n = useTop ? inner.top : inner.bot;
                gfx.fillStyle(hlColor, alpha * 0.9);
                gfx.fillPoints([...o, ...[...n].reverse()], true);
            }
        };

        // Fill a ribbon split across an array of band graphics — one segment
        // per band, pts.length === bands.length + 1. Edges are computed once
        // over the whole span so adjacent bands share exact vertices: no
        // cracks between graphics.
        const fillRibbonBands = (bands, pts, hw, color, alpha, hlColor, hlAlpha) => {
            const core  = ribbonEdges(pts, hw);
            const halo  = ribbonEdges(pts, hw.map(v => v + AA));
            const inner = ribbonEdges(pts, hw.map(v => v - Math.max(0.7, v * 0.55)));
            const mid   = pts.length >> 1;
            const useTop = core.top[mid].y < core.bot[mid].y;
            const hlO = useTop ? core.top  : core.bot;
            const hlI = useTop ? inner.top : inner.bot;
            for (let i = 0; i < bands.length; i++) {
                const g = bands[i];
                g.fillStyle(color, alpha * 0.3);
                g.fillPoints([halo.top[i], halo.top[i + 1], halo.bot[i + 1], halo.bot[i]], true);
                g.fillStyle(color, alpha);
                g.fillPoints([core.top[i], core.top[i + 1], core.bot[i + 1], core.bot[i]], true);
                g.fillStyle(hlColor, hlAlpha);
                g.fillPoints([hlO[i], hlO[i + 1], hlI[i + 1], hlI[i]], true);
            }
        };

        // Side rope point at parameter t (0 = near corner → 1 = far corner);
        // bows outward in x and downward in y, peaking at the midpoint.
        const BANDS  = this.sideRopeBands.length;
        const NBANDS = this.nearRopeBands.length;
        const yBow  = (ns + fs) * 0.5;
        const xBow  = (ns + fs) * 0.6;
        const sidePoint = (nearP, farP, rope, dir, t, rest, warpX) => {
            const bow = Math.sin(t * Math.PI);
            return {
                x: nearP.x + (farP.x - nearP.x) * t + dir * xBow * bow + (warpX ? warpX(t) : 0),
                y: rope.nearY + (rope.farY - rope.nearY) * t + (yBow + rest) * bow,
            };
        };

        // Resting gravity sag, bottom rope loosest → top rope tightest (px at
        // the near side; far side scaled down with the perspective). The
        // spring sag from bounces rides on top of this.
        const REST_SAG = [6, 4.5, 3];

        ropes.forEach((rope, ri) => {
            const rest = REST_SAG[ri] ?? 4;
            // Horizontal ropes — 25% less spring sag than side ropes
            // Dark taped ropes, period-correct — they read as dark strands
            // against the lit canvas and melt into the crowd shadows above it.
            // No press deformation: bodies bow along their movement axis
            // (side to side), and a toward/away-from-camera bulge reads wrong.
            fillRibbonBands(this.nearRopeBands,
                archPts(nearLeft.x, rope.nearY, nearRight.x, rope.nearY, rest + ns * 0.75, null, NBANDS),
                new Array(NBANDS + 1).fill(2), 0x32322e, 1, 0x8e8e82, 0.9);
            fillRibbon(farG, archPts(farLeft.x, rope.farY, farRight.x, rope.farY, rest * 0.58 + fs * 0.75, null), 1, 0x3c3c38, 0.9, 0x787870);

            // Side ropes — one segment per depth band so wrestlers sort
            // correctly; a press bows them outward in x, fading with distance.
            const sideRest = rest * 0.8;
            for (const dir of [-1, 1]) {
                const nearP = dir < 0 ? nearLeft : nearRight;
                const farP  = dir < 0 ? farLeft  : farRight;
                const warpX = t => dir * presses.side[dir].reduce(
                    (a, p) => a + p.k * p.w[ri] * 8 * (1 - 0.42 * t) * bump(t, p.t, 0.28), 0);
                const pts = [], hw = [];
                for (let i = 0; i <= BANDS; i++) {
                    const t = i / BANDS;
                    pts.push(sidePoint(nearP, farP, rope, dir, t, sideRest, warpX));
                    hw.push((3.0 - 1.2 * t) / 2); // thinner with distance
                }
                fillRibbonBands(this.sideRopeBands, pts, hw, 0x36362f, 0.85, 0x82827a, 0.75);
            }
        });

        // Re-sort pressed bands behind the pressing wrestler. Only full
        // contact re-sorts (k ≥ 0.55, i.e. within ~6px of the movement clamp)
        // so the flip lands at the moment of body contact; the deeper
        // wrestler still sorts behind the rope everywhere else because
        // depth is monotonic in ground y.
        for (let i = 0; i < NBANDS; i++) {
            const bx = nearLeft.x + (nearRight.x - nearLeft.x) * ((i + 0.5) / NBANDS);
            let d = 25.5;
            for (const p of presses.near) {
                if (p.k >= 0.55 && bump(bx, p.x, 95) > 0.15) d = Math.min(d, p.depth - 0.02);
            }
            this.nearRopeBands[i].setDepth(d);
        }
        for (let i = 0; i < BANDS; i++) {
            const g = this.sideRopeBands[i];
            const tMid = (i + 0.5) / BANDS;
            let d = g._baseDepth;
            for (const dir of [-1, 1]) {
                for (const p of presses.side[dir]) {
                    if (p.k >= 0.55 && Math.abs(tMid - p.t) < 0.3) d = Math.min(d, p.depth - 0.02);
                }
            }
            g.setDepth(d);
        }
    }

    drawPosts() {
        const { nearLeft, nearRight, farLeft, farRight, ropes, apronY } = RING;
        const topRope = ropes[2];

        // Near posts render in front of wrestlers and near ropes; far posts sit
        // behind the mat (depth 3) so the ring covers their bases, but above
        // the crowd (1) and far apron (2).
        const nearGfx = this.add.graphics().setDepth(25.7);
        const farGfx  = this.add.graphics().setDepth(2.5);

        const drawPost = (gfx, p) => {
            gfx.fillStyle(0x686860, 1);
            gfx.fillRect(p.x - p.w / 2, p.top, p.w, p.bot - p.top);
            gfx.fillStyle(0x888880, 1);
            gfx.fillCircle(p.x, p.top, p.w * 0.8);
        };

        drawPost(nearGfx, { x: nearLeft.x,  top: topRope.nearY - 6, bot: apronY,          w: 8 });
        drawPost(nearGfx, { x: nearRight.x, top: topRope.nearY - 6, bot: apronY,          w: 8 });
        drawPost(farGfx,  { x: farLeft.x,   top: topRope.farY - 4,  bot: farLeft.y  + 16, w: 5 });
        drawPost(farGfx,  { x: farRight.x,  top: topRope.farY - 4,  bot: farRight.y + 16, w: 5 });

        const tbSize = { near: 7, far: 4 };
        ropes.forEach(rope => {
            nearGfx.fillStyle(0x484840, 1);
            nearGfx.fillRect(nearLeft.x  - tbSize.near, rope.nearY - tbSize.near / 2, tbSize.near * 2, tbSize.near);
            nearGfx.fillRect(nearRight.x - tbSize.near, rope.nearY - tbSize.near / 2, tbSize.near * 2, tbSize.near);
            farGfx.fillStyle(0x484840, 1);
            farGfx.fillRect(farLeft.x  - tbSize.far, rope.farY - tbSize.far / 2, tbSize.far * 2, tbSize.far);
            farGfx.fillRect(farRight.x - tbSize.far, rope.farY - tbSize.far / 2, tbSize.far * 2, tbSize.far);
        });
    }

    createScanlines() {
        const gfx = this.add.graphics();
        gfx.fillStyle(0x000000, 1);
        for (let y = 0; y < H; y += 2) {
            gfx.fillRect(0, y, W, 1);
        }
        gfx.generateTexture('scanlines', W, H);
        gfx.destroy();
        this.add.image(0, 0, 'scanlines').setOrigin(0, 0).setAlpha(0.18).setDepth(50);
    }

    showTitleCard() {
        const overlay = this.add.graphics().setDepth(200);
        overlay.fillStyle(0x000000, 1);
        overlay.fillRect(0, 0, W, H);

        const base = { fontFamily: '"Times New Roman", Times, serif', color: '#d8d8d0', align: 'center' };
        const t1 = this.add.text(W / 2, H / 2 - 70, 'MIDWEST WRESTLING FEDERATION',
            { ...base, fontSize: '18px', letterSpacing: 7 }).setOrigin(0.5).setDepth(201);
        const t2 = this.add.text(W / 2, H / 2 - 30, 'presents',
            { ...base, fontSize: '13px', letterSpacing: 6, fontStyle: 'italic' }).setOrigin(0.5).setDepth(201);
        const t3 = this.add.text(W / 2, H / 2 + 12, 'WRESTLING FROM MARIGOLD',
            { ...base, fontSize: '30px', letterSpacing: 10 }).setOrigin(0.5).setDepth(201);
        const t4 = this.add.text(W / 2, H / 2 + 62, 'LIVE FROM MARIGOLD ARENA  ·  CHICAGO, ILLINOIS',
            { ...base, fontSize: '11px', letterSpacing: 3 }).setOrigin(0.5).setDepth(201);
        const t5 = this.add.text(W / 2, H / 2 + 85, 'WFM',
            { ...base, fontSize: '9px', letterSpacing: 5, color: '#888880' }).setOrigin(0.5).setDepth(201);

        const all = [overlay, t1, t2, t3, t4, t5];
        all.forEach(e => e.setAlpha(0));

        this.tweens.add({
            targets: all,
            alpha: 1,
            duration: 900,
            ease: 'Linear',
            onComplete: () => {
                this.time.delayedCall(3200, () => {
                    this.tweens.add({
                        targets: all,
                        alpha: 0,
                        duration: 1400,
                        ease: 'Linear',
                        onComplete: () => all.forEach(e => e.destroy()),
                    });
                });
            },
        });
    }

    _setupGame() {
        const kb = this.input.keyboard;

        const keys1 = {
            up:       kb.addKey('W'),
            down:     kb.addKey('S'),
            left:     kb.addKey('A'),
            right:    kb.addKey('D'),
            action:   kb.addKey('F'),     // grapple: whip / clothesline / pin
            power:    kb.addKey('G'),     // power:   slam / elbow drop / dropkick
            finisher: kb.addKey('H'),     // finisher: sleeper hold
            run:      kb.addKey('R'),     // run to rope
            evade:    kb.addKey('E'),     // tap: backstep — dodges strikes
            block:    kb.addKey('T'),     // hold: braced stance — stuffs grapples
        };
        const keys2 = {
            up:       kb.addKey('UP'),
            down:     kb.addKey('DOWN'),
            left:     kb.addKey('LEFT'),
            right:    kb.addKey('RIGHT'),
            action:   kb.addKey('ENTER'),
            power:    kb.addKey('SHIFT'),
            finisher: kb.addKey('SPACE'),
            run:      kb.addKey('FORWARD_SLASH'),
            evade:    kb.addKey('COMMA'),  // tap: backstep — dodges strikes
            block:    kb.addKey('PERIOD'), // hold: braced stance — stuffs grapples
        };

        const input1 = new InputHandler('keyboard', keys1);
        const input2 = new InputHandler('keyboard', keys2);

        // Kit + AI presets. Defaults preserve the classic card (brawler vs
        // George); ?p1=thesz / ?p2=thesz (WFM_P1/WFM_P2 through the debug
        // harness) swap a side for matchup sims. Old-TV booking rule: one man
        // light, one man dark, so the grayscale broadcast filter never lets
        // two overlapping bodies read as one.
        const PRESETS = {
            brawler: {
                name: 'BRAWLER', personality: 'brawler', idlePose: 'brawlerIdle',
                skin: 0xe0b088, trunks: 0x8c9cc8,
                moveSet: ['irishWhip', 'clothesline', 'bodySlam', 'suplex', 'pin', 'elbowDrop', 'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt'],
            },
            george: {
                name: 'GEORGE', personality: 'george', idlePose: 'powerIdle',
                skin: 0xa87858, trunks: 0x1a1a1a,
                moveSet: ['irishWhip', 'clothesline', 'piledriver', 'suplex', 'pin', 'elbowDrop', 'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt'],
                textures: george.textures,
            },
            thesz: {
                // Clean technical kit — no headbutt, no piledriver; suplex and
                // slam are his conversions, the holds are his actual game
                name: 'THESZ', personality: 'thesz', idlePose: 'theszIdle',
                skin: 0xe8c098, trunks: 0x484848,
                moveSet: ['irishWhip', 'clothesline', 'bodySlam', 'suplex', 'pin', 'elbowDrop', 'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'theszPress'],
                textures: thesz.textures,
            },
        };
        const q  = new URLSearchParams(location.search);
        const c1 = this._preset1 = PRESETS[q.get('p1')] ?? PRESETS.brawler;
        const c2 = this._preset2 = PRESETS[q.get('p2')] ?? PRESETS.george;

        this.w1 = new Wrestler(this, 330, 360, c1.skin, c1.trunks, input1, c1.moveSet, c1.textures ?? {});
        this.w1.facing   = 1;
        this.w1.idlePose = c1.idlePose;

        this.w2 = new Wrestler(this, 630, 360, c2.skin, c2.trunks, input2, c2.moveSet, c2.textures ?? {});
        this.w2.facing   = -1;
        this.w2.idlePose = c2.idlePose;

        // Both P1 and P2 default to keyboard (Derek, 2026-07-12 — loading the
        // game for a quick look shouldn't immediately throw them into a
        // fight). Keys 1 and 2 toggle each player between keyboard and AI —
        // turn both AI on to watch a match.
        const lblStyle = {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '10px',
            color: '#888880',
            letterSpacing: 2,
        };
        this._p1Keyboard = input1;
        this._p1AI       = new AIHandler(c1.personality);
        this._p1AI.setWrestlers(this.w1, this.w2);
        this.p1ModeLbl = this.add.text(24, 26, '', lblStyle).setOrigin(0, 0).setDepth(155);
        this._showPlayerMode(1);
        kb.addKey('ONE').on('down', () => this._togglePlayer(1));

        this._p2Keyboard = input2;
        this._p2AI       = new AIHandler(c2.personality);
        this._p2AI.setWrestlers(this.w2, this.w1);
        this.p2ModeLbl = this.add.text(W - 24, 26, '', lblStyle).setOrigin(1, 0).setDepth(155);
        this._showPlayerMode(2);
        kb.addKey('TWO').on('down', () => this._togglePlayer(2));

        // Pin countdown text
        this.pinText = this.add.text(W / 2, H / 2 - 10, '', {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '72px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
        }).setOrigin(0.5).setDepth(150).setAlpha(0);

        // Stamina bars — thin strips at top of screen, outside the broadcast frame
        this.staminaGfx = this.add.graphics().setDepth(155);

        this.pinState      = null; // { attacker, defender, timer }
        this.sleeperState  = null; // { attacker, defender, timer }
        this.headlockState = null; // { attacker, defender, timer }
        this.lockupState   = null; // { attacker, defender, timer }

        // Crowd heat — 0–100, bumped by big moves, taunts, nearfalls. Cools
        // exponentially toward a floor that big spots ratchet upward, so a
        // match that has delivered stays warm between spots instead of
        // bleeding back to silence (see bumpHeat/_updateHeat).
        this.heat      = 30;
        this.heatFloor = 10;
        this._heatChain = 0;
        this._lastBumpT = -99;
        this.heatGfx = this.add.graphics().setDepth(152);
        this.heatLbl = this.add.text(W / 2, H - 30, 'CROWD', {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '9px',
            color: '#a8a8a0',
            letterSpacing: 4,
        }).setOrigin(0.5, 1).setDepth(153);

        // Match event log — consumed by the future AI commentary system.
        // Each entry: { t, type, ...payload }
        // Significant types: 'move', 'knockdown', 'stagger', 'pinAttempt',
        //   'kickout', 'nearfall', 'pinfall', 'sleeperApplied',
        //   'sleeperEscape', 'sleeperKO'
        this.matchEvents = [];
        this._matchTime  = 0;
        this.matchOver   = false;

        // Crowd audio — synthesized murmur tracks the heat meter, pops on events.
        // Browsers block audio until a user gesture, so start on first input.
        this.crowd = new CrowdAudio();
        const unlockAudio = () => this.crowd.start();
        this.input.keyboard.once('keydown', unlockAudio);
        this.input.once('pointerdown', unlockAudio);

        // Match clock — counts up, TV-graphic style; draw at the time limit.
        // 10 min for now; the 30-minute Broadway becomes a story-mode setting.
        this.matchLimit = 10 * 60;
        this.clockLbl = this.add.text(W / 2, 12, '0:00', {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '15px',
            color: '#999990',
            letterSpacing: 3,
        }).setOrigin(0.5, 0).setDepth(155);
    }

    _playerRig(n) {
        return n === 1
            ? { w: this.w1, ai: this._p1AI, kb: this._p1Keyboard, lbl: this.p1ModeLbl, name: this._preset1.name }
            : { w: this.w2, ai: this._p2AI, kb: this._p2Keyboard, lbl: this.p2ModeLbl, name: this._preset2.name };
    }

    _togglePlayer(n) {
        const r = this._playerRig(n);
        r.w.input = r.w.input === r.ai ? r.kb : r.ai;
        this._showPlayerMode(n);
    }

    // Show a player's control mode for a few seconds, then fade
    _showPlayerMode(n) {
        const r    = this._playerRig(n);
        const isAI = r.w.input === r.ai;
        r.lbl.setText(isAI ? `P${n}: ${r.name} (AI) — ${n} = KEYBOARD` : `P${n}: KEYBOARD — ${n} = AI`);
        r.lbl.setAlpha(1);
        this.tweens.killTweensOf(r.lbl);
        this.tweens.add({
            targets: r.lbl,
            alpha: 0,
            delay: 3500,
            duration: 800,
        });
    }

    _drawStaminaBars() {
        const g   = this.staminaGfx;
        const BAR_W = 180, BAR_H = 6, PAD = 24, Y = 14;
        g.clear();

        const draw = (wrestler, x, flip) => {
            const pct = wrestler.stamina / 100;
            const fillW = BAR_W * pct;
            // Background
            g.fillStyle(0x222222, 0.8);
            g.fillRect(x, Y, BAR_W, BAR_H);
            // Fill — green → yellow → red as stamina drops
            const col = pct > 0.5 ? 0x88bb44 : pct > 0.25 ? 0xccaa22 : 0xbb3322;
            g.fillStyle(col, 1);
            g.fillRect(flip ? x + BAR_W - fillW : x, Y, fillW, BAR_H);
        };

        draw(this.w1, PAD, false);                   // P1 bar — grows right
        draw(this.w2, W - PAD - BAR_W, true);        // P2 bar — grows left
    }

    // Append a timestamped event to the match log.
    // Future AI commentary system reads this to generate contextual play-by-play.
    _logEvent(type, payload = {}) {
        this.matchEvents.push({ t: Math.round(this._matchTime), type, ...payload });
        const pop = POP_SIZES[type];
        if (pop) this.crowd.pop(pop);
        if (pop >= 0.15) this._reactCrowdExtras();
        if (type === 'dodge') this.bumpHeat(3); // logged from strike impact callbacks
    }

    bumpHeat(amount) {
        // Chained spots play bigger: bumps landing within 4s of the previous
        // one build a multiplier, so a sequence heats the room faster than
        // the same moves spread across dead air.
        this._heatChain = (this._matchTime - this._lastBumpT < 4) ? Math.min(5, this._heatChain + 1) : 0;
        this._lastBumpT = this._matchTime;
        this.heat = Math.min(100, this.heat + amount * (1 + 0.18 * this._heatChain));
        // Big spots ratchet the crowd's floor — once they've seen a nearfall
        // the room never goes back to cold silence.
        if (amount >= 8) this.heatFloor = Math.min(60, this.heatFloor + amount * 0.45);
    }

    // Comeback mechanic: surviving a big spot refunds stamina, so the wrestler
    // who's behind gets a real chance to swing the match. The refund scales
    // with crowd heat (50% cold → 150% at full roar) — a hot crowd literally
    // lifts you, which is what the heat meter is *for*.
    _comeback(wrestler, stamina) {
        wrestler.stamina = Math.min(100, wrestler.stamina + stamina * (0.5 + this.heat / 100));
    }

    _isAtRopes(wrestler) {
        const b = ringBoundsAtY(wrestler.y);
        const threshold = 30 * wrestler.s;
        return wrestler.x <= b.left + threshold || wrestler.x >= b.right - threshold;
    }

    // A move that lands directly in a cover (the Thesz press) enters the pin
    // here — tryAction's return-value path only covers grapples on a downed
    // man. Mirrors that path: states + pinHold pose + pinState + event.
    startPin(attacker, defender) {
        if (this.matchOver) return;
        attacker.state = 'pinning';
        defender.state = 'pinned';
        attacker.tweenPose('pinHold', 200, 'Linear');
        if (!this.pinState) {
            this.pinState = { attacker, defender, timer: 0 };
            this._logEvent('pinAttempt', { attacker: attacker === this.w1 ? 'p1' : 'p2', defenderStamina: Math.round(defender.stamina) });
        }
    }

    _showRopeBreak() {
        this.pinText.setText('ROPE BREAK').setAlpha(1);
        this.time.delayedCall(1000, () => this.pinText.setAlpha(0));
        this.bumpHeat(12);
        this._logEvent('ropeBreak');
    }

    _heatForMove(move) {
        const bumps = {
            irishWhip: 2, clothesline: 8, bodySlam: 12, piledriver: 15,
            dropkick: 8, elbowDrop: 7, doubleAxeHandle: 8, sleeperHold: 6,
            headlock: 3, armDrag: 6, suplex: 12, dive: 10, topDive: 18,
            jab: 3, headbutt: 5, taunt: 10, turnbuckleTaunt: 12, theszPress: 16,
        };
        const n = bumps[move];
        if (n) this.bumpHeat(n);
    }

    _updateHeat(dt) {
        // A roar dies down over ~15s but settles at the simmer the match has
        // earned rather than draining linearly to zero. The floor itself
        // cools very slowly, so a long dead stretch does lose the room.
        this.heatFloor = Math.max(10, this.heatFloor - 0.15 * dt);
        this.heat = this.heatFloor + (this.heat - this.heatFloor) * Math.exp(-0.08 * dt);
        this.crowd.setHeat(this.heat / 100);
    }

    _drawHeatMeter() {
        const g = this.heatGfx;
        g.clear();
        const BAR_W = 200, BAR_H = 7;
        const bx = (W - BAR_W) / 2;
        const by = H - 26;

        // Visible frame — the old bare dark-on-dark bar vanished into the
        // vignette at the bottom of the frame
        g.fillStyle(0x000000, 0.9);
        g.fillRect(bx - 2, by - 2, BAR_W + 4, BAR_H + 4);
        g.lineStyle(1, 0x777770, 0.9);
        g.strokeRect(bx - 2, by - 2, BAR_W + 4, BAR_H + 4);

        // Dim under-fill marks the ratcheted floor — how much of the room
        // the match has permanently won over
        g.fillStyle(0x55554e, 1);
        g.fillRect(bx, by, BAR_W * (this.heatFloor / 100), BAR_H);

        const fillW = BAR_W * (this.heat / 100);
        const lum = Math.floor(90 + this.heat * 1.4); // readable gray (cold) → blazing white (hot)
        const col = (Math.min(255, lum) << 16) | (Math.min(255, lum) << 8) | Math.min(255, lum);
        g.fillStyle(col, 1);
        g.fillRect(bx, by, fillW, BAR_H);

        this.heatLbl.setPosition(W / 2, by - 4);
    }

    _tickGame(dt) {
        const { w1, w2 } = this;

        // Clock pauses while the end-of-match banner is up
        if (!this.matchOver) {
            this._matchTime += dt;
            const m = Math.floor(this._matchTime / 60);
            const s = Math.floor(this._matchTime % 60);
            this.clockLbl.setText(`${m}:${String(s).padStart(2, '0')}`);

            // Time-limit draw — held off while a pin or sleeper is resolving
            if (this._matchTime >= this.matchLimit && !this.pinState && !this.sleeperState) {
                this._logEvent('timeLimitDraw');
                this._endMatch('TIME LIMIT — DRAW');
            }
        }

        // Tick AI before wrestler actions so decisions are ready this frame.
        // Paused while the win banner is up so the AI doesn't attack the loser —
        // and cleared, or the frozen key map keeps re-firing its last presses.
        if (!this.matchOver) {
            w1.input.tick?.(dt);
            w2.input.tick?.(dt);
        } else {
            w1.input.clear?.();
            w2.input.clear?.();
        }

        w1.move(dt, w2);
        w2.move(dt, w1);

        w1.tickDown(dt);
        w2.tickDown(dt);
        w1.tickPossum(dt);
        w2.tickPossum(dt);

        w1.tickRun(dt);
        w2.tickRun(dt);

        w1.updateCombatBlend(dt, w2);
        w2.updateCombatBlend(dt, w1);

        // Defense first — a block/evade registered this frame beats the
        // attack attempts resolved below
        w1.tickDefense(dt, w2);
        w2.tickDefense(dt, w1);

        // Grapple actions — only one can initiate per frame
        const r1 = w1.tryAction(w2);
        const r2 = r1 ? false : w2.tryAction(w1);

        // Power moves — mutually exclusive, state machine handles most conflicts
        const p1 = w1.tryPower(w2);
        const p2 = p1 ? false : w2.tryPower(w1);

        // Finisher slot
        const f1 = w1.tryFinisher(w2);
        const f2 = f1 ? false : w2.tryFinisher(w1);

        // Self-initiated run — mutually exclusive, no defender to log
        const rn1 = w1.tryRun();
        if (!rn1) w2.tryRun();

        // Running attack — fires while returning from rope
        const ra1 = w1.tryRunningAttack(w2);
        const ra2 = ra1 ? false : w2.tryRunningAttack(w1);

        // Turnbuckle climb and dive
        w1.tryClimb(); w2.tryClimb();
        const d1 = w1.tryDive(w2);
        const d2 = d1 ? false : w2.tryDive(w1);

        // Log every move that landed this frame and bump crowd heat
        const logMove = (move, attacker, defender) => {
            if (!move || move === true) return;
            // Stuffed grapple — the credit belongs to the blocker, not the attacker
            if (move === 'grappleBlocked') {
                this._logEvent('grappleBlock', { blocker: attacker === 'p1' ? 'p2' : 'p1' });
                this.bumpHeat(6);
                return;
            }
            const type = (move !== 'taunt' && (move === 'knockdown' || defender.state === 'down' || defender.state === 'falling' || defender.state === 'flipping'))
                ? 'knockdown' : (defender.state === 'staggered' ? 'stagger' : 'move');
            this._logEvent(type, { attacker, move, defenderStamina: Math.round(defender.stamina) });
            this._heatForMove(move);
            // Playing to the crowd converts heat into wind: taunts refund
            // stamina scaled by how hot the building is (via _comeback)
            if (move === 'taunt' || move === 'turnbuckleTaunt') {
                this._comeback(attacker === 'p1' ? this.w1 : this.w2, 4);
            }
        };
        logMove(r1,  'p1', w2); logMove(r2,  'p2', w1);
        logMove(p1,  'p1', w2); logMove(p2,  'p2', w1);
        logMove(f1,  'p1', w2); logMove(f2,  'p2', w1);
        logMove(ra1, 'p1', w2); logMove(ra2, 'p2', w1);
        logMove(d1, 'p1', w2); logMove(d2, 'p2', w1);

        if ((r1 === 'lockup') && !this.lockupState) {
            this.lockupState = { attacker: w1, defender: w2, timer: 0 };
        } else if ((r2 === 'lockup') && !this.lockupState) {
            this.lockupState = { attacker: w2, defender: w1, timer: 0 };
        }

        if (this.lockupState) this._tickLockup(dt);

        if (r1 === 'pin' && !this.pinState) {
            this.pinState = { attacker: w1, defender: w2, timer: 0 };
            this._logEvent('pinAttempt', { attacker: 'p1', defenderStamina: Math.round(w2.stamina) });
        } else if (r2 === 'pin' && !this.pinState) {
            this.pinState = { attacker: w2, defender: w1, timer: 0 };
            this._logEvent('pinAttempt', { attacker: 'p2', defenderStamina: Math.round(w1.stamina) });
        }

        if (f1 === 'sleeperHold' && !this.sleeperState) {
            this.sleeperState = { attacker: w1, defender: w2, timer: 0 };
            this._logEvent('sleeperApplied', { attacker: 'p1' });
        } else if (f2 === 'sleeperHold' && !this.sleeperState) {
            this.sleeperState = { attacker: w2, defender: w1, timer: 0 };
            this._logEvent('sleeperApplied', { attacker: 'p2' });
        }

        if (this.pinState)      this._tickPin(dt);
        if (this.sleeperState)  this._tickSleeper(dt);
        if (this.headlockState) this._tickHeadlock(dt);

        this._orphanWatchdog(w1, w2, dt);
        this._orphanWatchdog(w2, w1, dt);

        w1.draw();
        w2.draw();
        this._updateRopes(dt);
        this._drawStaminaBars();
        this._updateHeat(dt);
        this._drawHeatMeter();
    }

    // Safety net for the whole class of "partner state changed, victim
    // stranded" bugs: a wrestler stuck in a paired state whose counterpart
    // (attacker state or Arena hold-state) is gone gets freed after a short
    // grace period. Root causes are also guarded at the source (_doSell,
    // _releaseGrabbed) — this catches whatever slips through next.
    _orphanWatchdog(w, opp, dt) {
        const orphaned =
            (w.state === 'grabbed'    && opp.state !== 'slamming') ||
            (w.state === 'pinned'     && !this.pinState)           ||
            (w.state === 'pinning'    && !this.pinState)           ||
            (w.state === 'sleeping'   && !this.sleeperState)       ||
            (w.state === 'headlocked' && !this.headlockState)      ||
            (w.state === 'holding'    && !this.sleeperState && !this.headlockState) ||
            (w.state === 'lockup'     && !this.lockupState);

        if (!orphaned) { w._orphanT = 0; return; }
        w._orphanT = (w._orphanT ?? 0) + dt;
        if (w._orphanT < 0.6) return;

        this._logEvent('orphanRescue', { wrestler: w === this.w1 ? 'p1' : 'p2', from: w.state });
        w._orphanT = 0;
        if (w.state === 'grabbed') {
            w.state      = 'down';
            w.stateTimer = 4.5;
            w.slamPhase  = null;
            w.slamType   = null;
        } else {
            w.state = 'standing';
            w.tweenPose('idle', 200, 'Linear');
        }
    }

    _tickPin(dt) {
        const ps = this.pinState;
        ps.timer += dt;

        // Rope break — defender's position is at the ropes
        if (this._isAtRopes(ps.defender)) {
            ps.attacker.state    = 'standing';
            ps.defender.state    = 'down';
            ps.defender.stateTimer = 1.5;
            this.pinText.setAlpha(0);
            this._showRopeBreak();
            this.pinState = null;
            return;
        }

        const count = Math.min(3, Math.floor(ps.timer / 0.85) + 1);
        this.pinText.setText(String(count)).setAlpha(1);

        const kickout = (atCount) => {
            ps.attacker.state = 'standing';
            ps.defender.state = 'standing';
            this.pinText.setAlpha(0);
            const who = ps.defender === this.w1 ? 'p1' : 'p2';
            this._logEvent('kickout', { wrestler: who, atCount, defenderStamina: Math.round(ps.defender.stamina) });
            if (atCount >= 2) {
                this._logEvent('nearfall', { attacker: who === 'p1' ? 'p2' : 'p1' });
                this.bumpHeat(22);
                // Comeback: surviving a deep count fires the crowd up AND puts
                // wind back in the survivor — matches arc instead of snowballing
                this._comeback(ps.defender, 15);
            }
            this.pinState = null;
        };

        // Defender mashes action to kick out
        if (ps.defender.tryKickout()) { kickout(count); return; }

        // One 2.9 save per wrestler per match: the first cover that would end
        // it becomes a manufactured nearfall instead — every match gets at
        // least one heartstopper before a pin can finish
        if (ps.timer >= 2.35 && !ps.defender.pinSaveUsed) {
            ps.defender.pinSaveUsed = true;
            this.bumpHeat(10); // on top of the nearfall bump below
            kickout(2.9);
            return;
        }

        // Three-count complete — pin succeeds
        if (ps.timer >= 2.55) {
            this.pinText.setAlpha(0);
            const winner = ps.attacker === this.w1 ? 1 : 2;
            this._logEvent('pinfall', { winner: `p${winner}` });
            ps.attacker.state = 'standing';
            ps.defender.state = 'standing';
            this.pinState = null;
            this._showWin(winner);
        }
    }

    _tickSleeper(dt) {
        const ss = this.sleeperState;
        ss.timer += dt;

        // Keep attacker hugged to the defender
        ss.attacker.x = ss.defender.x - ss.attacker.facing * 50 * ss.attacker.s;

        // Rope break
        if (this._isAtRopes(ss.defender)) {
            ss.attacker.tweenPose('idle', 200, 'Linear');
            ss.defender.tweenPose('idle', 200, 'Linear');
            ss.attacker.state = 'standing';
            ss.defender.state = 'standing';
            this.pinText.setAlpha(0);
            this._showRopeBreak();
            this.sleeperState = null;
            return;
        }

        // Drain defender stamina continuously (~18 total over 4s)
        ss.defender._drain(4.5 * dt);

        // Show deepening z's as the hold wears them down
        const zText = ss.timer < 1.4 ? 'z' : ss.timer < 2.8 ? 'zz' : 'zzz';
        this.pinText.setText(zText).setAlpha(1);

        const release = (toDown) => {
            ss.attacker.tweenPose('idle', 200, 'Linear');
            ss.defender.tweenPose('idle', 200, 'Linear');
            ss.attacker.state = 'standing';
            if (toDown) {
                ss.defender.state      = 'down';
                ss.defender.stateTimer = 6.5;
            } else {
                ss.defender.state = 'standing';
            }
            this.pinText.setAlpha(0);
            this.sleeperState = null;
        };

        if (ss.defender.tryEscape()) {
            this._logEvent('sleeperEscape', { wrestler: ss.defender === this.w1 ? 'p1' : 'p2' });
            this._comeback(ss.defender, 10);
            this.bumpHeat(8);
            release(false); return;
        }
        if (ss.timer >= 4.0) {
            const winner = ss.attacker === this.w1 ? 1 : 2;
            this._logEvent('sleeperKO', { winner: `p${winner}` });
            release(true);
            this._showWin(winner); // a full sleeper is a finish, not a nap
            return;
        }
    }

    _tickHeadlock(dt) {
        const hs = this.headlockState;
        hs.timer += dt;

        // Attacker stands to the side — both face the same direction
        hs.attacker.x = hs.defender.x - hs.attacker.facing * 68 * hs.attacker.s;

        // Rope break
        if (this._isAtRopes(hs.defender)) {
            hs.attacker.tweenPose('idle', 200, 'Linear');
            hs.attacker.state = 'standing';
            hs.defender.state = 'standing';
            hs.defender.tweenPose('idle', 200, 'Linear');
            this._showRopeBreak();
            this.headlockState = null;
            return;
        }

        // Continuous stamina drain — the headlock is the era's real wear
        // move; at 4/s a full ride costs 12, competitive with a slam
        hs.defender._drain(4.0 * dt);

        const release = (toDown) => {
            hs.attacker.tweenPose('idle', 200, 'Linear');
            hs.attacker.state = 'standing';
            if (toDown) {
                hs.defender.state      = 'down';
                hs.defender.stateTimer = 3.5;
                hs.defender.tweenPose('idle', 150, 'Linear');
            } else {
                hs.defender.state = 'standing';
                hs.defender.tweenPose('idle', 200, 'Linear');
            }
            this.headlockState = null;
        };

        if (hs.defender.tryHeadlockEscape()) {
            this._comeback(hs.defender, 5);
            this.bumpHeat(5);
            release(false); return;
        }
        if (hs.timer >= 3.0)                 { release(true);  return; }
    }

    _tickLockup(dt) {
        const ls = this.lockupState;
        ls.timer += dt;

        // Hold them at arm's length facing each other — gap of ~100 scaled units
        const s      = ls.attacker.s;
        const midX   = (ls.attacker.x + ls.defender.x) / 2;
        const halfGap = 50 * s; // half of 100*s total gap
        const dir    = ls.attacker.facing; // points from attacker toward defender
        ls.attacker.x += (midX - dir * halfGap - ls.attacker.x) * 0.18;
        ls.defender.x  += (midX + dir * halfGap - ls.defender.x)  * 0.18;
        // The drift aims at an unclamped midpoint — at a wall it walks bodies
        // through the rope plane (probes logged lockups at x≈890)
        ls.attacker._clamp();
        ls.defender._clamp();

        const who = ls.attacker === this.w1 ? 'p1' : 'p2';

        // Defender contests by pressing grapple — steals the lockup
        if (ls.defender.input.justDown('action')) {
            [ls.attacker, ls.defender] = [ls.defender, ls.attacker];
            ls.timer = 0;
            ls.attacker.tweenPose('lockup', 150, 'Cubic.easeOut');
            return;
        }

        // Attacker executes follow-up: grapple again + optional direction
        if (ls.attacker.input.justDown('action')) {
            const goUp    = ls.attacker.input.isDown('up');
            const goDown  = ls.attacker.input.isDown('down');
            const goLeft  = ls.attacker.input.isDown('left');
            const goRight = ls.attacker.input.isDown('right');
            const dir     = goLeft ? -1 : goRight ? 1 : ls.attacker.facing;

            ls.attacker.state = 'standing';
            ls.defender.state = 'standing';
            this.lockupState  = null;

            // Log + heat together — these bypassed _heatForMove for months,
            // leaving the AI's primary offense (lockup slams) heat-invisible
            // and slam-heavy matches flatlined at heat ~17.
            const followUp = (move, type = 'move') => {
                this._logEvent(type, { attacker: who, move, defenderStamina: Math.round(ls.defender.stamina) });
                this._heatForMove(move);
            };

            if (goDown && ls.attacker.moveSet.includes('headlock')) {
                ls.attacker._doHeadlock(ls.defender);
                this.headlockState = { attacker: ls.attacker, defender: ls.defender, timer: 0 };
                followUp('headlock');
            } else if (goUp && ls.attacker.moveSet.includes('suplex')) {
                ls.attacker._doSuplex(ls.defender);
                followUp('suplex');
            } else if (goRight && ls.attacker.moveSet.includes('armBar')) {
                ls.attacker._doArmBar(ls.defender);
                followUp('armBar');
            } else if (goLeft && ls.attacker.moveSet.includes('ankleLock')) {
                ls.attacker._doAnkleLock(ls.defender);
                followUp('ankleLock');
            } else if ((goLeft || goRight) && ls.attacker.moveSet.includes('irishWhip')) {
                ls.attacker._doIrishWhip(ls.defender, dir);
                followUp('irishWhip');
            } else if (ls.attacker.moveSet.includes('piledriver')) {
                ls.attacker._doPiledriver(ls.defender);
                followUp('piledriver', 'knockdown');
            } else if (ls.attacker.moveSet.includes('bodySlam')) {
                ls.attacker._doBodySlam(ls.defender);
                followUp('bodySlam', 'knockdown');
            } else {
                ls.attacker._doIrishWhip(ls.defender, dir);
                followUp('irishWhip');
            }
            return;
        }

        // Arm drag: power button from lockup — quick pivot throw
        if (ls.attacker.input.justDown('power') && ls.attacker.moveSet.includes('armDrag')) {
            ls.attacker.state = 'standing';
            ls.defender.state = 'standing';
            this.lockupState  = null;
            ls.attacker._doArmDrag(ls.defender);
            this._logEvent('move', { attacker: who, move: 'armDrag', defenderStamina: Math.round(ls.defender.stamina) });
            this._heatForMove('armDrag');
            return;
        }

        // Timeout — break the clinch
        if (ls.timer >= 0.8) {
            ls.attacker.state = 'standing';
            ls.defender.state = 'standing';
            ls.attacker.tweenPose('idle', 220, 'Linear');
            ls.defender.tweenPose('idle', 220, 'Linear');
            this.lockupState = null;
        }
    }

    _showWin(player) {
        this._endMatch(`PLAYER ${player} WINS`);
    }

    _endMatch(message) {
        this.matchOver = true;
        // Kill any in-flight hold/pin state — a pin attempt sneaking in on the
        // final frame otherwise survives the banner and ticks into the next match
        this.pinState = this.sleeperState = this.headlockState = this.lockupState = null;
        this.pinText.setAlpha(0);
        this.crowd.bell(3);
        const txt = this.add.text(W / 2, H / 2, message, {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '42px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            letterSpacing: 8,
        }).setOrigin(0.5).setDepth(200).setAlpha(0);
        this.hudCam?.ignore(txt); // created after the HUD camera — main cam only

        this.tweens.add({ targets: txt, alpha: 1, duration: 400, ease: 'Linear' });

        // Reset after a few seconds
        this.time.delayedCall(4000, () => {
            this.tweens.add({
                targets: txt, alpha: 0, duration: 600, ease: 'Linear',
                onComplete: () => {
                    txt.destroy();
                    this.w1.x = 330; this.w1.y = 360; this.w1.state = 'standing'; this.w1.facing =  1; this.w1.stamina = 100;
                    this.w2.x = 630; this.w2.y = 360; this.w2.state = 'standing'; this.w2.facing = -1; this.w2.stamina = 100;
                    this.w1.pinSaveUsed = false;
                    this.w2.pinSaveUsed = false;
                    this._matchTime = 0;
                    // Fresh crowd for the next match — and _lastBumpT must not
                    // outlive the match clock it's compared against
                    this.heat      = 30;
                    this.heatFloor = 10;
                    this._heatChain = 0;
                    this._lastBumpT = -99;
                    this.matchOver  = false;
                    this.crowd.bell(1);
                },
            });
        });
    }

    update(time, delta) {
        this._tickGame(delta / 1000 * this.timeScale);

        const g = this.grainGfx;
        g.clear();
        g.fillStyle(0xffffff, 0.12);
        for (let i = 0; i < 700; i++) {
            g.fillRect(Math.random() * W | 0, Math.random() * H | 0, 1, 1);
        }
        g.fillStyle(0x000000, 0.15);
        for (let i = 0; i < 700; i++) {
            g.fillRect(Math.random() * W | 0, Math.random() * H | 0, 1, 1);
        }

        const flicker = Math.sin(time * 0.0017) * 0.012 + Math.random() * 0.008;
        this.flickerOverlay.setAlpha(Math.max(0, flicker));
    }
}
