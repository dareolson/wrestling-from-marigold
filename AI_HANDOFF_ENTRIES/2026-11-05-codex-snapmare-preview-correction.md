# Snapmare: rear reversal and a separate front entry

2026-11-05 · Codex · Derek reports the snapmare now appears to come directly out of a front grapple and defies physics. He clarifies that a front snapmare can work, but its setup must differ.

Confirmed source of the preview error: `falls_probe.mjs` placed every throw face to face and directly called `a._doSnapmare(w)`. That clip expects the rear atomic-drop reversal (`faceToFace: false`). The harness bypassed the rear lift, role swap, and Arena head grips. Live gameplay still calls it through `Arena._beginSnapmare` from the atomic-drop reversal; no new front gameplay trigger was found. Old G2 snapmare film/metrics are invalid evidence of that reversal.

Fixed the preview harness: original lifter behind, same facing held during idle setup; start the atomic drop, reverse at 0.10 s via Arena's role swap and head-grip path. Clear pending landing/drop records between captures. Scripted reversal entry, not a test of input/kit/rope gates. No gameplay trigger or runtime clip changed.

[Corrected preview](../research/animation/falls-2026-11/snapmare-reversal-fix/index.html), both pairs/facings, normal and quarter speed. Fresh Node 22 snapmare/atomicDrop/waistlock tests: 35/35 pass. Syntax/diff checks pass. Saved rows check same-facing rear geometry and completion; browser captures complete for all four cases. Older G2 comparisons should be regenerated before relying on them.

For Opus: retain the rear reversal. A front version needs authored head/neck control, a turn/step into position, planted base and forward pull before the flip. Establish the required geometry rather than invoking the rear clip from face-to-face spacing. Derek permits considering the front entry; he has not approved the invalid preview.
