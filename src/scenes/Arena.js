const W = 960;
const H = 600;

const RING = {
    nearLeft:  { x: 50,  y: 488 },
    nearRight: { x: 910, y: 488 },
    farLeft:   { x: 240, y: 205 },
    farRight:  { x: 720, y: 205 },
    ropes: [
        { nearY: 465, farY: 218 },
        { nearY: 445, farY: 210 },
        { nearY: 425, farY: 202 },
    ],
    apronY: 525,
};

export default class Arena extends Phaser.Scene {
    constructor() {
        super('Arena');
    }

    create() {
        this.drawArenaBackground();
        this.drawCrowd();
        this.drawFarApronAndRopes();
        this.drawRingMat();
        this.drawNearApron();
        this.drawNearAndSideRopes();
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
            cm.colorMatrix.contrast(0.18, true);
            cam.filters.external.addVignette(0.5, 0.5, 0.52, 0.9);
        } catch (e) {
            console.warn('Camera filters unavailable:', e.message);
        }

        this.showTitleCard();
    }

    drawArenaBackground() {
        const gfx = this.add.graphics().setDepth(0);
        gfx.fillStyle(0x060606, 1);
        gfx.fillRect(0, 0, W, H);

        // Warm light pooling above ring from arena lamps
        gfx.fillStyle(0x141410, 1);
        gfx.fillRect(160, 0, 640, 210);

        gfx.fillStyle(0x181810, 1);
        gfx.fillRect(80, 180, 800, 320);
    }

    drawCrowd() {
        const gfx = this.add.graphics().setDepth(1);

        let s = 7331;
        const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

        const rows = [
            { y: 185, r: 9,  count: 24, gap: 38 },
            { y: 163, r: 8,  count: 22, gap: 40 },
            { y: 143, r: 7,  count: 20, gap: 43 },
            { y: 124, r: 6,  count: 18, gap: 47 },
            { y: 107, r: 5,  count: 16, gap: 52 },
            { y: 91,  r: 5,  count: 15, gap: 55 },
            { y: 76,  r: 4,  count: 13, gap: 60 },
            { y: 62,  r: 4,  count: 12, gap: 65 },
            { y: 49,  r: 3,  count: 11, gap: 70 },
            { y: 37,  r: 3,  count: 10, gap: 78 },
        ];

        rows.forEach((row, i) => {
            const lum = Math.floor(14 + i * 1.5);
            const col = (lum << 16) | (lum << 8) | lum;
            gfx.fillStyle(col, 1);
            for (let j = 0; j < row.count; j++) {
                const t = j / (row.count - 1);
                const cx = 30 + t * 900 + (rand() - 0.5) * row.gap * 0.5;
                gfx.fillCircle(cx, row.y, row.r);
                gfx.fillEllipse(cx, row.y + row.r + row.r * 0.9, row.r * 2.8, row.r * 1.6);
            }
        });

        // Signs in crowd
        gfx.fillStyle(0x1e1e1e, 1);
        [[120, 90, 42, 20], [360, 75, 38, 18], [590, 82, 45, 22], [780, 70, 36, 17]].forEach(([x, y, w, h]) => {
            gfx.fillRect(x - w / 2, y - h / 2, w, h);
        });
    }

    drawFarApronAndRopes() {
        const gfx = this.add.graphics().setDepth(2);
        const { farLeft, farRight, ropes } = RING;

        gfx.fillStyle(0x909088, 1);
        gfx.fillRect(farLeft.x, farRight.y, farRight.x - farLeft.x, 16);

        ropes.forEach(rope => {
            gfx.lineStyle(1.5, 0xe0e0e0, 0.9);
            gfx.lineBetween(farLeft.x, rope.farY, farRight.x, rope.farY);
        });
    }

    drawRingMat() {
        const gfx = this.add.graphics().setDepth(3);
        const { nearLeft, nearRight, farLeft, farRight } = RING;

        gfx.fillStyle(0xd0d0c8, 1);
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

    drawNearAndSideRopes() {
        const gfx = this.add.graphics().setDepth(8);
        const { nearLeft, nearRight, farLeft, farRight, ropes } = RING;

        ropes.forEach(rope => {
            gfx.lineStyle(3, 0xf0f0f0, 1);
            gfx.lineBetween(nearLeft.x, rope.nearY, nearRight.x, rope.nearY);

            gfx.lineStyle(2, 0xe4e4e4, 0.85);
            gfx.lineBetween(nearLeft.x, rope.nearY, farLeft.x, rope.farY);

            gfx.lineStyle(2, 0xe4e4e4, 0.85);
            gfx.lineBetween(nearRight.x, rope.nearY, farRight.x, rope.farY);
        });
    }

    drawPosts() {
        const gfx = this.add.graphics().setDepth(9);
        const { nearLeft, nearRight, farLeft, farRight, ropes, apronY } = RING;
        const topRope = ropes[2];

        const posts = [
            { x: nearLeft.x,  top: topRope.nearY - 6, bot: apronY,         w: 8 },
            { x: nearRight.x, top: topRope.nearY - 6, bot: apronY,         w: 8 },
            { x: farLeft.x,   top: topRope.farY - 4,  bot: farLeft.y + 16, w: 5 },
            { x: farRight.x,  top: topRope.farY - 4,  bot: farRight.y + 16, w: 5 },
        ];

        posts.forEach(p => {
            gfx.fillStyle(0x686860, 1);
            gfx.fillRect(p.x - p.w / 2, p.top, p.w, p.bot - p.top);
            gfx.fillStyle(0x888880, 1);
            gfx.fillCircle(p.x, p.top, p.w * 0.8);
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

    update(time) {
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
