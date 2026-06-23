import { W, H, RING } from '../constants.js';
import Wrestler from '../Wrestler.js';
import InputHandler from '../InputHandler.js';
import { george } from '../characters/george.js';

// All characters whose PNGs should be preloaded
const CHARACTERS = [george];
const PART_FILES  = { head: 'head.png', torso: 'torso.png', upperArm: 'upper_arm.png', forearm: 'forearm.png', thigh: 'thigh.png', shin: 'shin.png' };

export default class Arena extends Phaser.Scene {
    constructor() {
        super('Arena');
    }

    preload() {
        for (const char of CHARACTERS) {
            for (const [part, key] of Object.entries(char.textures)) {
                this.load.image(key, `assets/wrestlers/${char.id}/${PART_FILES[part]}`);
            }
        }
    }

    create() {
        this.drawArenaBackground();
        this.drawCrowd();
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

        this.showTitleCard();
        this._setupGame();
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

            // Left flank — pack from ring edge toward left canvas edge
            let x = lx - baseR * 0.8;
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
            x = rx + baseR * 0.8;
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
        this.nearRopeGfx = this.add.graphics().setDepth(24.5);
        this.farRopeGfx  = this.add.graphics().setDepth(2);
        this.nearRopeSag = { val: 0, vel: 0 };
        this.farRopeSag  = { val: 0, vel: 0 };
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

        const nearG = this.nearRopeGfx;
        const farG  = this.farRopeGfx;
        nearG.clear();
        farG.clear();

        const ns    = this.nearRopeSag.val;
        const fs    = this.farRopeSag.val;
        const lMidX = (nearLeft.x  + farLeft.x)  / 2;
        const rMidX = (nearRight.x + farRight.x) / 2;

        // Draw a rope as an arched polyline — sag peaks at center, zero at both ends.
        const arch = (gfx, x0, y0, x1, y1, sag, segs = 14) => {
            gfx.beginPath();
            for (let i = 0; i <= segs; i++) {
                const t = i / segs;
                const x = x0 + (x1 - x0) * t;
                const y = y0 + (y1 - y0) * t + sag * Math.sin(t * Math.PI);
                i === 0 ? gfx.moveTo(x, y) : gfx.lineTo(x, y);
            }
            gfx.strokePath();
        };

        ropes.forEach(rope => {
            const midY = (rope.nearY + rope.farY) / 2;
            const yBow = (ns + fs) * 0.5;   // vertical displacement at side rope midpoint
            const xBow = (ns + fs) * 0.6;   // outward horizontal bow (left rope left, right rope right)

            // Horizontal ropes — 25% less sag than side ropes
            nearG.lineStyle(3, 0xf0f0f0, 1);
            arch(nearG, nearLeft.x, rope.nearY, nearRight.x, rope.nearY, ns * 0.75);

            farG.lineStyle(1.5, 0xe0e0e0, 0.9);
            arch(farG, farLeft.x, rope.farY, farRight.x, rope.farY, fs * 0.75);

            // Side ropes bow outward at the midpoint in both x and y
            nearG.lineStyle(2, 0xe4e4e4, 0.85);
            nearG.lineBetween(nearLeft.x,  rope.nearY, lMidX - xBow, midY + yBow);
            nearG.lineBetween(nearRight.x, rope.nearY, rMidX + xBow, midY + yBow);

            farG.lineStyle(2, 0xe4e4e4, 0.85);
            farG.lineBetween(lMidX - xBow, midY + yBow, farLeft.x,  rope.farY);
            farG.lineBetween(rMidX + xBow, midY + yBow, farRight.x, rope.farY);
        });
    }

    drawPosts() {
        const { nearLeft, nearRight, farLeft, farRight, ropes, apronY } = RING;
        const topRope = ropes[2];

        // Near posts must render in front of wrestlers; far posts stay behind them.
        const nearGfx = this.add.graphics().setDepth(25);
        const farGfx  = this.add.graphics().setDepth(8);

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
        };
        const keys2 = {
            up:       kb.addKey('UP'),
            down:     kb.addKey('DOWN'),
            left:     kb.addKey('LEFT'),
            right:    kb.addKey('RIGHT'),
            action:   kb.addKey('ENTER'), // grapple
            power:    kb.addKey('SHIFT'), // power
            finisher: kb.addKey('SPACE'), // finisher: sleeper hold
            run:      kb.addKey('FORWARD_SLASH'), // run to rope
        };

