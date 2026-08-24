# Thesz v2 — Pass A launch packet (record)

**Author:** Claude · **Date:** 2026-08-23 · **Status:** prepared, NOT generated

The packet itself lives at:

```
Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/
```

`Sprite sheets/` is gitignored — that is the project's art staging convention,
and the two 4096 x 4096 PNGs are deterministic output of the committed
generator rather than authored assets. This file is the committed record of
what was prepared, so the packet can be reproduced and its outputs checked.

## What was materialized

| File | SHA-256 |
|---|---|
| `thesz-canonical-v2-guides.png` | `d99f45a7cef5c74fd32099dc801a934adae4595cd06344219853c0b6b903b3eb` |
| `thesz-canonical-v2.png` | `3d237953b26f6a9611f7629a5614bff4d5a006042b41e2d940582aa385f194b6` |
| `README.md` | `8154b4db47d0cb576c5bfdd4d6f4563442ce947aea4682c22bda4fb689a74c3e` |
| `REFERENCES.md` | `3d335b49631f1e9a88b3b58c3fffac16359d47f56264bce284e2d6c37715a3d7` |
| `DECISIONS.md` | `725f954b377e03c953cd5f33aaf4214f71f31cb9db5f198cb61780f9d27655b0` |
| `PASS_A_PROMPT.md` | `92871f35e65b130814a6245f22f5e2b47c63efd2edd6a70a8e5fe8b93ff2f1d0` |

Both PNGs decode as exactly 4096 x 4096, 8-bit RGBA, non-interlaced. The clean
sheet was verified genuinely empty — 0 painted pixels, max alpha 0, and no
transparent pixel carrying non-zero RGB — rather than assumed empty because the
tool says so.

To reproduce: `npm run art:sheet`, then use the guide and clean download
buttons. Both derive from `templates/rig-source-manifest.v2.example.json`.

## Blocking on Derek

Four decisions, detailed in the packet's `DECISIONS.md`:

- **D-1** the v2 tapered ink hierarchy contradicts the approved uniform black
  contour on every existing Thesz/George asset. Both cannot hold. Recommended:
  follow the v2 standard, because that contour is the main reason current art
  reads as vector at 265 px.
- **D-2** the approved George turnaround faces LEFT in profile; the v2 manifest
  and Thesz's own reference require RIGHT. Confirm Thesz mirrors George's
  rotation sense rather than copying it literally.
- **D-3** era snapshot: 1952, age 36, clean-shaven, no moustache.
- **D-4** measured from `LouTheszFullBodyRef.png`, the trunks and the outline
  ink are **both pure black (luma 0.0)**. The standard requires ≥24 luma between
  adjacent gameplay-critical regions, and the pelvis is one. Recommended: lift
  the trunks to a very dark neutral near luma 30–40.

Two more (D-5 open hands instead of the reference's fists, D-6 boots stay blue)
have defaults written into the prompt and only need a veto.

## Scope discipline

Pass A paints the five cohesive 530 px masters only; all 96 production-bank
cells stay empty. The bank is filled in Pass B by masking the *approved* masters
at 1:1. No artwork was generated for this packet, and the shipped Thesz assets
were not touched.
