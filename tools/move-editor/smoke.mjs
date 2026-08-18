import { chromium } from 'playwright-core';

const url = process.env.WFM_URL ?? 'http://127.0.0.1:5198/tools/move-editor/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

try {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__MOVE_EDITOR?.actors?.attacker?.skeleton);
    await page.waitForSelector('#stage canvas');
    await page.waitForTimeout(500);
    const certification = await page.textContent('#certification');
    if (!certification.includes('PASS')) {
        throw new Error(`reference rig did not pass live certification: ${certification}; browser errors: ${errors.join(' | ')}`);
    }

    const initial = await page.evaluate(() => ({
        draft: window.__MOVE_EDITOR.draft,
        wrist: window.__MOVE_EDITOR.actors.attacker.skeleton.jointAttachmentPoints.nearWrist,
        pose: { ...window.__MOVE_EDITOR.actors.attacker.pose },
    }));
    if (Object.keys(initial.draft.tracks).join(',') !== 'attacker,defender') {
        throw new Error('editor did not create synchronized attacker/defender tracks');
    }

    // ── Shared tableau origin ────────────────────────────────────────────────
    // The preview used to place each role from its OWN base position, so a draft
    // with both roles at transform.x = 0 read as a wide tie-up on screen and
    // staged the two wrestlers on top of each other in the ring. The preview must
    // resolve staging through the SAME function the runtime does.
    const staging = await page.evaluate(async () => {
        const editor = window.__MOVE_EDITOR;
        const { stagedWorldPoint } = await import('/src/animation/clipStaging.js');
        const model = await import('/tools/move-editor/model.js');
        const frame = () => ({
            originX: editor.TABLEAU_ORIGIN.x,
            originY: editor.TABLEAU_ORIGIN.y,
            facing: editor.stagingFacing(),
            scale: editor.SCALE,
        });
        const compare = () => Object.fromEntries(['attacker', 'defender'].map(role => {
            const root = editor.actorRoot(role);
            const runtime = stagedWorldPoint(frame(), editor.actors[role].transform);
            return [role, { root, runtime, agree: Math.hypot(root.x - runtime.x, root.y - runtime.y) }];
        }));
        const facingRight = compare();
        editor.actors[editor.ANCHOR_ROLE].facing = -1;
        const facingLeft = compare();
        editor.actors[editor.ANCHOR_ROLE].facing = 1;
        return {
            anchorRole: editor.ANCHOR_ROLE,
            entrySeparation: model.DEFAULT_ENTRY_SEPARATION,
            defenderEntryX: editor.draft.tracks.defender.keyframes[0].transform.x,
            scale: editor.SCALE,
            facingRight,
            facingLeft,
        };
    });
    for (const [facing, frames] of [['+1', staging.facingRight], ['-1', staging.facingLeft]]) {
        for (const [role, entry] of Object.entries(frames)) {
            if (entry.agree > 1e-9) {
                throw new Error(`editor preview places ${role} at ${JSON.stringify(entry.root)} but the runtime staging resolver says ${JSON.stringify(entry.runtime)} (facing ${facing})`);
            }
        }
    }
    if (staging.defenderEntryX !== staging.entrySeparation) {
        throw new Error(`a fresh paired draft must open at the real tie-up separation (${staging.entrySeparation}), got ${staging.defenderEntryX}`);
    }
    {
        const right = staging.facingRight.defender.root.x - staging.facingRight.attacker.root.x;
        const left = staging.facingLeft.defender.root.x - staging.facingLeft.attacker.root.x;
        if (Math.abs(Math.abs(right) - Math.abs(left)) > 1e-9 || Math.sign(right) === Math.sign(left)) {
            throw new Error(`the tableau must mirror rigidly about the anchor facing: +1 gap ${right}, -1 gap ${left}`);
        }
        if (Math.abs(right - staging.entrySeparation * staging.scale) > 1e-9) {
            throw new Error(`on-screen separation ${right} does not match the authored ${staging.entrySeparation} rig units at scale ${staging.scale}`);
        }
    }

    const canvas = await page.locator('#stage canvas').boundingBox();
    const internal = await page.locator('#stage canvas').evaluate(node => ({ width: node.width, height: node.height }));
    const screen = point => ({
        x: canvas.x + point.x / internal.width * canvas.width,
        y: canvas.y + point.y / internal.height * canvas.height,
    });
    const start = screen(initial.wrist);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 55, start.y - 45, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const after = await page.evaluate(() => ({
        wrist: window.__MOVE_EDITOR.actors.attacker.skeleton.jointAttachmentPoints.nearWrist,
        pose: { ...window.__MOVE_EDITOR.actors.attacker.pose },
        joints: window.__MOVE_EDITOR.actors.attacker.skeleton.jointAttachmentPoints,
    }));
    if (Math.hypot(after.wrist.x - initial.wrist.x, after.wrist.y - initial.wrist.y) < 20) {
        throw new Error('dragging the wrist did not move the connected chain');
    }
    if (after.pose.lArm === initial.pose.lArm && after.pose.lElbow === initial.pose.lElbow) {
        throw new Error('wrist drag did not author shoulder/elbow channels');
    }
    for (const name of ['nearShoulder', 'nearElbow', 'nearWrist', 'nearHip', 'nearKnee', 'nearAnkle']) {
        if (!Number.isFinite(after.joints[name]?.x) || !Number.isFinite(after.joints[name]?.y)) {
            throw new Error(`${name} is not finite after connected drag`);
        }
    }

    const variantChoices = await page.evaluate(() => {
        const row = [...document.querySelectorAll('#variantControls .row')]
            .find(node => node.querySelector('label')?.textContent === 'nearHand');
        const select = row?.querySelector('select');
        if (!select) return [];
        select.value = 'grip';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return [...select.options].map(option => option.value);
    });
    if (!variantChoices.includes('fist') || !variantChoices.includes('grip')) {
        throw new Error('reference-rig hand variants did not populate the editor');
    }

    // The contact dropdowns must be built from the model constants — every joint
    // the model accepts is offered, and nothing else. This is the drift that let
    // `neck` be offered but silently discarded, and elbows/ankles be valid but
    // unreachable.
    const contactOptions = await page.evaluate(async () => {
        const model = await import('/tools/move-editor/model.js');
        const read = id => [...document.getElementById(id).options].map(option => option.value);
        return {
            sourceUI: read('contactSource'),
            targetUI: read('contactTarget'),
            sourceModel: [...model.CONTACT_SOURCES],
            targetModel: [...model.CONTACT_TARGETS],
        };
    });
    for (const [kind, ui, expected] of [
        ['source', contactOptions.sourceUI, contactOptions.sourceModel],
        ['target', contactOptions.targetUI, contactOptions.targetModel],
    ]) {
        if (ui.join(',') !== expected.join(',')) {
            throw new Error(`contact ${kind} dropdown drifted from the model: UI [${ui}] vs model [${expected}]`);
        }
    }
    if (!contactOptions.targetUI.includes('neck')) {
        throw new Error('neck is not reachable as a contact target');
    }
    for (const previouslyUnreachable of ['nearElbow', 'farElbow', 'nearAnkle', 'farAnkle']) {
        if (!contactOptions.targetUI.includes(previouslyUnreachable)) {
            throw new Error(`${previouslyUnreachable} is still unreachable in the UI`);
        }
    }

    await page.click('#snapContactBtn');
    await page.waitForTimeout(100);
    const contactGap = await page.textContent('#contactGap');
    if (!contactGap.includes('Capture the keyframe')) {
        throw new Error(`contact snap did not report a baked result: ${contactGap}`);
    }
    const measuredGap = Number(contactGap.match(/: ([\d.]+) px gap/)?.[1]);
    if (!Number.isFinite(measuredGap) || measuredGap > 0.1) {
        throw new Error(`contact snap left ${measuredGap}px instead of exact contact`);
    }

    await page.click('#captureBtn');
    await page.fill('#time', '0.4');
    await page.dispatchEvent('#time', 'change');
    await page.click('#captureBtn');
    await page.click('#addEventBtn');
    await page.click('#exportBtn');
    const exported = await page.inputValue('#exportText');
    if (!exported.includes('tracks:') || !exported.includes('events:')) {
        throw new Error('clip export omitted tracks or events');
    }
    if (!exported.includes('nearHand: "grip"')) {
        throw new Error('selected hand variant was not captured into clip export');
    }
    // Editor-only authoring metadata must never reach the exported clip data.
    if (exported.includes('contacts') || exported.includes('posture')) {
        throw new Error('export leaked editor-only metadata into gameplay clip data');
    }

    // Production readiness: the whole-clip sweep, not the current-pose badge.
    await page.click('#exportDialog button:last-child');
    const readiness = await page.evaluate(() => {
        const report = window.__MOVE_EDITOR.readiness();
        return { report, text: document.getElementById('readiness').textContent };
    });
    if (readiness.report.sampledTimes <= 1) {
        throw new Error(`readiness swept ${readiness.report.sampledTimes} frames instead of the whole clip`);
    }
    if (!readiness.report.stagedRoles.length) {
        throw new Error('readiness did not report which roles the runtime will stage');
    }
    // The snap-and-bake contact captured above is exact on its own keyframe; the
    // point of the sweep is that it re-measures the pair BETWEEN keyframes.
    const contact = readiness.report.contacts[0];
    if (!contact) throw new Error('captured contact snap was not recorded as a declared contact pair');
    if (!contact.measured) throw new Error('declared contact was never measured against the live rig');
    if (!Number.isFinite(contact.maxGap)) throw new Error(`contact gap is not finite: ${contact.maxGap}`);
    if (!readiness.text.includes('worst gap')) {
        throw new Error(`readiness panel did not report the authored contact gap: ${readiness.text}`);
    }
    // A drifting contact is reported, and reported as a warning — snap-and-bake
    // stays a legal authoring choice in this milestone.
    if (contact.maxGap > 1 && !readiness.report.warnings.some(w => /separates to/.test(w))) {
        throw new Error('a drifting contact was measured but not surfaced to the author');
    }
    // The contact holds over an interval, and an unreleased one runs to the end.
    if (!(contact.from >= 0) || contact.to !== readiness.report.contacts[0].to) {
        throw new Error(`contact interval is malformed: ${JSON.stringify(contact)}`);
    }
    const duration = await page.evaluate(() => window.__MOVE_EDITOR.draft.duration);
    if (contact.to !== duration) {
        throw new Error(`an unreleased contact should hold to ${duration}s, got ${contact.to}`);
    }

    // Entry tableau: under the shared-origin contract this is where the runtime
    // PLACES both actors at t=0, so the author has to be able to see it.
    if (!readiness.report.entryTableau || !readiness.report.anchorRole) {
        throw new Error('readiness did not report the entry tableau');
    }
    if (!readiness.text.includes('Entry tableau')) {
        throw new Error(`readiness panel did not surface the entry tableau: ${readiness.text}`);
    }

    // Releasing narrows the graded window rather than deleting the contact.
    const released = await page.evaluate(() => {
        window.__MOVE_EDITOR.setPlayhead(0.25);
        document.getElementById('releaseContactBtn').click();
        const report = window.__MOVE_EDITOR.readiness();
        return { contact: report.contacts[0], status: document.getElementById('status').textContent };
    });
    if (released.contact.to !== 0.25) {
        throw new Error(`release did not close the contact at the playhead: to=${released.contact.to}`);
    }
    if (released.contact.graded >= contact.graded) {
        throw new Error(`releasing did not narrow the graded window: ${contact.graded} → ${released.contact.graded}`);
    }
    if (!released.status.includes('Released')) {
        throw new Error(`release was not reported to the author: ${released.status}`);
    }

    // Capture a NECK contact — the target the old markup offered and the model
    // silently discarded — and a previously unreachable ankle target, both
    // through the real snap + capture gesture.
    for (const [source, target] of [['nearWrist', 'neck'], ['nearAnkle', 'nearKnee']]) {
        const captured = await page.evaluate(async ([src, tgt]) => {
            const editor = window.__MOVE_EDITOR;
            editor.setPlayhead(0.6);
            document.getElementById('contactSource').value = src;
            document.getElementById('contactTarget').value = tgt;
            document.getElementById('snapContactBtn').click();
            document.getElementById('captureBtn').click();
            const report = editor.readiness();
            return {
                status: document.getElementById('status').textContent,
                declared: editor.draft.contacts.map(c => `${c.source}->${c.target}`),
                rejected: editor.draft.rejectedContacts.map(c => `${c.source}->${c.target}: ${c.reason}`),
                blocking: report.blocking,
                measured: report.contacts.find(c => c.source === src && c.target === tgt)?.measured ?? 0,
            };
        }, [source, target]);

        if (captured.rejected.length) {
            throw new Error(`${source} → ${target} was discarded: ${captured.rejected.join(' | ')}`);
        }
        if (!captured.declared.includes(`${source}->${target}`)) {
            throw new Error(`${source} → ${target} was not recorded on the draft: ${captured.declared.join(', ')}`);
        }
        if (!captured.status.includes('acquired')) {
            throw new Error(`${source} → ${target} acquisition was not reported to the author: ${captured.status}`);
        }
        // And it is actually graded against the live rig, not merely stored.
        if (!captured.measured) {
            throw new Error(`${source} → ${target} was declared but never measured against the live rig`);
        }
        if (captured.blocking.some(issue => /discarded contact/.test(issue))) {
            throw new Error(`readiness reported a discard for a valid pair: ${captured.blocking.join(' | ')}`);
        }
    }

    // A capture the model cannot grade must be REFUSED LOUDLY and must block
    // readiness — never filtered away behind the author's back.
    const refused = await page.evaluate(async () => {
        const editor = window.__MOVE_EDITOR;
        const model = await import('/tools/move-editor/model.js');
        const result = model.addContact(editor.draft, { from: 0.5, role: 'attacker', source: 'nearWrist', target: 'sternum' });
        const report = editor.readiness();
        return {
            ok: result.ok,
            reason: result.reason,
            rejected: editor.draft.rejectedContacts.length,
            blocked: report.ok === false && report.blocking.some(issue => /discarded contact/.test(issue) && /sternum/.test(issue)),
            panel: document.getElementById('readiness').textContent,
        };
    });
    if (refused.ok) throw new Error('an unknown joint was accepted as a contact target');
    if (!/sternum/.test(refused.reason ?? '')) throw new Error(`refusal did not name the bad joint: ${refused.reason}`);
    if (refused.rejected !== 1) throw new Error(`discard was not recorded on the draft (${refused.rejected})`);
    if (!refused.blocked) throw new Error(`a discarded contact did not block readiness: ${refused.panel}`);

    // ── The hammerlock authoring path, end to end, in the real editor ────────
    // Load the committed draft through the library control, sweep it against the
    // LIVE reference rigs, export it, and check the export describes the same
    // move as the clip the game ships. This is the editor half of the path; the
    // runtime half is tools/debug/hammerlock_authoring_proof.mjs.
    const hammerlock = await page.evaluate(async () => {
        const editor = window.__MOVE_EDITOR;
        await editor.loadLibraryDraft('hammerlock');
        const report = editor.readiness();
        const model = await import('/tools/move-editor/model.js');
        const shipped = await import('/src/animation/clips/hammerlock.js');
        const { compileClip, sampleClip } = await import('/src/animation/AnimationClip.js');

        // Semantic comparison: same sampled behaviour at a dense set of times,
        // not a byte comparison of two differently formatted objects.
        const exported = model.exportClip(editor.draft);
        const a = compileClip(exported);
        const b = compileClip(shipped.hammerlockClip);
        const mismatches = [];
        for (let i = 0; i <= 240; i++) {
            const at = shipped.HAMMERLOCK_DURATION * (i / 240);
            const sa = sampleClip(a, at);
            const sb = sampleClip(b, at);
            for (const role of Object.keys(sb.tracks)) {
                for (const group of ['pose', 'transform']) {
                    for (const [channel, value] of Object.entries(sb.tracks[role][group])) {
                        const mine = sa.tracks[role][group][channel];
                        if (!(Math.abs(mine - value) < 1e-9)) mismatches.push(`${role}.${group}.${channel}@${at.toFixed(3)}: ${mine} vs ${value}`);
                    }
                }
                if (JSON.stringify(sa.tracks[role].parts) !== JSON.stringify(sb.tracks[role].parts)) {
                    mismatches.push(`${role}.parts@${at.toFixed(3)}: ${JSON.stringify(sa.tracks[role].parts)} vs ${JSON.stringify(sb.tracks[role].parts)}`);
                }
            }
        }
        return {
            id: editor.draft.id,
            roles: Object.keys(editor.draft.tracks),
            contacts: editor.draft.contacts.map(c => ({ ...c })),
            rejected: editor.draft.rejectedContacts.length,
            report,
            mismatches: mismatches.slice(0, 5),
            events: exported.events.map(event => `${event.type}@${event.at}`),
            shippedEvents: shipped.hammerlockClip.events.map(event => `${event.type}@${event.at}`),
            panel: document.getElementById('readiness').textContent,
        };
    });
    if (hammerlock.id !== 'hammerlock') throw new Error(`the draft library did not load the hammerlock: ${hammerlock.id}`);
    if (hammerlock.roles.join(',') !== 'attacker,defender') throw new Error('the loaded hammerlock is not a paired draft');
    if (hammerlock.mismatches.length) throw new Error(`editor export drifted from the shipped clip: ${hammerlock.mismatches.join(' | ')}`);
    if (hammerlock.events.join(',') !== hammerlock.shippedEvents.join(',')) {
        throw new Error(`event markers drifted: ${hammerlock.events} vs ${hammerlock.shippedEvents}`);
    }
    if (!hammerlock.report.ok) throw new Error(`the shipped hammerlock draft is NOT ready: ${hammerlock.report.blocking.join(' | ')}`);
    if (hammerlock.rejected) throw new Error('the hammerlock draft carries discarded contacts');
    if (hammerlock.report.stagedRoles.join(',') !== 'attacker,defender') {
        throw new Error(`the hammerlock must stage both actors, got [${hammerlock.report.stagedRoles}]`);
    }
    // The declared hold has to be MEASURED against the live rig, not merely
    // stored — an unmeasured contact is the "green but nothing was verified"
    // pattern this whole layer exists to prevent.
    const hold = hammerlock.report.contacts.find(contact => contact.source === 'nearWrist' && contact.target === 'nearWrist');
    if (!hold) throw new Error('the hammerlock draft declares no wrist-to-wrist hold');
    if (!hold.measured) throw new Error('the declared hold was never measured against the live rig');
    if (!Number.isFinite(hold.maxGap)) throw new Error(`hold gap is not finite: ${hold.maxGap}`);
    if (!(hold.from > 0 && hold.to === hammerlock.report.contacts[0].to)) {
        throw new Error(`the hold is not an interval: ${JSON.stringify(hold)}`);
    }

    // The export dialog was already closed above, before the readiness sweep.
    if (process.env.SCREENSHOT) {
        await page.screenshot({ path: process.env.SCREENSHOT, fullPage: true });
    }
    if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
    const finalContacts = await page.evaluate(() => window.__MOVE_EDITOR.draft.contacts.map(c => `${c.role} ${c.source}→${c.target}`));
    console.log(`PASS move editor connected drag, two-role timeline, capture, marker, export, and readiness sweep (${readiness.report.sampledTimes} frames, contact worst gap ${contact.maxGap.toFixed(2)} px at ${contact.worstAt.toFixed(3)}s)`);
    console.log(`     contact contract: ${contactOptions.sourceUI.length} sources / ${contactOptions.targetUI.length} targets built from the model; bad joint refused and blocked readiness`);
    console.log(`     hammerlock draft: loaded from the library, READY, staged roles [${hammerlock.report.stagedRoles}], entry tableau ${JSON.stringify(hammerlock.report.entryTableau)}`);
    console.log(`     hammerlock export matches the shipped clip across 241 sampled frames; declared hold ${hold.role} ${hold.source}→${hold.target} ${hold.from}–${hold.to}s measured over ${hold.measured} live frames, worst gap ${hold.maxGap.toFixed(2)} px at ${hold.worstAt.toFixed(3)}s`);
} finally {
    await browser.close();
}