        const input1 = new InputHandler('keyboard', keys1);
        const input2 = new InputHandler('keyboard', keys2);

        // P1 — blue trunks: brawler kit (Irish whip → clothesline, body slam, elbow drop, dropkick)
        this.w1 = new Wrestler(this, 330, 360, 0xc8906a, 0x334499, input1,
            ['irishWhip', 'clothesline', 'bodySlam', 'suplex', 'pin', 'elbowDrop', 'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt']);
        this.w1.facing   = 1;
        this.w1.idlePose = 'brawlerIdle';

        // P2 — dark trunks: powerhouse kit (piledriver instead of body slam, same extras)
        this.w2 = new Wrestler(this, 630, 360, 0xc8906a, 0x1a1a1a, input2,
            ['irishWhip', 'clothesline', 'piledriver', 'suplex', 'pin', 'elbowDrop', 'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt']);
        this.w2.facing   = -1;
        this.w2.idlePose = 'powerIdle';

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

        // Crowd heat — 0–100, decays slowly, bumped by big moves, taunts, nearfalls
        this.heat    = 30;
        this.heatGfx = this.add.graphics().setDepth(152);
        this.heatLbl = this.add.text(W / 2, H - 30, 'CROWD', {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '8px',
            color: '#666660',
            letterSpacing: 4,
        }).setOrigin(0.5, 1).setDepth(153);

