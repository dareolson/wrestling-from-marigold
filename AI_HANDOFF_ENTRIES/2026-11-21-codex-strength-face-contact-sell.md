# Test of strength: face clear, grip and receiver body language — Codex, Nov 21

Derek: George’s far arm covers his face going down, hands lose contact at the top, needs more sell through body language. Changes limited to testOfStrength and its regressions. No art or generic runtime changes.

Receiver far forearm stays behind his body/head; explicit head-above-arms ordering in the overhead contest keeps face clear during the fold. Closer standing spacing gives the top mutual palm grip reach reserve. Lou also steps closer on the second recovery, rather than letting George pull out of reach. Ended outgoing near-hand reciprocal constraint before the rise-to-low-wrist constraint so the two do not fight during transfer. Retained natural mutual wrist/palm grip; a shared shoulder-relative target trial caused larger reach misses and was discarded.

Body language: arches/braces before each push, deeper forward collapse and chest roll at each squeeze, delayed recoil beats at 3.45/5.4, asymmetric legs, partial height recovery, deeper kneeling fold; standing wristlock has two distinct torso/leg reactions. Pain face starts 2.1. Duration 12.6, three 3-damage calls, standing double wristlock/release/two retreat steps unchanged. No hip toss. No visual acceptance implied; Derek judges it.

Evidence: research/animation/strength-sell-2026-11-21/ before-matMoves.txt, capture.mjs, frames.jsonl/lock-*.png, verify.mjs, matrix.json/txt, preserve.mjs, tests.txt, full-tests.txt, build.txt. Screenshots precede the final 5.9s attacker root correction only. All other full mat clips and damage deep-equal start snapshot. Everything uncommitted, no commit/merge/push/reset.

Final validation: full suite **1461/1461**, build pass (existing chunk warning), diff check and preservation pass. Lou→George both facings: three [3,testOfStrength] hurt calls each, zero invalid joints/page errors, standing/staggered finish and no active handle. Top grip at 1.35s ≤0.00004030px; maximum throughout overhead hold ≤2.165004px remains. Standing lock worked wrist ≤0.00004879px, own-wrist clasp ≤0.00004987px. Broader 16-case matrix is prior evidence, not rerun for this pose/depth correction.
