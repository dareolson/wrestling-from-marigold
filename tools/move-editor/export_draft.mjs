// Install a finished (e.g. stage.mjs-solved) draft: copy it into the editor
// library and generate its clip module, exactly as the editor's export does.
//   node tools/move-editor/export_draft.mjs [--solo] <draft.json> <drafts/ file> <clips/ file>
// --solo exports a one-wrestler clip (authoring.mjs soloClip): attacker track
// only, no transform, for moves whose executor owns position.
import { readFileSync } from 'node:fs';
import { normalizeDraft } from './model.js';
import { writeDraftAndClip, writeDraftAndSoloClip } from './authoring.mjs';

const args = process.argv.slice(2);
const solo = args[0] === '--solo';
const [source, draftFile, clipFile] = solo ? args.slice(1) : args;
const draft = normalizeDraft(JSON.parse(readFileSync(source, 'utf8')));
(solo ? writeDraftAndSoloClip : writeDraftAndClip)(draft, draftFile, clipFile);
