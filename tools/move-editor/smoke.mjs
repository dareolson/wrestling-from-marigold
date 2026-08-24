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


    // ── Onion skinning and timeline feedback ────────────────────────────────
    const feedback = await page.evaluate(async () => {
        const editor = window.__MOVE_EDITOR;
        await editor.loadLibraryDraft('hammerlock');
        // A time with a keyframe on both sides for the selected actor.
        editor.setPlayhead(0.2);
        editor.refreshOnionSkins();
        const skins = editor.onionSkins;
        const report = editor.readiness();

        const spans = [...document.querySelectorAll('#tracks .contact')].map(node => ({
            severity: node.dataset.severity ?? null,
            rejected: node.classList.contains('rejected'),
            title: node.title,
            label: node.querySelector('.label')?.textContent ?? '',
            left: node.style.left,
            width: node.style.width,
            interactive: getComputedStyle(node).pointerEvents !== 'none',
            hasAcquire: !!node.querySelector('.acquire'),
            hasRelease: !!node.querySelector('.release'),
        }));

        // Onion skins must not be mistakable for live parts: they add no
        // interactive object at all. Counted against the scene's own input list
        // with the skins off and on, so a ghost that quietly became draggable
        // would show up as a new hit target.
        const interactiveCount = () => editor.scene.input.list?.length ?? 0;
        document.getElementById('onionSkin').checked = false;
        editor.refreshOnionSkins();
        const withoutSkins = interactiveCount();
        document.getElementById('onionSkin').checked = true;
        editor.refreshOnionSkins();
        const withSkins = interactiveCount();

        // A REQUIRED contact nothing could close must block, and the same one
        // marked optional must not. Measured on the same live rig, on a pair
        // that genuinely cannot meet: an ankle onto the other wrestler's neck.
        const model = await import('/tools/move-editor/model.js');
        const impossible = (() => {
            const probe = model.normalizeDraft(editor.draft);
            probe.contacts = [{ from: 0.2, to: 1.2, role: 'attacker', source: 'nearAnkle', target: 'neck', required: true }];
            const required = editor.readinessFor(probe);
            probe.contacts[0].required = false;
            const optional = editor.readinessFor(probe);
            return {
                severity: required.contacts[0]?.severity,
                blocked: required.ok === false && required.blocking.some(issue => /beyond the/.test(issue)),
                blocking: required.blocking,
                optionalIsWarning: optional.ok === true && optional.warnings.some(warning => /\[optional\]/.test(warning)),
            };
        })();
        model.addContact(editor.draft, { from: 0.3, role: 'attacker', source: 'nearWrist', target: 'sternum' });
        const afterBadCapture = editor.readiness();
        const rejectedSpans = [...document.querySelectorAll('#tracks .contact.rejected')].length;

        return {
            skins: {
                previous: skins.previous ? { at: skins.previous.at, joints: Object.keys(skins.previous.joints).length } : null,
                next: skins.next ? { at: skins.next.at, joints: Object.keys(skins.next.joints).length } : null,
            },
            spans,
            withoutSkins,
            withSkins,
            contactSeverity: report.contacts.map(contact => `${contact.source}->${contact.target}:${contact.severity}@${Math.round(contact.maxGap)}px/reach${Math.round(contact.reachPx ?? -1)}`),
            findings: report.findings.map(finding => `${finding.layer}/${finding.severity}`),
            warnings: report.warnings,
            impossible,
            rejectedSpans,
            badCaptureBlocking: afterBadCapture.blocking,
            badCaptureFindings: afterBadCapture.findings.map(finding => finding.layer),
        };
    });
    if (!feedback.skins.previous || !feedback.skins.next) {
        throw new Error(`onion skins did not resolve both neighbours: ${JSON.stringify(feedback.skins)}`);
    }
    if (!(feedback.skins.previous.at < 0.2 && feedback.skins.next.at > 0.2)) {
        throw new Error(`onion skins are not the ADJACENT keyframes: ${JSON.stringify(feedback.skins)}`);
    }
    if (feedback.skins.previous.joints < 8 || feedback.skins.next.joints < 8) {
        throw new Error('an onion skin carries too few joints to read as a body');
    }
    if (feedback.withSkins !== feedback.withoutSkins) {
        throw new Error(`onion skins added ${feedback.withSkins - feedback.withoutSkins} interactive object(s) — a ghost must never be selectable`);
    }
    if (!feedback.spans.length) throw new Error('the declared hold is not drawn on the timeline');

    const span = feedback.spans[0];
    if (!span.hasAcquire || !span.hasRelease) throw new Error('the contact span shows no acquisition/release ticks');
    if (!/nearWrist→nearWrist/.test(span.label)) throw new Error(`the span does not name the connected joints: ${span.label}`);
    if (!/held 0\.12/.test(span.title)) throw new Error(`the span does not state its maintained window: ${span.title}`);
    if (span.interactive) throw new Error('contact spans are interactive and can swallow a keyframe click');
    if (span.severity !== 'held') {
        throw new Error(`the hammerlock hold must be genuinely made on the live rig, got "${span.severity}"`);
    }
    const graded = feedback.contactSeverity.find(entry => /nearWrist->nearWrist/.test(entry));
    if (!/held/.test(graded ?? '')) {
        throw new Error(`readiness did not grade the hold as held: ${feedback.contactSeverity.join(', ')}`);
    }
    // A required contact that no pose could close must BLOCK, not warn — that
    // is what makes READY mean the move does what it says. Proved here by
    // declaring an impossible one on the same live rig.
    if (!feedback.impossible.blocked) {
        throw new Error(`an unreachable required contact did not block readiness: ${feedback.impossible.blocking.join(' | ')}`);
    }
    if (!feedback.impossible.optionalIsWarning) {
        throw new Error('the same contact marked optional should warn rather than block');
    }
    if (!feedback.rejectedSpans) throw new Error('a discarded capture is invisible on the timeline');
    if (!feedback.badCaptureBlocking.some(issue => /^\[authoring-data\] discarded contact/.test(issue))) {
        throw new Error(`a discarded capture was not blocked with its layer: ${feedback.badCaptureBlocking.join(' | ')}`);
    }

    // ── Undo / redo across every kind of authoring mutation ─────────────────
    // The hammerlock draft is loaded at this point, so these run against a real
    // paired move rather than an empty one.
    const undoRedo = await page.evaluate(async () => {
        const editor = window.__MOVE_EDITOR;
        const snapshot = () => JSON.stringify({
            draft: editor.draft,
            pose: { ...editor.actors.attacker.pose },
            transform: { ...editor.actors.attacker.transform },
            parts: { ...editor.actors.attacker.parts },
            facing: editor.actors.attacker.facing,
        });
        const $ = id => document.getElementById(id);
        // Park the playhead first: moving it re-samples the draft into the live
        // actors, which is a VIEW change rather than an authoring mutation, so
        // the baseline has to be taken after it.
        editor.setPlayhead(0.6);
        const baseline = snapshot();

        const steps = [];
        $('pose-lArm').value = 1.11;
        $('pose-lArm').dispatchEvent(new Event('input', { bubbles: true }));
        steps.push('pose');
        $('root-x').value = -42;
        $('root-x').dispatchEvent(new Event('input', { bubbles: true }));
        steps.push('staging');
        $('captureBtn').click();
        steps.push('keyframe insertion');
        $('eventType').value = 'proof-marker';
        $('addEventBtn').click();
        steps.push('event');
        $('contactSource').value = 'nearAnkle';
        $('contactTarget').value = 'nearKnee';
        $('snapContactBtn').click();
        steps.push('contact snap');
        $('captureBtn').click();
        steps.push('contact capture');
        $('ease').value = 'step';
        $('ease').dispatchEvent(new Event('change', { bubbles: true }));
        steps.push('timing/easing');
        $('deleteBtn').click();
        steps.push('keyframe deletion');

        const afterAll = snapshot();
        const changed = afterAll !== baseline;

        // Undo everything, one step at a time, and check the state is coherent
        // at every stop — not merely that the last one lands back at baseline.
        const incoherent = [];
        for (let i = 0; i < steps.length; i++) {
            editor.undo();
            const state = JSON.parse(snapshot());
            for (const role of ['attacker', 'defender']) {
                const frames = state.draft.tracks[role]?.keyframes ?? [];
                if (!frames.length) incoherent.push(`${role} lost every keyframe after undo ${i + 1}`);
                if (frames.some(frame => !Number.isFinite(frame.at))) incoherent.push(`${role} has a non-finite keyframe time after undo ${i + 1}`);
            }
            if (!Number.isFinite(state.draft.duration)) incoherent.push(`duration is not finite after undo ${i + 1}`);
        }
        const afterUndoAll = snapshot();
        for (let i = 0; i < steps.length; i++) editor.redo();
        const afterRedoAll = snapshot();

        // And the keyboard path, which is what an author actually uses.
        $('pose-rArm').value = 0.99;
        $('pose-rArm').dispatchEvent(new Event('input', { bubbles: true }));
        const beforeKey = snapshot();
        document.activeElement?.blur?.();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
        const afterKeyUndo = snapshot();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }));
        const afterKeyRedo = snapshot();

        return {
            steps, changed, incoherent,
            restoredBaseline: afterUndoAll === baseline,
            restoredEnd: afterRedoAll === afterAll,
            keyUndoWorked: afterKeyUndo !== beforeKey,
            keyRedoWorked: afterKeyRedo === beforeKey,
        };
    });
    if (!undoRedo.changed) throw new Error('the authoring mutations changed nothing — the undo test would be vacuous');
    if (undoRedo.incoherent.length) throw new Error(`undo left an incoherent state: ${undoRedo.incoherent.join(' | ')}`);
    if (!undoRedo.restoredBaseline) throw new Error(`undoing ${undoRedo.steps.length} mutations did not restore the full authoring state`);
    if (!undoRedo.restoredEnd) throw new Error('redo did not restore the state undo removed');
    if (!undoRedo.keyUndoWorked) throw new Error('Ctrl+Z did not undo');
    if (!undoRedo.keyRedoWorked) throw new Error('Ctrl+Shift+Z did not redo');

    // ── Autosave and recovery ───────────────────────────────────────────────
    const autosaved = await page.evaluate(async () => {
        const editor = window.__MOVE_EDITOR;
        editor.writeAutosave();
        const raw = JSON.parse(localStorage.getItem(editor.AUTOSAVE_KEY));
        const model = await import('/tools/move-editor/model.js');
        return {
            key: editor.AUTOSAVE_KEY,
            id: raw?.draft?.id,
            schema: raw?.draft?.schema,
            version: raw?.draft?.version,
            savedAt: raw?.savedAt,
            expectedSchema: model.DRAFT_SCHEMA,
            expectedVersion: model.DRAFT_VERSION,
            hasContacts: Array.isArray(raw?.draft?.contacts),
        };
    });
    if (autosaved.schema !== autosaved.expectedSchema || autosaved.version !== autosaved.expectedVersion) {
        throw new Error(`autosave is not schema-stamped: ${JSON.stringify(autosaved)}`);
    }
    if (!autosaved.savedAt || !autosaved.hasContacts) {
        throw new Error(`autosave dropped authoring metadata: ${JSON.stringify(autosaved)}`);
    }

    // A reload must OFFER the draft back, not load it silently.
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__MOVE_EDITOR?.actors?.attacker?.skeleton);
    await page.waitForTimeout(300);
    const recovery = await page.evaluate(() => ({
        visible: !document.getElementById('recovery').hidden,
        text: document.getElementById('recoveryText').textContent,
        restoreEnabled: !document.getElementById('restoreDraftBtn').disabled,
        loadedId: window.__MOVE_EDITOR.draft.id,
    }));
    if (!recovery.visible) throw new Error('a recoverable autosave was not offered after reload');
    if (recovery.loadedId === autosaved.id && autosaved.id !== 'untitled_move') {
        throw new Error('the autosaved draft was loaded silently instead of being offered');
    }
    if (!recovery.restoreEnabled) throw new Error(`a compatible autosave was not restorable: ${recovery.text}`);
    const restored = await page.evaluate(() => {
        document.getElementById('restoreDraftBtn').click();
        return { id: window.__MOVE_EDITOR.draft.id, hidden: document.getElementById('recovery').hidden };
    });
    if (restored.id !== autosaved.id) throw new Error(`restore loaded "${restored.id}" instead of "${autosaved.id}"`);
    if (!restored.hidden) throw new Error('the recovery prompt stayed up after restoring');

    // An INCOMPATIBLE autosave must be refused with a reason, must not be
    // restorable, and must NOT be overwritten while the author decides.
    const incompatible = await page.evaluate(async () => {
        const editor = window.__MOVE_EDITOR;
        const poisoned = JSON.stringify({ savedAt: new Date().toISOString(), draft: { schema: 'wfm.move-draft', version: 9999, id: 'from_the_future', tracks: {} } });
        localStorage.setItem(editor.AUTOSAVE_KEY, poisoned);
        editor.offerRecovery();
        const offered = {
            visible: !document.getElementById('recovery').hidden,
            text: document.getElementById('recoveryText').textContent,
            restoreEnabled: !document.getElementById('restoreDraftBtn').disabled,
        };
        // Author keeps editing while the prompt is up — storage must not move.
        editor.mutate('probe', () => { editor.draft.id = 'scribble'; });
        editor.writeAutosave();
        const afterEditing = localStorage.getItem(editor.AUTOSAVE_KEY);
        // Explicitly discarding is the only thing that clears it.
        editor.resolveRecovery('discard');
        editor.writeAutosave();
        const afterDiscard = JSON.parse(localStorage.getItem(editor.AUTOSAVE_KEY));
        return { offered, preserved: afterEditing === poisoned, afterDiscardId: afterDiscard?.draft?.id };
    });
    if (!incompatible.offered.visible) throw new Error('an incompatible autosave was not reported at all');
    if (incompatible.offered.restoreEnabled) throw new Error('an incompatible autosave was offered as restorable');
    if (!/9999|newer editor/.test(incompatible.offered.text)) {
        throw new Error(`the refusal did not name the reason: ${incompatible.offered.text}`);
    }
    if (!incompatible.preserved) throw new Error('an incompatible autosave was silently overwritten while the author was deciding');
    if (incompatible.afterDiscardId !== 'scribble') throw new Error('autosave did not resume after an explicit discard');

    // The export dialog was already closed above, before the readiness sweep.
    if (process.env.SCREENSHOT) {
        await page.screenshot({ path: process.env.SCREENSHOT, fullPage: true });
    }
    if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
    const finalContacts = await page.evaluate(() => window.__MOVE_EDITOR.draft.contacts.map(c => `${c.role} ${c.source}→${c.target}`));
    console.log(`PASS move editor connected drag, two-role timeline, capture, marker, export, and readiness sweep (${readiness.report.sampledTimes} frames, contact worst gap ${contact.maxGap.toFixed(2)} px at ${contact.worstAt.toFixed(3)}s)`);
    console.log(`     contact contract: ${contactOptions.sourceUI.length} sources / ${contactOptions.targetUI.length} targets built from the model; bad joint refused and blocked readiness`);
    console.log(`     hammerlock draft: loaded from the library, READY, staged roles [${hammerlock.report.stagedRoles}], entry tableau ${JSON.stringify(hammerlock.report.entryTableau)}`);
    console.log(`     onion skins: previous @${feedback.skins.previous.at}s / next @${feedback.skins.next.at}s, drawn as non-interactive wire chains; timeline shows ${feedback.spans.length} contact span(s) with acquisition/release ticks and ${feedback.rejectedSpans} discarded capture(s)`);
    console.log(`     readiness attribution: ${feedback.contactSeverity.join(', ')}`);
    console.log(`     undo/redo: ${undoRedo.steps.length} mutation kinds (${undoRedo.steps.join(', ')}) undone and redone to an identical full authoring state, keyboard included`);
    console.log(`     autosave: schema-stamped, offered (never silently loaded) after reload, restored on request; an incompatible draft is refused with a reason and left untouched until discarded`);
    console.log(`     hammerlock hold: ${span.severity.toUpperCase()} on the live reference rig; an unreachable REQUIRED contact blocks readiness, the same contact marked optional only warns`);
    console.log(`     hammerlock export matches the shipped clip across 241 sampled frames; declared hold ${hold.role} ${hold.source}→${hold.target} ${hold.from}–${hold.to}s measured over ${hold.measured} live frames, worst gap ${hold.maxGap.toFixed(2)} px at ${hold.worstAt.toFixed(3)}s`);
} finally {
    await browser.close();
}
