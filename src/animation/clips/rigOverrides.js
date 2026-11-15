// PLAN_LIGHT_MOVES build rules: a move has ONE spec, and a wrestler's differences are overrides keyed by role and rig id (`attacker['george-roster-v1']`,
// `defender['thesz-procreate-v1']`), merged base -> attacker override -> defender override. Clip files read the merged spec and never test a rig id or a name.
export const LOU_RIG = 'thesz-procreate-v1';
export const GEORGE_RIG = 'george-roster-v1';

// Plain-object deep merge (arrays and numbers replace).
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
export const deepMerge = (a, b) => {
    if (!isObj(b)) return b === undefined ? a : b;
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(a?.[k]) ? deepMerge(a[k], v) : v;
    return out;
};

// `spec.attacker` / `spec.defender` hold the override tables; the base is everything else. A rig with no entry takes the base.
export const specFor = (spec, { attackerRigId, defenderRigId } = {}) => {
    const { attacker, defender, ...base } = spec;
    return deepMerge(deepMerge(base, attacker?.[attackerRigId]), defender?.[defenderRigId]);
};
