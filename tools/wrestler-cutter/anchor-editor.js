const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const partSelect = document.querySelector('#part');
const activeSelect = document.querySelector('#activeAnchor');
const anchorsEl = document.querySelector('#anchors');
const statusEl = document.querySelector('#status');
let manifest = null;
let cleanImage = null;
let cleanFile = null;
let dragging = false;

function part() { return manifest?.parts?.[partSelect.value]; }
function point() { return part()?.anchors?.[activeSelect.value]; }
function status(message, warning = false) { statusEl.textContent = message; statusEl.className = warning ? 'status warn' : 'status'; }

function draw(includeGuides = document.querySelector('#guides').checked) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (cleanImage) ctx.drawImage(cleanImage, 0, 0, canvas.width, canvas.height);
  if (!includeGuides || !part()) return;
  for (const [name, zone] of Object.entries(part().jointZones ?? {})) {
    const anchor = part().anchors[name];
    if (!anchor) continue;
    ctx.save(); ctx.fillStyle = 'rgba(255,121,198,.16)'; ctx.strokeStyle = '#ff79c6'; ctx.setLineDash([3, 3]);
    ctx.fillRect(anchor.x - 12, anchor.y - zone.beforePx, 24, zone.beforePx + zone.afterPx);
    ctx.strokeRect(anchor.x - 12, anchor.y - zone.beforePx, 24, zone.beforePx + zone.afterPx);
    ctx.restore();
  }
  const coverage = part().pelvisCoverage;
  if (coverage) {
    const b = coverage.bounds;
    ctx.save(); ctx.strokeStyle = '#ff79c6'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]);
    for (const name of ['nearHip', 'farHip']) {
      const hip = part().anchors[name];
      ctx.beginPath(); ctx.arc(hip.x, hip.y, coverage.sweepRadiusPx, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#ff79c6'; ctx.font = '12px system-ui'; ctx.fillText(`pelvis coverage (${coverage.owner})`, b.x, b.y - 6); ctx.restore();
  }
  for (const [name, p] of Object.entries(part().anchors)) {
    const active = name === activeSelect.value;
    ctx.save(); ctx.strokeStyle = active ? '#ffdf57' : '#39e6ff'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(p.x - 10, p.y); ctx.lineTo(p.x + 10, p.y); ctx.moveTo(p.x, p.y - 10); ctx.lineTo(p.x, p.y + 10); ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.font = '12px system-ui'; ctx.fillText(name, p.x + 8, p.y - 8); ctx.restore();
  }
}

function rebuildAnchors() {
  const names = Object.keys(part()?.anchors ?? {});
  activeSelect.replaceChildren(...names.map(name => new Option(name, name)));
  anchorsEl.replaceChildren();
  for (const name of names) {
    const label = document.createElement('span'); label.textContent = name;
    anchorsEl.append(label);
    for (const axis of ['x', 'y']) {
      const input = document.createElement('input'); input.type = 'number'; input.step = '1'; input.value = part().anchors[name][axis];
      input.addEventListener('input', () => { part().anchors[name][axis] = Number(input.value); draw(); });
      anchorsEl.append(input);
    }
  }
  const coverage = part()?.pelvisCoverage;
  if (coverage) {
    for (const [labelText, object, key] of [
      ['pelvis x', coverage.bounds, 'x'], ['pelvis y', coverage.bounds, 'y'],
      ['pelvis w', coverage.bounds, 'w'], ['pelvis h', coverage.bounds, 'h'],
      ['corner radius', coverage, 'cornerRadiusPx'], ['hip radius', coverage, 'hipRadiusPx'],
      ['sweep radius', coverage, 'sweepRadiusPx'],
    ]) {
      const label = document.createElement('span'); label.textContent = labelText;
      const input = document.createElement('input'); input.type = 'number'; input.step = '1'; input.value = object[key];
      input.addEventListener('input', () => { object[key] = Number(input.value); draw(); });
      const units = document.createElement('span'); units.textContent = 'px';
      anchorsEl.append(label, input, units);
    }
  }
  draw();
}

