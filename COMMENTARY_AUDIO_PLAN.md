# Commentary Audio Plan

**Status:** Deferred implementation plan  
**Prepared:** 2026-07-26  
**Scope:** Spoken match commentary, asset production, runtime selection, loading,
memory, packaging, and verification

## Goal

Add varied period-appropriate spoken commentary without turning commentary into
a large initial download, a large decoded-memory allocation, or hundreds of
uncoordinated sound calls embedded in gameplay code.

The commentary system should react to wrestling psychology and match context,
avoid obvious repetition, remain optional, and scale from a small vertical slice
to several hundred recorded lines.

## Current size baseline

Measured 2026-07-26:

| Content | Current size |
|---|---:|
| Runtime assets under `src/assets/` | 25.84 MiB |
| Audience art | about 18 MiB |
| Wrestler art | about 8.4 MiB |
| Current `dist/` | about 124 KiB |
| Full development workspace | about 620 MiB |

The full workspace is not the shipped game. It includes roughly 253 MiB of
debug tools/screenshots, 154 MiB of dependencies, 119 MiB of sprite source
material, and 66 MiB of Git data.

The current `dist/` size is also not a valid shipped-game measurement. Phaser
loads wrestler/audience images through runtime string paths under `src/assets/`,
so Vite does not currently copy those files into `dist/`. A production build can
appear to succeed while omitting the runtime art. Correcting and verifying the
production asset pipeline is Phase 0 of commentary work.

The current Arena preload also loads all experimental George pilot namespaces.
Development comparison candidates must not automatically become production
payload.

## Size and memory budget

### Delivery budget

Initial targets for one commentary voice/language:

- Total production game payload: target 30–40 MiB compressed.
- Commentary catalog on disk/network: target no more than 10 MiB for the first
  several hundred lines.
- Commentary required before the first playable frame: target no more than
  1–2 MiB.
- A lazily loaded commentary bank: target roughly 0.5–2 MiB.
- Ordinary individual line: target well below 100 KiB when practical.

These are budgets and regression alarms, not platform hard limits. Hosting,
mobile storage, browser cache quotas, and network conditions will ultimately set
the ceiling.

### Expected compressed sizes

Three hundred lines averaging three seconds equal 900 seconds, or 15 minutes:

| Encoding | Approximate total |
|---|---:|
| Mono PCM WAV, 44.1 kHz/16-bit | 79 MiB |
| Compressed voice, 32 kbps | 3.6 MiB |
| Compressed voice, 48 kbps | 5.4 MiB |
| Compressed voice, 64 kbps | 7.2 MiB |
| Compressed voice, 96 kbps | 10.8 MiB |

Runtime masters must therefore not be WAV. If average lines grow to five
seconds, multiply those compressed totals by roughly 1.67.

### Decoded-memory warning

Compressed download size is not decoded Web Audio memory. Fifteen minutes of
fully decoded commentary can occupy approximately:

- 86 MiB at 24 kHz mono float PCM;
- 159 MiB at 44.1 kHz mono float PCM;
- 318 MiB at 44.1 kHz stereo float PCM.

Do not preload and decode the complete catalog. Loading policy is a correctness
requirement, not a later optimization.

## Audio production contract

### Masters

- Retain lossless recording masters outside the shipped runtime directory.
- Prefer mono masters unless a deliberate stereo production need exists.
- Record cleanly with consistent microphone distance and room treatment.
- Preserve source provenance, performer permission, and usage rights.
- Do not commit large replaceable masters directly to normal Git history.
  Store them in an agreed external archive or Git LFS if the project adopts it.

### Runtime files

- Voice is mono.
- Start evaluation at 24 or 32 kHz and 40–48 kbps.
- Use a modern voice-efficient codec as the primary target after a browser
  compatibility spike. Supply an AAC/MP3 alternative only if the supported
  browser matrix actually requires it; do not automatically double the catalog.
- Trim leading/trailing silence while retaining natural speech cadence.
- Normalize loudness consistently across the catalog and leave headroom for
  crowd peaks.
- Do not bake crowd noise, music, or ring ambience into commentary clips.

The exact codec/container and loudness target should be fixed by the vertical
slice, then applied mechanically to the full catalog.

## Runtime architecture

