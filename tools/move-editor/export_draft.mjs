// Install a finished (e.g. stage.mjs-solved) draft: copy it into the editor
// library and generate its clip module, exactly as the editor's export does.
//   node tools/move-editor/export_draft.mjs <draft.json> <drafts/ file> <clips/ file>
import { readFileSync } from 'node:fs';
import { normalizeDraft } from './model.js';
import { writeDraftAndClip } from './authoring.mjs';

const [source, draftFile, clipFile] = process.argv.slice(2);
writeDraftAndClip(normalizeDraft(JSON.parse(readFileSync(source, 'utf8'))), draftFile, clipFile);
