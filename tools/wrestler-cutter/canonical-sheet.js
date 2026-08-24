const MANIFEST_URL = './templates/rig-source-manifest.v2.example.json';

const canvas = document.getElementById('sheet');
const ctx = canvas.getContext('2d');
const zoom = document.getElementById('zoom');
const download = document.getElementById('download');
const downloadClean = document.getElementById('download-clean');
const status = document.getElementById('status');

const COLORS = Object.freeze({
  panel: '#55d9ff',
  skeleton: '#65d8ff',
  cell: '#9b8cff',
  exportRect: '#ffd166',
  anchor: '#ff6b8a',
  overlapBefore: '#ff9f68',
  overlapAfter: '#e979b7',
  coverage: '#52e0a4',
  sweep: '#66a6ff',
  center: '#7ef0b8',
  text: '#f1f4ff',
  muted: '#b5bbd0',
  reserved: '#657080',
});

let manifest = null;
let layout = null;

function partNameForSlot(slot) {
  return slot.split('.')[0];
}

function variantForSlot(slot) {
  const dot = slot.indexOf('.');
  return dot < 0 ? null : slot.slice(dot + 1);
}

function viewAnchors(viewName, partName) {
  return {
    ...(manifest.parts[partName]?.anchors ?? {}),
    ...(manifest.views[viewName]?.anchorOverrides?.[partName] ?? {}),
  };
}

function variantSemanticAnchors(partName, variantId) {
  if (!variantId) return {};
  return manifest.variantFamilies?.[partName]
    ?.find(entry => entry.id === variantId)?.semanticAnchors ?? {};
}

function line(x1, y1, x2, y2, color, width = 2, dash = []) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function rect(x, y, w, h, color, width = 2, dash = []) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function circle(x, y, radius, color, width = 2, fill = false, dash = []) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  fill ? ctx.fill() : ctx.stroke();
  ctx.restore();
}