```text
Gameplay events
      ↓
CommentaryDirector
  context + eligibility + dramatic priority
      ↓
CommentaryCatalog
  tags + cooldowns + variants + bank ownership
      ↓
CommentaryBankLoader
  preload / lazy load / cache / unload
      ↓
CommentaryPlayback
  queue / interruption / ducking / subtitles
```

### `CommentaryDirector`

Gameplay code emits semantic events; it does not choose filenames:

```js
commentary.note('move.landed', {
    attacker: 'george',
    defender: 'thesz',
    move: 'headlock',
    matchPhase: 'middle',
    momentum: 'george',
    repetition: 1,
});
```

The director owns:

- whether a line should play at all;
- dramatic priority and interruption rules;
- cooldown and repetition suppression;
- context history;
- choosing a generic, wrestler-specific, move-specific, reversal, near-fall,
  or callback line;
- requesting the needed bank early enough for playback.

Do not scatter `sound.play('line-name')` calls through move handlers.

### Catalog manifest

Every line receives a stable semantic ID and data entry. Filenames remain an
asset detail.

```json
{
  "id": "headlock.george.applied.01",
  "bank": "holds-core",
  "event": "move.landed",
  "move": "headlock",
  "attacker": "george",
  "matchPhases": ["opening", "middle"],
  "priority": 40,
  "cooldownSeconds": 45,
  "oncePerMatch": false,
  "weight": 1,
  "durationMs": 2860,
  "subtitle": "George has that headlock cinched in tight!",
  "asset": "holds-core#headlock-george-applied-01"
}
```

The manifest should also support exclusions, required prior events, score/heat
thresholds, losing/winning context, and optional alternate takes.

### Banks

Recommended initial bank taxonomy:

- `core`: bell, opening, neutral action, pauses, generic momentum;
- `holds-core`: lockups and common holds;
- `strikes-core`: jabs, clotheslines, dropkicks, knockdowns;
- `pins-core`: covers, counts, kick-outs, rope breaks, near-falls;
- `reversals-core`: escapes, counters, momentum changes;
- `finish-core`: finishers, exhaustion, decisive drama;
- wrestler banks such as `george-specific` and `thesz-specific`;
- rare callback and matchup banks loaded only when eligible.

Keep banks moderately sized. A single enormous audio sprite reduces requests but
forces the browser to download/decode too much at once. Hundreds of isolated
startup requests are also undesirable. Start with roughly 20–50 short lines per
bank and measure.

The loader interface should hide whether a bank uses individual files or an
audio sprite, allowing packaging to change without rewriting commentary logic.

### Loading policy

1. Load only `core` before or during the match opening.
2. Load the two selected wrestlers' small identity banks during entrances or
   match setup.
3. Prefetch likely move/phase banks during quiet gameplay windows.
4. Keep currently playing and immediately queued audio pinned.
5. Release decoded banks no longer likely to play, while allowing the browser's
   HTTP/cache layer to retain compressed files.
6. If a bank is late or unavailable, skip gracefully or use an already-loaded
   generic line. Commentary must never pause gameplay.

Do not make every catalog entry a Phaser preload dependency.

### Playback policy

- One primary commentator voice at a time for the first implementation.
- Do not overlap ordinary commentary lines.
- High-priority events may interrupt a low-priority observation at a natural
  boundary; ordinary events queue briefly or expire.
- Drop stale calls rather than describing action that ended several seconds ago.
- Duck crowd/ambience modestly under speech and restore smoothly.
- Respect independent commentary, crowd, and master volume controls.
- Commentary-off mode must avoid loading optional banks.
- Subtitles use the manifest text and can remain enabled independently of voice.

## Selection and repetition rules

A large catalog can still sound repetitive without memory. Track at minimum:

- recently played line IDs;
- recently described event families;
- repeated use of the same move;
- current leader/momentum;
- previous near-falls and reversals;
- wrestler-specific facts already mentioned;
- match phase and elapsed time;
- the last interruption or unfinished line.

Use weighted random selection only after eligibility filtering. Do not use pure
random selection over the entire catalog.

Suggested repetition protection:

- no exact line repeat inside one match unless explicitly marked repeatable;
- event-family cooldowns independent of line cooldowns;
- escalating variants for repeated holds, strikes, pins, and escapes;
- reserve rare/high-impact calls so ordinary events cannot consume them.

