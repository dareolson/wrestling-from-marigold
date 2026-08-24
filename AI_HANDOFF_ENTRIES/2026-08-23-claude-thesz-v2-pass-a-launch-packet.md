# Thesz v2 — Pass A launch packet (record)

**Author:** Claude · **Date:** 2026-08-23 · **Status:** decisions settled, ready
to generate. No artwork has been generated.

Packet: `Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/`. Its Markdown is
tracked (force-added past the `Sprite sheets/` ignore); the two 4096 x 4096 PNGs
are deterministic generator output and stay untracked.

## Correction of record: the likeness authority

The first draft of this packet named `Sprite sheets/New Lou/LouTheszFullBodyRef.png`
as primary likeness truth and measured Lou's palette from it. **That file depicts
Lou with a moustache** — an erroneous output, not reference material. Derek
caught it.

The authority is
`Sprite sheets/AI Pilot/Lou/v2-layer-standardization/references/lou-canonical-chroma-v1.png`.
`v2-layer-standardization/REPORT.md` already said so in two places — "Lou is
clean-shaven" and "`lou-canonical-chroma-v1.png` is the approved likeness/style
source" — and the draft simply failed to follow its own pipeline's
documentation. Verified directly for this correction: the canonical is
clean-shaven and matches the shipped `head.png`; the quarantined file carries a
distinct dark moustache. Same man otherwise.

The quarantined file is **removed from all generation inputs**. Lou is
unequivocally clean-shaven.

## Palette, re-measured from the correct source

Rec. 709 luma, green chroma excluded. The earlier figures came from the
contaminated file and reported skin at luma 161; the approved canonical is a
higher-key palette.

| Family | RGB | Luma |
|---|---|---:|
| skin base | 216,168,176 | 178.8 |
| skin shadow | 184,136,152 | 147.4 |
| boot blue | 48,48,136 | 54.4 |
| hair (shipped `head.png`) | 48,40,40 | 41.7 |
| ink / trunks | 0,0,0 | 0.0 |

Every adjacency clears the standard's 24-luma floor except trunks-vs-ink, which
is 0.0. Derek has ruled: keep black trunks and blue boots. Recorded in the
packet as a known accepted deviation so that if the hip boundary reads poorly at
154 px in Gate A, the cause is already identified.

## Settled art direction

- **Likeness/costume/palette/proportions/profile:** the approved canonical.
- **Ink:** apply the v2 tapered artist-stroke standard *without* changing Lou's
  established identity — treatment changes, the man does not.
- **George:** supplies the five-view turnaround **format only**. Not Lou's
  likeness. The prompt says so explicitly, because George is the other
  contamination risk.
- **Extrapolation:** the canonical is a right-facing near-profile, so front,
  front3q, back3q and back are the model's interpretations. Pass A exists as its
  own gate precisely so those get approved before any part is cut.
- **Costume:** black trunks, blue lace-up boots, unchanged.
- **Grooming/era:** 1952, age 36, clean-shaven.
- **Pose:** erect neutral, hands open (`hand.open` is the base slot;
  `hand.fist` derives from it in Pass C).

## New gate: `npm run art:validate-pass-a`

`tools/wrestler-cutter/validate-pass-a.mjs` is the mechanical Pass-A precheck.
It is the inverse of the normal v2 source check — there an empty production cell
is a failure, here an *occupied* one is, because paint in the bank before
identity approval means a limb was generated rather than masked from an approved
master.

It enforces exact 4096 x 4096; every production-bank cell empty and no paint
outside the five master panels (occupied cells reported by view/slot name); a
present, connected figure per panel at exactly 530 px crown-to-sole; and
straight-alpha RGB 0,0,0. It reuses the committed
`validateV2MasterPanelPixels` and `findV2TransparentRgbViolation` rather than
re-deriving geometry, and it warns on every run that likeness, grooming, taper,
value families and luma separation are human review and are not measured.

Proved non-vacuous rather than assumed: it fails the blank clean sheet with five
empty-panel errors, and fails the guide sheet with all 96 bank cells occupied
plus 87,511 stray pixels. Nine unit tests in `tests/passASheet.test.js` cover
the pass case, wrong canvas size, banked paint, a single stray pixel, a missing
view, an off-by-one figure height, a coloured transparent pixel, and the
"blank sheet must not pass" case.
