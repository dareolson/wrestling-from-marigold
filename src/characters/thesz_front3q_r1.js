// Lou Thesz — front-three-quarter replacement-limb COMPARISON CANDIDATE.
//
// NOT production Lou. This is a separate character so shipped `thesz` is
// untouched: different id, different asset folder, its own preset. The default
// card is unchanged; this only appears when someone asks for it with
// `?p1=thesz-front3q-r1` (or WFM_P1 through the debug harness). Deleting this
// file and its two registration lines removes it completely.
//
// WHAT THE ART IS. The twelve-part plate at
// `Sprite sheets/AI Pilot/Lou/production-front3q-modular/v3/parts`, byte for
// byte. No pixel was edited, generated or corrected for this binding, so the
// name is `r1` -- rig-binding revision 1 of the v3 art -- rather than a v4,
// which would claim an art generation that did not happen.
//
//   head            82f4fac7b82806389dc555c444683e480bc94db17196d0ffa61ed944684385a0
//   torso           bac18b32c7fb2f15b540dfefed2f1b72449e44a20393761781803e767f1031d6
//   near_upper_arm  6affe1cf763b3eb11514e2801e2e99f3e243bbd685861bf4433b9a58393659ad
//   near_forearm    f095bfce93fac145b3a7c75957ef1e4b0e4fd94b53a3ea1b5e513cad7ef9873d
//   far_forearm     2070fcde9f0e4c63ed7c9ba586cbb1de70aa9f87eeb92a1a42d01f2e8a976b70
//   near_thigh      5fd076fc42210c877603ae549a61ad64c4f432a26d818873953d559f6225f6a8
//   near_shin       ed4c506cf5387c490a0ea629aff7a63e6e5d4730fddf2dc5e78aefc75f9ba9e9
//   far_shin        2b2dd57996e03948ed4568761b4f15a008f1813b23af90eb5b3db61e37ef9e1e
//
// WHICH EIGHT OF THE TWELVE, AND WHY NOT THE OTHER FOUR.
// `npm run art:map-candidate` is the authority; the short version:
//
//   near_upper_arm -> upper_arm.png   serves BOTH arms. Skeleton.js assigns
//   far_upper_arm     (unused)        farUpArm and nearUpArm from
//                                     textures.upperArm directly -- there is no
//                                     near/far opt-in for this family -- so the
//                                     separately authored far arm cannot be
//                                     kept distinct.
//   near_thigh -> thigh.png           serves BOTH legs. The renderer does
//   far_thigh     (unused)            support split thighs, but BASE_PART_FILES
//                                     declares no filename for them, so the
//                                     loader cannot find them.
//
// Sharing those two families is NOT a regression: shipped Lou already paints
// one upper arm and one thigh and places each twice with its own offsets, tilt
// and scale. This is parity, and it needs no runtime change. What is given up
// is only the extra the candidate offers -- far-side paint authored for its own
// three-quarter perspective -- which the shipped rig has never been able to use
// for these two families.
//
// NO PELVIS LAYERS, deliberately. The candidate ships a pelvis_overlay and a
// pelvis_underlay; neither is wired here. Shipped Lou keeps his trunks in the
// torso, and this candidate's torso does too (see the part: complete black
// trunks, painted). Adding the overlay on top would draw the same trunks twice.
// This is also why the two headline pelvis findings -- the 8.2% torso-to-pelvis
// hip-span disagreement and the pelvis_overlay that carries no registration
// landmarks at all -- do not bear on this track: they are properties of layers
// that are not on it.
//
// HIP SOCKETS ARE DELIBERATELY OMITTED from rigProfile below, even though the
// candidate measured them. Skeleton.js:549 switches a character to the authored
// dynamic-pelvis leg path the moment its torso declares nearHip and farHip, and
// shipped Lou runs the legacy leg path. Declaring them would have made this a
// comparison of two rig paths wearing different art, which answers nothing.
// Only neck/nearShoulder/farShoulder are declared, exactly as in thesz.js.
//
// EVERY NUMBER BELOW IS DERIVED, none is hand-tuned. Sources: the candidate's
// own measured landmarks (`production-front3q-modular/v2/landmarks.json`), the
// art's ink bounds, and shipped Lou's geometry. Skeleton._placePart renders a
// part at box.h/(1-jointPivotFrac) with its origin at jointPivotFrac, so box.h
// is the JOINT -> CANVAS-BOTTOM span in display units; each box.h below is
// solved so the bone span underneath it equals shipped Lou's, and each box.w so
// the limb's on-screen ink width equals shipped Lou's. The comparison is
// therefore about the ART, not about size.
//
//   upperArm  shoulder->elbow  68.0 px   ink w 26.7 px
//   forearm   elbow->hand      49.0 px   ink w 18.0 px
//   thigh     hip->knee        49.0 px   ink w 36.4 px
//   shin      knee->sole       86.0 px   ink w 36.1 px
//   torso     ink h           108.1 px   ink w 60.9 px
//   head      headScale       0.5457     ink w 38.5 px
//
// CORRECTED 2026-09-22. The first binding got the widths wrong. _placePart
// renders a part at box.w * s * GROWTH, growth = 1/(1-jointPivotFrac), and the
// width derivation ignored that factor on both sides of the comparison. The
// heights were right -- box.h is solved through the same growth and the
// rendered figure measured 204.2px against shipped Lou's 204.9px -- but every
// limb came out 3.2% to 21.8% WIDER than the shipped limb it was supposed to
// match: upperArm +21.8, forearm +13.5, thigh +11.2, shin +3.2.
//
// Worth stating plainly because it cuts against the review it fed: the error
// made the candidate THICKER than intended, so Derek's "too lean" verdict was
// reached in spite of it, not because of it. The art is leaner than those
// screenshots showed.
//
// SCREEN-SPACE OFFSETS ARE ALL ZERO, and that is a deliberate reporting choice
// rather than a tuning result. Shipped Lou's armOffset/legOffset/forearm/shin
// nudges and tilts were tuned by Derek against the shipped art's proportions;
// carrying them over would apply corrections meant for different paintings and
// disguise where this art actually lands. Zero shows what the measured
// landmarks alone produce. If Derek likes the art, the tuner pass comes after.
//
// Pose and kit are shipped Lou's, unchanged, so nothing but the art differs.
import { thesz } from './thesz.js';