## File and build layout

Proposed runtime layout after the production asset pipeline is corrected:

```text
public/assets/audio/commentary/
├── manifest.json
├── core/
├── holds-core/
├── strikes-core/
├── pins-core/
├── reversals-core/
├── finish-core/
└── wrestlers/
    ├── george/
    └── thesz/
```

Proposed non-runtime source layout is intentionally separate and excluded from
the production build:

```text
Audio source/commentary/
├── masters/
├── edit-sessions/
├── scripts/
└── provenance.json
```

Add a deterministic preparation tool rather than hand-exporting runtime files.
It should trim, normalize, encode, measure duration/size, update the manifest,
and produce a report. Do not overwrite masters.

Add a build audit that fails on:

- missing or orphaned assets;
- duplicate IDs;
- invalid bank references;
- absent subtitles;
- unsupported encoding/container;
- excessive leading/trailing silence;
- a line or bank over its configured size budget;
- total initial commentary payload over budget;
- total commentary payload over budget.

## Production asset prerequisite

Before the commentary vertical slice:

1. Establish one production-safe runtime asset location or imported manifest.
2. Confirm Vite copies every required image/audio file into `dist/`.
3. Confirm a static server can run the built `dist/` without access to `src/`.
4. Stop preloading obsolete wrestler comparison candidates in production.
5. Produce a build-size report by category: JS, wrestler art, audience art,
   commentary core, optional commentary banks, and other audio.

Until this is complete, `du -sh dist` is not a meaningful game-size metric.

## Phased implementation

### Phase 0 — production packaging

Fix production asset inclusion and add a repeatable size report. No commentary
recording batch should begin before this gate passes.

### Phase 1 — text-only director

Implement semantic commentary events, catalog filtering, priorities, cooldowns,
history, and subtitles with no recorded audio. This allows selection quality to
be tested cheaply.

### Phase 2 — audio vertical slice

Record and integrate approximately 20–30 lines covering:

- match opening;
- one common hold;
- one strike/knockdown;
- one reversal;
- one pin/near-fall sequence;
- one George-specific call;
- one Thesz-specific call;
- one finish/result sequence.

Use this slice to choose codec, rate, loudness, bank size, ducking, queue behavior,
and browser support. Measure initial download, lazy download, decoded memory, and
time to first playback on desktop and a representative mobile device.

### Phase 3 — first complete match vocabulary

Expand to roughly 100–150 lines, emphasizing variation for common events before
adding rare move trivia. Conduct full simulated and human-played matches to find
repetition and stale-call problems.

### Phase 4 — expanded catalog

Grow toward several hundred lines only after the director and loading policy have
proven stable. Add matchup, wrestler, callback, and rare dramatic banks
incrementally while preserving the size budgets.

## Acceptance gates

The commentary system is ready to expand only when:

- production `dist/` is complete and runs from a static server;
- commentary-off mode downloads no optional voice banks;
- gameplay never blocks on commentary loading;
- the initial voice payload stays within budget;
- decoded audio memory remains bounded as banks change;
- no ordinary line overlaps another;
- stale queued lines expire;
- repeated actions produce sensible escalation rather than immediate repetition;
- subtitles match spoken content;
- crowd ducking remains natural;
- missing audio falls back safely;
- a full match can be played offline after its required banks have been cached;
- the build report records compressed and estimated decoded sizes.

## Explicit non-goals for the first pass

- Two simultaneous commentator personalities.
- Fully procedural sentence splicing.
- Loading the complete catalog at startup.
- Shipping lossless masters.
- Recording hundreds of lines before the selector is tested.
- Coupling move execution directly to audio filenames.
- Treating a successful Vite build as proof that runtime assets were included.

## Decisions deferred to the vertical slice

- Final codec/container and whether a fallback format is required.
- Exact sample rate and bitrate.
- Individual files versus audio sprites inside each bank.
- Exact loudness/ducking values.
- Cache eviction thresholds.
- Final hosting/CDN strategy.
- Whether the first release includes one commentator or an announcer plus
  commentator distinction.

These decisions should be made from measured browser/network/memory results, not
from catalog size alone.
