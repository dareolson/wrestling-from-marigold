import burgundyUrl from '../assets/story/marigold-sedan-v1.png';
import creamUrl from '../assets/story/marigold-sedan-cream-v1.png';
import greenUrl from '../assets/story/marigold-coupe-green-v1.png';

// Measurements are in full-resolution master pixels, not runtime export pixels.
// Full masters: Sprite sheets/Story/marigold-title/source-masters/ (ignored).
// Both crop and placement scale to the texture that Phaser loads.
export const TITLE_CARS = [
    { key: 'marigold-sedan', url: burgundyUrl, masterWidth: 1774, masterHeight: 887, tyreBottom: 755,
        hubs: [
            { cropX: 354, cropY: 574, centerX: 415, centerY: 635, size: 122 },
            { cropX: 1375, cropY: 574, centerX: 1436, centerY: 635, size: 122 },
        ] },
    { key: 'marigold-sedan-cream', url: creamUrl, masterWidth: 1774, masterHeight: 887, tyreBottom: 745,
        hubs: [
            { cropX: 356, cropY: 573, centerX: 408, centerY: 625, size: 104 },
            { cropX: 1418, cropY: 565, centerX: 1473, centerY: 620, size: 110 },
        ] },
    { key: 'marigold-coupe-green', url: greenUrl, masterWidth: 1774, masterHeight: 887, tyreBottom: 768,
        hubs: [
            { cropX: 357, cropY: 585, centerX: 416, centerY: 644, size: 118 },
            { cropX: 1374, cropY: 586, centerX: 1432, centerY: 644, size: 116 },
        ] },
];
