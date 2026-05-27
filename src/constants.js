export const W = 960;
export const H = 600;

export const RING = {
    nearLeft:  { x: 40,  y: 445 },
    nearRight: { x: 920, y: 445 },
    farLeft:   { x: 210, y: 258 },
    farRight:  { x: 750, y: 258 },
    ropes: [
        { nearY: 380, farY: 218 },
        { nearY: 316, farY: 181 },
        { nearY: 251, farY: 142 },
    ],
    apronY: 490,
};

export function ringBoundsAtY(y) {
    const { nearLeft, nearRight, farLeft, farRight } = RING;
    const t = (nearLeft.y - y) / (nearLeft.y - farLeft.y);
    return {
        left:  nearLeft.x  + (farLeft.x  - nearLeft.x)  * t,
        right: nearRight.x + (farRight.x - nearRight.x) * t,
    };
}

export function perspectiveScale(y) {
    const t = Math.max(0, Math.min(1, (y - RING.farLeft.y) / (RING.nearLeft.y - RING.farLeft.y)));
    return 0.58 + t * 0.42;
}
