# Current support and atomic-drop landing review

2026-11-03 · Codex, requested by Derek. Reviewed 27f06ba and the carry revision 8731cd0. [Detailed Sonnet brief](../research/animation/grapples-2026-10/support-landing-review/REPORT.md).

Critical finding: the negative knee keys introduced in T4c.4d are clamped to -0.1 by the current local-flex helper. A fresh real-rig probe of -0.1/-0.6/-0.9/-1.4 gives exactly 0 px difference in knees/ankles, both rigs and both facings. A passing hyperextension audit does not establish that a deeper fold occurs. Fix this representation contract before another pose tuning pass; do not globally reverse signs without checking callers.

George's snapmare has no planted-sole targets. From reach-end to landing, the painted near/far soles travel about 85/57 raw game pixels; the near foot has a legitimate kneeling transfer, but the far support foot is unanchored. Define land/set → far sole plus near knee support → rise/transfer.

Atomic drop: near thigh rises to 1.4 while the intended -0.9 knee fold is clamped away; this leaves an extended-leg strike silhouette. Keep the torso carry, pre-chamber a genuinely bent knee, guide the receiver's seat onto it from the carried release pose, show compression/weight arriving, then recoil and catch-step. Keep the damage marker on contact.

Review-only: read-only probe and evidence, no gameplay/art edits, no commit/push or approval. The report has the exact bounded proof request for Sonnet.