export const theszFront3qR1 = {
    id:        'thesz-front3q-r1',
    skinCol:   thesz.skinCol,
    trunksCol: thesz.trunksCol,
    textures: {
        // Shipped Lou's 0.877 maps HIS assembled skeleton to 265px. This
        // candidate's parts assemble to a different raw height, so the value is
        // carried over unchanged rather than re-solved: re-solving it here would
        // hide a proportion difference that is exactly what Derek is reviewing.
        // Measure the rendered figure before reading anything into its height.
        heightScale: 0.877,
        head:     'thesz_f3q_head',
        neckInTorso: true,
        headScale: 0.5457,
        // The candidate head declares only headAnchorFrac (the neck base at
        // v=0.946), which is the real schema -- no jointPivotFrac.
        headAnchorFrac: { u: 0.56872, v: 0.946237 },
        headOffsetX: 0,
        headOffsetY: 0,
        torso:    { key: 'thesz_f3q_torso', box: { w: 66.89, h: 114.71 } },
        rigProfile: {
            sockets: {
                neck:         { u: 0.567669, v: 0.107656 },
                nearShoulder: { u: 0.236842, v: 0.275120 },
                farShoulder:  { u: 0.812030, v: 0.251196 },
                // nearHip/farHip intentionally absent -- see the header.
            },
        },
        armOffsetX: 0,
        armOffsetY: 0,
        upperArm: {
            key: 'thesz_f3q_upper_arm',
            box: { w: 52.37, h: 79.31 },
            jointPivotFrac: 0.178788,
            distalAnchorFrac: { u: 0.517094, v: 0.882915 },
            pivotOffsetFrac: 0.017094,
        },
        // Split forearms: this family DOES have a near/far opt-in, so the
        // candidate's separately authored near and far hands are both used.
        nearForearm: {
            key: 'thesz_f3q_near_forearm',
            box: { w: 40.10, h: 49 },
            jointPivotFrac: 0.182891,
            pivotOffsetFrac: -0.007407,
        },
        farForearm: {
            key: 'thesz_f3q_far_forearm',
            box: { w: 42.12, h: 49 },
            jointPivotFrac: 0.186747,
            pivotOffsetFrac: 0.001931,
        },
        nearForearmOffsetX: 0,
        nearForearmOffsetY: 0,
        farForearmOffsetX: 0,
        farForearmOffsetY: 0,
        thigh: {
            key: 'thesz_f3q_thigh',
            box: { w: 39.40, h: 52.58 },
            jointPivotFrac: 0.100490,
            pivotOffsetFrac: -0.033784,
        },
        thighH: 49,
        shinH:  50,
        legOffsetX: 0,
        legOffsetY: 0,
        nearLegOffsetY: 0,
        nearLegTilt: 0,
        nearShin: {
            key: 'thesz_f3q_near_shin',
            box: { w: 37.80, h: 88.97 },
            jointPivotFrac: 0.084706,
            pivotOffsetFrac: -0.105000,
            soleAnchorFrac: { u: 0.630000, v: 0.969412 },
        },
        farShin: {
            key: 'thesz_f3q_far_shin',
            box: { w: 37.32, h: 89.19 },
            jointPivotFrac: 0.090000,
            pivotOffsetFrac: -0.173267,
            soleAnchorFrac: { u: 0.643564, v: 0.967500 },
        },
        nearShinOffsetX: 0,
        nearShinOffsetY: 0,
        farShinOffsetX: 0,
        farShinOffsetY: 0,
    },
    idlePose: thesz.idlePose,
    moveSet:  thesz.moveSet,
};
