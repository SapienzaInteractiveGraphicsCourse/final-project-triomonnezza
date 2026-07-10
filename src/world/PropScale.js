/**
 * Per-asset uniform scale factors so each prop's real dimension matches a
 * plausible real-world size relative to the player character, instead of
 * the old flat ×2.2 applied to every prop regardless of what it was.
 *
 * Derived as targetMeters * HUMAN_SCALE / rawModelSize, where rawModelSize
 * is each GLB's own unscaled bounding-box dimension (measured directly from
 * the glTF accessor min/max) and HUMAN_SCALE (≈1.543) converts real-world
 * meters into this game's unit system, calibrated against the player's own
 * eye height (PlayerController.js: camera eye = 2.5 units ≈ a 1.62 m real
 * eye height).
 *
 * cabinetHigh.glb is intentionally NOT listed: its source file has its two
 * door meshes authored ~1.3 units below the cabinet body's own origin (a
 * broken/mis-exported pivot, confirmed by inspecting the glTF node graph),
 * so no single position/scale fix can put both the body and doors in the
 * right place. Map code should use cabinet.glb instead.
 */
export const DEFAULT_PROP_SCALE = 2.2;

export const PropScale = {
    // Beds
    'bed.glb': 1.3701,
    'bed2.glb': 0.7652,

    // Seating
    'chair.glb': 1.2255,
    'chair2.glb': 1.1791,
    'chair3.glb': 1.2067,
    'couchBig.glb': 1.1922,
    'couchSmall.glb': 1.1922,
    'couchSmall2.glb': 1.1293,

    // Tables & desks
    'table.glb': 1.6065,
    'table2.glb': 1.3905,
    'tableSmall.glb': 1.0846,
    'tableSmall2.glb': 1.0846,
    'tableSmall3.glb': 2.45,

    // Storage
    'bookshelf.glb': 1.23,
    'cabinet.glb': 0.8341,
    'cabinetLow.glb': 1.2722,
    'cabinetSink.glb': 1.0219,
    'sideboard.glb': 1.4099,
    'sideboard2.glb': 1.6752,
    'shelves.glb': 1.5302,

    // Electronics / appliances / lighting
    'radio.glb': 1.4667,
    'phone.glb': 0.8712,
    'tv.glb': 1.3018,
    'lamp.glb': 1.6032,
    'tableLamp.glb': 1.5811,
    'fridge.glb': 1.1027,

    // Bathroom
    'bathroomSink.glb': 1.0439,
    'toilet.glb': 0.9312,
    'toiletPaper.glb': 1.3145,

    // Nature
    'plant.glb': 2.1212,
    'plant2.glb': 2.1135,

    // Junk & clutter
    'bookStack.glb': 0.8156,
    'bookStack2.glb': 0.7995,
    'box.glb': 2.0304,
    'box2.glb': 2.2305,
    'trashBin.glb': 1.0992,
    'trashBag.glb': 1.1354,
    'bucket.glb': 0.9178,
    'broom.glb': 1.0222,

    // Misc
    'radiator.glb': 1.2124,
    'breakerBox.glb': 1.434,
    'ladder.glb': 1.8077,
    'carpet.glb': 1.3116,
    'carpet2.glb': 1.5286,

    // Wall-mounted decor
    'painting.glb': 1.0473,
    'painting2.glb': 1.6298,
    'painting3.glb': 1.3317,
    'painting4.glb': 0.6997,
    'mirror.glb': 1.6172,
    'mirror2.glb': 0.8486,
    'clock.glb': 0.7411,
    'wallShelf.glb': 1.0626,
    'wallShelf2.glb': 0.9074,
};

export function getPropScale(filename) {
    return PropScale[filename] ?? DEFAULT_PROP_SCALE;
}

/**
 * Floor-standing structural furniture that should block player movement —
 * roughly waist-height or taller, solid, not meant to be walked through.
 * Small tabletop clutter (books, cups, lamps, radios, phones), floor decor
 * (plants, trash, carpets) and anything wall-mounted are intentionally
 * excluded: they'd add collision-check cost for no gameplay benefit and
 * risk snagging the player on knee-high or wall-flush objects.
 */
const STRUCTURAL_PROPS = new Set([
    'bed.glb', 'bed2.glb',
    'chair.glb', 'chair2.glb', 'chair3.glb',
    'couchBig.glb', 'couchSmall.glb', 'couchSmall2.glb',
    'table.glb', 'table2.glb', 'tableSmall.glb', 'tableSmall2.glb', 'tableSmall3.glb',
    'bookshelf.glb', 'cabinet.glb', 'cabinetLow.glb', 'cabinetSink.glb',
    'sideboard.glb', 'sideboard2.glb', 'shelves.glb',
    'fridge.glb', 'bathroomSink.glb', 'toilet.glb', 'radiator.glb', 'ladder.glb',
]);

export function isStructuralProp(filename) {
    return STRUCTURAL_PROPS.has(filename);
}
