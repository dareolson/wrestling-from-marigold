// ?sellart and ?aftermath are on by default in the game (Derek 2026-10-24). These
// tests were written when an absent flag meant off, and they test one flag at a
// time. `onlyListed` keeps that meaning: either flag absent from `search` is
// written as `=off`. `undefined` (no location: Node, tools) is passed through.
export function onlyListed(search) {
    if (search === undefined) return undefined;
    const q = new URLSearchParams(search);
    for (const name of ['sellart', 'aftermath']) if (!q.has(name)) q.set(name, 'off');
    return `?${q}`;
}