function loadPart() {
  const spec = part();
  if (!spec) return;
  canvas.width = spec.canvas.w; canvas.height = spec.canvas.h; cleanImage = null; cleanFile = null;
  document.querySelector('#artFile').value = ''; rebuildAnchors(); status(`Load ${spec.file ?? partSelect.value + '.png'} to inspect pixels.`);
}

document.querySelector('#manifestFile').addEventListener('change', async event => {
  try {
    manifest = JSON.parse(await event.target.files[0].text());
    partSelect.replaceChildren(...Object.keys(manifest.parts ?? {}).map(name => new Option(name, name)));
    loadPart(); status(`Loaded ${manifest.characterId}. Coordinates remain in ${manifest.coordinateSpace}.`);
  } catch (error) { status(error.message, true); }
});
partSelect.addEventListener('change', loadPart);
activeSelect.addEventListener('change', draw);
document.querySelector('#guides').addEventListener('change', draw);
document.querySelector('#artFile').addEventListener('change', event => {
  cleanFile = event.target.files[0]; if (!cleanFile) return;
  const image = new Image(); image.onload = () => {
    URL.revokeObjectURL(image.src);
    if (image.naturalWidth !== part().canvas.w || image.naturalHeight !== part().canvas.h) {
      cleanImage = null; draw(); status(`PNG is ${image.naturalWidth}x${image.naturalHeight}; manifest requires ${part().canvas.w}x${part().canvas.h}.`, true); return;
    }
    cleanImage = image; draw(); status('PNG canvas matches. Crosshairs are overlay-only.');
  }; image.src = URL.createObjectURL(cleanFile);
});

function canvasPoint(event) { const r = canvas.getBoundingClientRect(); return { x: Math.round((event.clientX-r.left)*canvas.width/r.width), y: Math.round((event.clientY-r.top)*canvas.height/r.height) }; }
function setPoint(p) { const target = point(); if (!target) return; target.x = Math.max(0, Math.min(canvas.width-1, p.x)); target.y = Math.max(0, Math.min(canvas.height-1, p.y)); rebuildAnchors(); }
canvas.addEventListener('pointerdown', event => { dragging = true; canvas.setPointerCapture(event.pointerId); setPoint(canvasPoint(event)); });
canvas.addEventListener('pointermove', event => { if (dragging) setPoint(canvasPoint(event)); });
canvas.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('keydown', event => {
  if (!point() || !event.key.startsWith('Arrow')) return;
  const d = event.shiftKey ? 10 : 1; const p = { ...point() };
  if (event.key === 'ArrowLeft') p.x -= d; if (event.key === 'ArrowRight') p.x += d;
  if (event.key === 'ArrowUp') p.y -= d; if (event.key === 'ArrowDown') p.y += d;
  setPoint(p); event.preventDefault();
});

function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 0); }
document.querySelector('#downloadManifest').addEventListener('click', () => { if (manifest) download(new Blob([JSON.stringify(manifest, null, 2) + '\n'], { type:'application/json' }), `${manifest.characterId}-rig-source-manifest.json`); });
document.querySelector('#downloadGuide').addEventListener('click', () => { if (!cleanImage) return status('Load a matching clean PNG first.', true); draw(true); canvas.toBlob(blob => { download(blob, `${partSelect.value}-guides.png`); draw(); }); });
document.querySelector('#downloadClean').addEventListener('click', () => { if (!cleanFile) return status('Load a clean PNG first.', true); download(cleanFile, part().file ?? `${partSelect.value}.png`); });

fetch('./templates/rig-source-manifest.example.json').then(r => r.json()).then(value => {
  manifest = value; partSelect.replaceChildren(...Object.keys(manifest.parts).map(name => new Option(name, name))); loadPart();
});

window.__ANCHOR_EDITOR = {
  manifest: () => manifest,
  setPart(name) { partSelect.value = name; loadPart(); },
  setActiveAnchor(name) { activeSelect.value = name; draw(); },
  setAnchor(name, x, y) { activeSelect.value = name; setPoint({ x, y }); },
  canvas: () => canvas,
};