        // Match event log — consumed by the future AI commentary system.
        // Each entry: { t, type, ...payload }
        // Significant types: 'move', 'knockdown', 'stagger', 'pinAttempt',
        //   'kickout', 'nearfall', 'pinfall', 'sleeperApplied',
        //   'sleeperEscape', 'sleeperKO'
        this.matchEvents = [];
        this._matchTime  = 0;
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
    }

    bumpHeat(amount) {
        this.heat = Math.min(100, this.heat + amount);
    }

    _heatForMove(move) {
        const bumps = {
            irishWhip: 2, clothesline: 8, bodySlam: 12, piledriver: 15,
            dropkick: 8, elbowDrop: 7, doubleAxeHandle: 8, sleeperHold: 6,
            headlock: 3, armDrag: 6, suplex: 12, dive: 10, topDive: 18,
            jab: 3, headbutt: 5, taunt: 10, turnbuckleTaunt: 12,
        };
        const n = bumps[move];
        if (n) this.bumpHeat(n);
    }

    _updateHeat(dt) {
        this.heat = Math.max(0, this.heat - 3 * dt);
    }

    _drawHeatMeter() {
        const g = this.heatGfx;
        g.clear();
        const BAR_W = 160, BAR_H = 5;
        const bx = (W - BAR_W) / 2;
        const by = H - 22;

        g.fillStyle(0x111111, 0.85);
        g.fillRect(bx - 1, by - 1, BAR_W + 2, BAR_H + 2);

        const fillW = BAR_W * (this.heat / 100);
        const lum = Math.floor(38 + this.heat * 0.52); // dim gray (cold) → near-white (hot)
        const col = (lum << 16) | (lum << 8) | lum;
        g.fillStyle(col, 1);
        g.fillRect(bx, by, fillW, BAR_H);

        this.heatLbl.setPosition(W / 2, by - 2);
    }

    _tickGame(dt) {
        const { w1, w2 } = this;
        this._matchTime += dt;

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
            const type = (move === 'knockdown' || defender.state === 'down' || defender.state === 'falling' || defender.state === 'flipping')
                ? 'knockdown' : (defender.state === 'staggered' ? 'stagger' : 'move');
            this._logEvent(type, { attacker, move, defenderStamina: Math.round(defender.stamina) });
            this._heatForMove(move);
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

        w1.draw();
        w2.draw();
        this._updateRopes(dt);
        this._drawStaminaBars();
        this._updateHeat(dt);
        this._drawHeatMeter();
    }

    _tickPin(dt) {
        const ps = this.pinState;
        ps.timer += dt;

        const count = Math.min(3, Math.floor(ps.timer / 0.85) + 1);
        this.pinText.setText(String(count)).setAlpha(1);

        // Defender mashes action to kick out
        if (ps.defender.tryKickout()) {
            ps.attacker.state = 'standing';
            ps.defender.state = 'standing';
            this.pinText.setAlpha(0);
            const who = ps.defender === this.w1 ? 'p1' : 'p2';
            this._logEvent('kickout', { wrestler: who, atCount: count, defenderStamina: Math.round(ps.defender.stamina) });
            if (count >= 2) { this._logEvent('nearfall', { attacker: who === 'p1' ? 'p2' : 'p1' }); this.bumpHeat(22); }
            this.pinState = null;
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
            release(false); return;
        }
        if (ss.timer >= 4.0) {
            this._logEvent('sleeperKO', { winner: ss.attacker === this.w1 ? 'p1' : 'p2' });
            release(true); return;
        }
    }

    _tickHeadlock(dt) {
        const hs = this.headlockState;
        hs.timer += dt;

        // Attacker stands to the side — both face the same direction
        hs.attacker.x = hs.defender.x - hs.attacker.facing * 68 * hs.attacker.s;

        // Continuous stamina drain
        hs.defender._drain(3.0 * dt);

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

        if (hs.defender.tryHeadlockEscape()) { release(false); return; }
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

            if (goDown && ls.attacker.moveSet.includes('headlock')) {
                ls.attacker._doHeadlock(ls.defender);
                this.headlockState = { attacker: ls.attacker, defender: ls.defender, timer: 0 };
                this._logEvent('move', { attacker: who, move: 'headlock', defenderStamina: Math.round(ls.defender.stamina) });
            } else if (goUp && ls.attacker.moveSet.includes('suplex')) {
                ls.attacker._doSuplex(ls.defender);
                this._logEvent('move', { attacker: who, move: 'suplex', defenderStamina: Math.round(ls.defender.stamina) });
            } else if ((goLeft || goRight) && ls.attacker.moveSet.includes('irishWhip')) {
                ls.attacker._doIrishWhip(ls.defender, dir);
                this._logEvent('move', { attacker: who, move: 'irishWhip', defenderStamina: Math.round(ls.defender.stamina) });
            } else if (ls.attacker.moveSet.includes('piledriver')) {
                ls.attacker._doPiledriver(ls.defender);
                this._logEvent('knockdown', { attacker: who, move: 'piledriver', defenderStamina: Math.round(ls.defender.stamina) });
            } else if (ls.attacker.moveSet.includes('bodySlam')) {
                ls.attacker._doBodySlam(ls.defender);
                this._logEvent('knockdown', { attacker: who, move: 'bodySlam', defenderStamina: Math.round(ls.defender.stamina) });
            } else {
                ls.attacker._doIrishWhip(ls.defender, dir);
                this._logEvent('move', { attacker: who, move: 'irishWhip', defenderStamina: Math.round(ls.defender.stamina) });
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
        const txt = this.add.text(W / 2, H / 2, `PLAYER ${player} WINS`, {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '42px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            letterSpacing: 8,
        }).setOrigin(0.5).setDepth(200).setAlpha(0);

        this.tweens.add({ targets: txt, alpha: 1, duration: 400, ease: 'Linear' });

        // Reset after a few seconds
        this.time.delayedCall(4000, () => {
            this.tweens.add({
                targets: txt, alpha: 0, duration: 600, ease: 'Linear',
                onComplete: () => {
                    txt.destroy();
                    this.w1.x = 330; this.w1.y = 360; this.w1.state = 'standing'; this.w1.facing =  1; this.w1.stamina = 100;
                    this.w2.x = 630; this.w2.y = 360; this.w2.state = 'standing'; this.w2.facing = -1; this.w2.stamina = 100;
                },
            });
        });
    }

    update(time, delta) {
        this._tickGame(delta / 1000);

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
