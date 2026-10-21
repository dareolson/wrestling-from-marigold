"""Export an inventoried Procreate delivery, preserving source pixels and origins.

python3 tools/wrestler-cutter/export-roster-psds.py 'Sprite sheets/RosterNew/2026-10-18'
Requires Pillow and Claude's existing psd-layer-reader.py. No cleanup or binding.
Optional --cleanup writes separate alpha-floor/component derivatives (NumPy/SciPy).
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

from PIL import Image


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cleanup(root):
    import numpy as np
    from scipy import ndimage

    for manifest in sorted(root.glob('*/extracted-v1/manifest.json')):
        source = json.loads(manifest.read_text())
        out = manifest.parent / 'cleaned-v1'
        parts = out / 'layers-full-canvas'
        parts.mkdir(parents=True, exist_ok=True)
        composite = Image.new('RGBA', tuple(source['canvas']))
        records = []
        for layer in source['layers']:
            if not layer['selected']:
                continue
            path = manifest.parent / layer['file']
            rgba = np.array(Image.open(path).convert('RGBA'))
            alpha = rgba[:, :, 3].copy()
            labels, count = ndimage.label(alpha > 15, structure=np.ones((3, 3)))
            sizes = np.bincount(labels.ravel())
            sizes[0] = 0
            if not count:
                raise ValueError(f'No paint survives alpha floor: {path}')
            largest = int(sizes.argmax())
            secondary = sorted((int(n) for i, n in enumerate(sizes) if i != largest and n), reverse=True)
            if secondary and secondary[0] > 64:
                raise ValueError(f'Disconnected paint needs review rather than removal: {path}: {secondary}')
            keep = labels == largest
            new_alpha = np.where(keep, alpha, 0).astype('uint8')
            # Preserve all surviving RGBA paint; only discarded alpha is cleared.
            rgba[:, :, 3] = new_alpha
            image = Image.fromarray(rgba)
            target = parts / Path(layer['file']).name
            image.save(target)
            record = {'role': layer['role'], 'source_file': layer['file'],
                      'raw_sha256': layer['sha256'], 'file': str(target.relative_to(out)),
                      'sha256': digest(target), 'alpha_floor_removed': int(((alpha > 0) & (alpha <= 15)).sum()),
                      'disconnected_removed': int(((alpha > 15) & ~keep).sum()),
                      'removed_component_sizes': secondary,
                      'alpha_bbox': image.getchannel('A').getbbox()}
            with Image.open(path) as raw_image, Image.open(target) as derived:
                a, b = np.array(raw_image), np.array(derived)
                if not np.array_equal(a[keep], b[keep]):
                    raise ValueError(f'Surviving paint changed: {target}')
            if digest(path) != layer['sha256']:
                raise ValueError(f'Raw export changed: {path}')
            records.append(record)
            composite = Image.alpha_composite(composite, image)
        composite.save(out / 'figure.png')
        Image.alpha_composite(Image.new('RGBA', composite.size, (68, 72, 78, 255)), composite).convert('RGB').save(out / 'figure-on-gray.png')
        report = {'source_sha256': source['source_sha256'], 'canvas': source['canvas'],
                  'processing': 'alpha <=15 cleared; largest 8-connected component retained',
                  'no_crop_resize_rotation_rgb_repaint_or_opacity_boost': True,
                  'max_secondary_component_allowed_pixels': 64, 'layers': records}
        (out / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
        # Convenience crops for landmark measurement, never runtime-ready parts.
        crops = out / 'measurement-crops'
        crops.mkdir(exist_ok=True)
        crop_records = []
        for record in records:
            image = Image.open(out / record['file']).convert('RGBA')
            x0, y0, x1, y1 = record['alpha_bbox']
            box = (max(0, x0 - 16), max(0, y0 - 16),
                   min(image.width, x1 + 16), min(image.height, y1 + 16))
            target = crops / Path(record['file']).name
            crop = image.crop(box)
            crop.save(target)
            with Image.open(target) as reread:
                if reread.tobytes() != crop.tobytes():
                    raise ValueError(f'Crop pixel round-trip failed: {target}')
            crop_records.append({'role': record['role'], 'file': target.name,
                                 'full_canvas_origin': list(box[:2]),
                                 'source_rectangle': list(box), 'size': list(crop.size),
                                 'sha256': digest(target)})
        (crops / 'manifest.json').write_text(json.dumps({
            'status': 'measurement convenience only; no landmarks or runtime binding',
            'canvas': source['canvas'], 'padding_pixels': 16,
            'coordinate_rule': 'full_canvas_xy = crop_xy + full_canvas_origin',
            'parts': crop_records}, indent=2) + '\n')
        print(json.dumps({'cleaned': source['source'], 'layers': len(records),
                          'stray_pixels_removed': sum(r['disconnected_removed'] for r in records)}))


def export(root):
    spec = importlib.util.spec_from_file_location(
        'psd_reader', Path(__file__).with_name('psd-layer-reader.py'))
    reader = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(reader)
    sources = json.loads((root / 'sources.json').read_text())
    results = []
    for source in sources:
        psd = root / source['file']
        expected = source['sha256']
        if digest(psd) != expected:
            raise ValueError(f'Source hash changed: {psd}')
        hdr, layers = reader.parse(psd)
        if (hdr['depth'], hdr['mode']) != (8, 3):
            raise ValueError(f'Only 8-bit RGB supported: {psd}')
        inventory = json.loads((root / psd.stem / 'inventory.json').read_text())
        roles = {r['id']: r['visual_role'] for r in inventory['layers']}
        size = (hdr['width'], hdr['height'])
        out = root / psd.stem / 'extracted-v1'
        raw = out / 'layers-full-canvas'
        excluded = out / 'excluded-layers'
        raw.mkdir(parents=True, exist_ok=True)
        excluded.mkdir(parents=True, exist_ok=True)
        composite = Image.new('RGBA', size)
        records = []
        for i, layer in enumerate(layers):
            if (layer['mask_length'] or layer['section_type'] or layer['clipping']
                    or layer['blend'] != 'norm' or layer['opacity'] != 255):
                raise ValueError(f'Unsupported mask/group/clipping/blend/opacity: {psd}:{i}')
            if layer['blending_ranges_length']:
                raise ValueError(f'Blend-if ranges need explicit review: {psd}:{i}')
            role = roles[i]
            selected = role not in ('background', 'hidden_full_figure_reference')
            if selected and not layer['visible']:
                raise ValueError(f'Mapped art unexpectedly hidden: {psd}:{i}')
            w, h = layer['w'], layer['h']
            planes = []
            for channel in (0, 1, 2, -1):
                data = layer['pixels'].get(channel)
                if data is None or len(data) != w * h:
                    raise ValueError(f'Undecoded/truncated channel: {psd}:{i}:{channel}')
                planes.append(Image.frombytes('L', (w, h), data))
            image = Image.merge('RGBA', planes)
            full = Image.new('RGBA', size)
            # Unmasked paste preserves RGBA samples, including translucent paint.
            full.paste(image, (layer['left'], layer['top']))
            target = (raw if selected else excluded) / f'{i:02d}-{role}.png'
            full.save(target)
            with Image.open(target) as reread:
                if reread.mode != 'RGBA' or reread.size != size or reread.tobytes() != full.tobytes():
                    raise ValueError(f'Pixel round-trip failed: {target}')
            hist = full.getchannel('A').histogram()
            ink = sum(hist[1:])
            core, fringe = sum(hist[250:]), sum(hist[1:16])
            record = {
                'id': i, 'source_name': layer['name'], 'role': role,
                'selected': selected, 'source_visible': layer['visible'],
                'source_bounds': [layer['left'], layer['top'], layer['right'], layer['bottom']],
                'mask_length': layer['mask_length'], 'section_type': layer['section_type'],
                'blend': layer['blend'], 'opacity': layer['opacity'], 'clipping': layer['clipping'],
                'file': str(target.relative_to(out)), 'sha256': digest(target),
                'alpha_bbox': full.getchannel('A').getbbox(),
                'ink_pixels': ink, 'core_alpha_250_255': core,
                'core_fraction': core / ink if ink else 0,
                'edge_alpha_16_249': sum(hist[16:250]),
                'fringe_alpha_1_15': fringe,
                'fringe_fraction': fringe / ink if ink else 0,
            }
            records.append(record)
            # Procreate records in this delivery run bottom-to-top (background first).
            if selected:
                composite = Image.alpha_composite(composite, full)
        composite.save(out / 'figure.png')
        for title, color in [('figure-on-white.png', (255, 255, 255, 255)),
                             ('figure-on-gray.png', (68, 72, 78, 255))]:
            Image.alpha_composite(Image.new('RGBA', size, color), composite).convert('RGB').save(out / title)
        if digest(psd) != expected:
            raise ValueError(f'Source changed during export: {psd}')
        report = {
            'source': source['file'], 'source_sha256': expected, 'canvas': size,
            'tool': 'tools/wrestler-cutter/export-roster-psds.py',
            'composite_order': 'bottom-to-top source record order',
            'processing': 'lossless layer decode, aligned export, selected-layer alpha composite only',
            'no_crop_resize_rotation_cleanup_or_repaint': True, 'layers': records,
            'figure_sha256': digest(out / 'figure.png'),
        }
        (out / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
        lines = [f'# {psd.name}: full-canvas exports', '',
                 f'Source SHA-256: `{expected}`. Verified before and after export.', '',
                 f'Canvas: {size[0]} x {size[1]}. RGBA, common original origin.', '',
                 'No masks, groups, clipping, blend-if ranges or partial layer opacity.', '',
                 'Background and hidden reference layers are preserved separately in',
                 '`excluded-layers/`; only selected art contributes to `figure.png`.', '',
                 '| ID | Source layer | Role | Exported as art | Ink px | Core >=250 | Alpha 1-15 |',
                 '| --- | --- | --- | --- | --- | --- | --- |']
        for r in records:
            lines.append(f"| {r['id']} | {r['source_name']} | {r['role']} | {r['selected']} | {r['ink_pixels']} | {r['core_fraction']:.1%} | {r['fringe_fraction']:.1%} |")
        lines += ['', 'Core/fringe percentages describe alpha only, not joint coverage or absence',
                  'of a halo. Raw paint is unchanged; no alpha floor or component removal.', '',
                  'These are aligned source layers, not cropped or calibrated runtime textures.']
        (out / 'LAYER_INVENTORY.md').write_text('\n'.join(lines) + '\n')
        results.append({'source': source['file'], 'art_layers': sum(r['selected'] for r in records),
                        'output': str(out), 'source_hash_unchanged': True})
        print(json.dumps(results[-1]))
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('delivery', type=Path)
    parser.add_argument('--cleanup', action='store_true', help='Also make separate alpha-floor/component-cleaned derivatives')
    args = parser.parse_args()
    export(args.delivery)
    if args.cleanup:
        cleanup(args.delivery)
