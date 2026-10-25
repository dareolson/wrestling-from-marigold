// Page-side helper for the back-sell measuring tools (recovery_probe, hold_weight_sweep).
// A rig that has a backWaist but no `backSell` yet is unsupported, so the game's own solver would aim at the
// hip joint instead of the anchor. To measure such a rig the tools install PROVISIONAL numbers on the live
// page's texture config (never saved, never in src) so the real solver and the real contact run, and report
// that they did. The provisional values change nothing that is measured: holdW 1 and zero offsets are inputs
// the tools sweep over, and contactPx is only the pass line the tools print against.
export const PROVISIONAL_CONTACT_PX = 15;
export const INSTALL_PROVISIONAL_BACK_SELL = `(async () => {
    const sk = window.__WFM_GAME.scene.scenes[0].w1.skeleton, t = sk._textureConfig;
    const { backSellSupport } = await import('/src/rig/backSell.js');
    const had = !!t.backSell;
    if (!had) t.backSell = { holdW: 1, recoveryArm: 0, recoveryElbow: 0, settledElbow: 0.7, contactPx: ${PROVISIONAL_CONTACT_PX}, evidence: 'provisional probe values (tools/debug/backsell_probe_support.mjs), not saved' };
    const s = backSellSupport(sk);
    return { rig: new URLSearchParams(location.search).get('p1'), hadBackSell: had, ok: s.ok, reason: s.reason, gripArt: s.gripArt, contact: s.contact,
        contactPx: t.backSell.contactPx, provisional: !had };
})()`;
