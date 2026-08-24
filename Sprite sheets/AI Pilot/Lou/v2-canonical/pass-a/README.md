# Thesz v2 — Pass A launch packet

Prepared 2026-08-23. **No artwork has been generated.** Art-direction decisions
are **settled** (see `DECISIONS.md`); this packet is ready to run.

## Contents

| File | What it is | Tracked? |
|---|---|---|
| `DECISIONS.md` | The settled art-direction rulings. **Read first.** | yes |
| `REFERENCES.md` | Reference inventory, generation inputs, quarantine list, measured palette. | yes |
| `PASS_A_PROMPT.md` | The final Pass-A-only prompt. | yes |
| `SHA256SUMS.txt` | Hashes of everything here. | yes |
| `thesz-canonical-v2-guides.png` | The 4096 x 4096 **guide**. Supply as image/mask input. | no — regenerable |
| `thesz-canonical-v2.png` | The 4096 x 4096 **blank clean sheet**. Output geometry. | no — regenerable |

The PNGs are deterministic output of the committed generator, not authored
assets, so they are left untracked under the repo's gitignored `Sprite sheets/`.
Regenerate with `npm run art:sheet` and check them against `SHA256SUMS.txt`.

## The one correction that matters

An earlier draft of this packet named `Sprite sheets/New Lou/LouTheszFullBodyRef.png`
as primary likeness truth. **That file depicts Lou with a moustache** and is
quarantined. The likeness authority is
`.../v2-layer-standardization/references/lou-canonical-chroma-v1.png`, which
`v2-layer-standardization/REPORT.md` already documented as the approved
clean-shaven source. Lou is unequivocally clean-shaven.

The palette in `REFERENCES.md` was re-measured from the correct file.

## Workflow

1. Read `DECISIONS.md`.
2. Generate with `PASS_A_PROMPT.md`, supplying the five inputs it lists — and
   **not** the quarantined file.
3. Gate the result mechanically:

   ```sh
   npm run art:validate-pass-a -- --sheet path/to/thesz-canonical-v2.png
   ```

   It enforces exact 4096 x 4096, an empty production bank, no paint outside the
   five master panels, a present and connected figure per panel at exactly 530 px
   crown-to-sole, and straight-alpha RGB 0,0,0. It cannot judge likeness, taper,
   or value families and says so.
4. Human review — the actual gate. Identity across all five views, including the
   four the model extrapolated.

## Verified when this packet was built

- both PNGs decode as exactly 4096 x 4096, 8-bit RGBA, non-interlaced
- clean sheet: 0 painted pixels, max alpha 0, no transparent pixel with non-zero RGB
- guide sheet: 5 labelled master panels, 95 cells indexed 00–94, cell 95 RESERVED
- `art:validate-pass-a` correctly **fails** both the blank sheet (5 empty panels)
  and the guide sheet (96 occupied cells), so the gate is not vacuous

## The rule that matters most

**Pass A paints the five cohesive 530 px masters and nothing else.** The bank is
filled in Pass B by masking the *approved* masters at 1:1 — never by
regenerating a limb. If identity is not approved first, all 95 cells inherit the
mistake.