function roundedRect(x, y, w, h, radius, color, width = 2, dash = []) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function orientedBand(x, y, ux, uy, from, to, halfWidth, color) {
  const px = -uy * halfWidth;
  const py = ux * halfWidth;
  const points = [
    [x + ux * from + px, y + uy * from + py],
    [x + ux * to + px, y + uy * to + py],
    [x + ux * to - px, y + uy * to - py],
    [x + ux * from - px, y + uy * from - py],
  ];
  ctx.save();
  ctx.fillStyle = `${color}35`;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function label(text, x, y, size = 13, color = COLORS.text, align = 'left') {
  ctx.save();
  ctx.font = `600 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(10, 12, 18, 0.82)';
  const metrics = ctx.measureText(text);
  const left = align === 'center' ? x - metrics.width / 2 : align === 'right' ? x - metrics.width : x;
  ctx.fillRect(left - 3, y - 2, metrics.width + 6, size + 6);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

const MASTER_BONES = Object.freeze([
  ['crown', 'neck'],
  ['neck', 'leftShoulder'], ['neck', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'],
  ['neck', 'leftHip'], ['neck', 'rightHip'], ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'], ['leftAnkle', 'leftSole'],
  ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'], ['rightAnkle', 'rightSole'],
]);

function drawMasterPanels() {
  for (const viewName of manifest.sourceSheet.productionGrid.viewOrder) {
    const panel = manifest.sourceSheet.masterPanels[viewName];
    const landmarks = manifest.views[viewName].masterLandmarks;
    ctx.save();
    ctx.fillStyle = 'rgba(101, 216, 255, 0.025)';
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.restore();
    rect(panel.x, panel.y, panel.w, panel.h, COLORS.panel, 3);
    line(panel.x + panel.w / 2, panel.y, panel.x + panel.w / 2, panel.y + panel.h, COLORS.center, 1, [10, 10]);
    label(`${viewName.toUpperCase()} MASTER · ${manifest.sourceSheet.masterFigureHeightPx}px figure`, panel.x + 12, panel.y + 10, 16, COLORS.panel);

    for (const [aName, bName] of MASTER_BONES) {
      const a = landmarks[aName], b = landmarks[bName];
      if (!a || !b) continue;
      line(panel.x + a.x, panel.y + a.y, panel.x + b.x, panel.y + b.y, COLORS.skeleton, 4);
    }
    for (const [name, point] of Object.entries(landmarks)) {
      const x = panel.x + point.x, y = panel.y + point.y;
      circle(x, y, name === 'crown' || name === 'neck' ? 7 : 6, COLORS.anchor, 2, true);
      label(name, x + 9, y - 7, 10, COLORS.muted);
    }
  }
}

function cellDescriptor(index) {
  const grid = manifest.sourceSheet.productionGrid;
  const viewIndex = Math.floor(index / grid.slotsPerView);
  const slotIndex = index % grid.slotsPerView;
  const view = grid.viewOrder[viewIndex];
  const slot = grid.slotOrder[slotIndex];
  const col = index % grid.columns;
  const row = Math.floor(index / grid.columns);
  const x = grid.origin.x + col * grid.cell.w;
  const y = grid.origin.y + row * grid.cell.h;
  const partName = partNameForSlot(slot);
  const part = manifest.parts[partName];
  return {
    index, viewIndex, slotIndex, view, slot, partName,
    macro: { x, y, w: grid.cell.w, h: grid.cell.h },
    exportRect: {
      x: x + part.exportRect.x,
      y: y + part.exportRect.y,
      w: part.exportRect.w,
      h: part.exportRect.h,
    },
  };
}

function drawAnchorGuide(cell, name, point, zone) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return;
  const x = cell.exportRect.x + point.x;
  const y = cell.exportRect.y + point.y;
  if (zone?.opaqueCoreRadiusPx) circle(x, y, zone.opaqueCoreRadiusPx, COLORS.anchor, 2);
  line(x - 7, y, x + 7, y, COLORS.anchor, 2);
  line(x, y - 7, x, y + 7, COLORS.anchor, 2);
  circle(x, y, 2.5, COLORS.anchor, 1, true);
  label(name, x + 8, y + 5, 9, COLORS.anchor);
}

function partAxis(anchors, part) {
  const frame = part.orientation?.frame;
  if (frame?.length !== 2) return null;
  const a = anchors[frame[0]], b = anchors[frame[1]];
  if (!a || !b) return null;
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  return length > 0 ? { x: dx / length, y: dy / length } : null;
}

function drawOverlapBands(cell, part, anchors, declaredPartName = cell.partName) {
  const axis = partAxis(anchors, part);
  if (!axis) return;
  for (const [name, zone] of Object.entries(part.jointZones ?? {})) {
    const paintOwner = zone.coveragePart ?? declaredPartName;
    if (paintOwner !== cell.partName) continue;
    const point = anchors[name];
    if (!point || !Number.isFinite(zone.beforePx) || !Number.isFinite(zone.afterPx)) continue;
    const x = cell.exportRect.x + point.x;
    const y = cell.exportRect.y + point.y;
    const halfWidth = Math.max(6, zone.opaqueCoreRadiusPx ?? 0);
    orientedBand(x, y, axis.x, axis.y, -zone.beforePx, 0, halfWidth, COLORS.overlapBefore);
    orientedBand(x, y, axis.x, axis.y, 0, zone.afterPx, halfWidth, COLORS.overlapAfter);
    layout.guideStats.overlapZones++;
    layout.guideStats.overlapHalves += 2;
  }
}

function drawTorsoCoverage(cell, anchors) {
  const coverage = manifest.parts.torso.shoulderCoverage;
  if (!coverage) return;
  const er = cell.exportRect;
  const neck = anchors.neck;
  if (neck && Number.isFinite(coverage.neckRadiusPx)) {
    circle(er.x + neck.x, er.y + neck.y, coverage.neckRadiusPx, COLORS.coverage, 2);
    layout.guideStats.neckCoverageDisks++;
  }
  for (const side of ['leftShoulder', 'rightShoulder']) {
    const point = anchors[side];
    if (!point) continue;
    circle(er.x + point.x, er.y + point.y, coverage.shoulderRadiusPx, COLORS.coverage, 2);
    circle(er.x + point.x, er.y + point.y, coverage.sweepRadiusPx, COLORS.sweep, 2, false, [4, 3]);
    layout.guideStats.shoulderCoverageDisks++;
    layout.guideStats.shoulderSweepDisks++;
  }
}

function drawPelvisUnderlayCoverage(cell) {
  const torso = manifest.parts.torso;
  const coverage = torso.pelvisCoverage;
  if (!coverage) return;
  const er = cell.exportRect;
  const anchors = viewAnchors(cell.view, 'torso');
  // Hip sockets are structurally declared by the torso, but split-mode paint
  // is owned by pelvisUnderlay. Draw those bands here so the guide cannot
  // accidentally ask the artist to duplicate a second hip body on torso.
  drawOverlapBands(cell, torso, anchors, 'torso');
  const bounds = coverage.bounds;
  roundedRect(er.x + bounds.x, er.y + bounds.y, bounds.w, bounds.h,
    coverage.cornerRadiusPx, COLORS.coverage, 2.5, [6, 4]);
  layout.guideStats.pelvisRoundedBounds++;
  for (const side of ['leftHip', 'rightHip']) {
    const point = anchors[side];
    if (!point) continue;
    circle(er.x + point.x, er.y + point.y, coverage.hipRadiusPx, COLORS.coverage, 2);
    circle(er.x + point.x, er.y + point.y, coverage.sweepRadiusPx, COLORS.sweep, 2, false, [4, 3]);
    layout.guideStats.hipCoverageDisks++;
    layout.guideStats.hipSweepDisks++;
    label(`${side} hip/sweep`, er.x + point.x + 8, er.y + point.y + 6, 8, COLORS.coverage);
  }
}

function drawProductionCell(cell) {
  const part = manifest.parts[cell.partName];
  const variantId = variantForSlot(cell.slot);
  const semantics = variantSemanticAnchors(cell.partName, variantId);
  const anchors = { ...viewAnchors(cell.view, cell.partName), ...semantics };
  const macro = cell.macro;
  const er = cell.exportRect;

  rect(macro.x, macro.y, macro.w, macro.h, COLORS.cell, 1.5);
  label(`${String(cell.index).padStart(2, '0')} ${cell.view} / ${cell.slot}`, macro.x + 7, macro.y + 6, 11, COLORS.text);
  rect(er.x, er.y, er.w, er.h, COLORS.exportRect, 2.5);
  label(`${er.w}×${er.h} · 1:1`, er.x + er.w - 5, er.y + 5, 9, COLORS.exportRect, 'right');
  line(er.x + er.w / 2, er.y, er.x + er.w / 2, er.y + er.h, COLORS.center, 1, [6, 7]);
  line(er.x, er.y + er.h / 2, er.x + er.w, er.y + er.h / 2, COLORS.center, 1, [6, 7]);

  drawOverlapBands(cell, part, anchors);

  const frame = part.orientation?.frame;
  if (frame?.length === 2 && anchors[frame[0]] && anchors[frame[1]]) {
    const a = anchors[frame[0]], b = anchors[frame[1]];
    line(er.x + a.x, er.y + a.y, er.x + b.x, er.y + b.y, COLORS.skeleton, 4);
  }

  for (const [name, point] of Object.entries(anchors)) {
    if (name.endsWith('Normal')) continue;
    drawAnchorGuide(cell, name, point, part.jointZones?.[name]);
  }
  for (const [name, vector] of Object.entries(anchors)) {
    if (!name.endsWith('Normal')) continue;
    const origin = anchors[name.slice(0, -'Normal'.length)];
    if (!origin || !Number.isFinite(vector?.x) || !Number.isFinite(vector?.y)) continue;
    const x = er.x + origin.x, y = er.y + origin.y;
    const endX = x + vector.x * 18, endY = y + vector.y * 18;
    line(x, y, endX, endY, COLORS.center, 3);
    circle(endX, endY, 3, COLORS.center, 2, true);
  }

  if (cell.partName === 'torso') drawTorsoCoverage(cell, anchors);
  if (cell.partName === 'pelvisUnderlay') drawPelvisUnderlayCoverage(cell);
}

function drawProductionGrid() {
  const grid = manifest.sourceSheet.productionGrid;
  const occupied = grid.viewOrder.length * grid.slotsPerView;
  layout = {
    occupiedCells: [], reservedCells: [], masterPanels: [],
    guideStats: {
      overlapZones: 0, overlapHalves: 0,
      pelvisRoundedBounds: 0, hipCoverageDisks: 0, hipSweepDisks: 0,
      neckCoverageDisks: 0, shoulderCoverageDisks: 0, shoulderSweepDisks: 0,
    },
  };
  for (const viewName of grid.viewOrder) {
    layout.masterPanels.push({ view: viewName, ...manifest.sourceSheet.masterPanels[viewName] });
  }
  for (let index = 0; index < occupied; index++) {
    const cell = cellDescriptor(index);
    layout.occupiedCells.push(cell);
    drawProductionCell(cell);
  }
  for (const index of grid.reservedCells ?? []) {
    const col = index % grid.columns;
    const row = Math.floor(index / grid.columns);
    const x = grid.origin.x + col * grid.cell.w;
    const y = grid.origin.y + row * grid.cell.h;
    rect(x, y, grid.cell.w, grid.cell.h, COLORS.reserved, 2, [10, 8]);
    label(`${index} RESERVED`, x + grid.cell.w / 2, y + grid.cell.h / 2 - 8, 13, COLORS.reserved, 'center');
    layout.reservedCells.push({ index, x, y, w: grid.cell.w, h: grid.cell.h });
  }
}

function render() {
  const sheetCanvas = manifest.sourceSheet.canvas;
  canvas.width = sheetCanvas.w;
  canvas.height = sheetCanvas.h;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMasterPanels();
  drawProductionGrid();
  label('RIG_MARKERS · GUIDE ONLY · NEVER COMPOSITE INTO PRODUCTION ART', 2048, 1160, 24, COLORS.anchor, 'center');
  label(`${manifest.characterId} · ${manifest.rigContract} · fixed 1:1 extraction`, 2048, 1200, 16, COLORS.muted, 'center');
}

function applyZoom() {
  const scale = Number(zoom.value);
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
}

function guideBlob() {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Guide PNG encoding failed'));
  }, 'image/png'));
}

function cleanBlob() {
  const clean = document.createElement('canvas');
  clean.width = manifest.sourceSheet.canvas.w;
  clean.height = manifest.sourceSheet.canvas.h;
  // A newly allocated canvas is transparent black by definition. Do not draw
  // or copy the guide canvas here: clean art and RIG_MARKERS remain separate.
  return new Promise((resolve, reject) => clean.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Clean PNG encoding failed'));
  }, 'image/png'));
}

async function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

zoom.addEventListener('change', applyZoom);
download.addEventListener('click', async () => {
  await downloadBlob(await guideBlob(), manifest.sourceSheet.guideFile);
});
downloadClean.addEventListener('click', async () => {
  await downloadBlob(await cleanBlob(), manifest.sourceSheet.file);
});

try {
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) throw new Error(`Manifest request failed (${response.status})`);
  manifest = await response.json();
  render();
  applyZoom();
  download.disabled = false;
  downloadClean.disabled = false;
  status.textContent = `${layout.masterPanels.length} masters · ${layout.occupiedCells.length} production cells · ${canvas.width}×${canvas.height}`;
  window.__CANONICAL_SHEET = {
    manifest: () => manifest,
    canvas: () => canvas,
    layout: () => layout,
    render,
    guideBlob,
    cleanBlob,
  };
} catch (error) {
  status.className = 'status error';
  status.textContent = error.message;
  throw error;
}
