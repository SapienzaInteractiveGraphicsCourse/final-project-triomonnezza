/**
 * BloodSplatter.js
 *
 * Generates procedural CSS blood-splatter overlays for the death screen.
 * Extracted from main.js to keep UI concerns in src/ui/.
 *
 * Technique: organic blobs via irregular border-radius (8 values) +
 * radial-gradient for the wet/shiny look + box-shadow for scattered
 * droplets (no extra DOM elements per droplet — efficient).
 * Everything is randomised: each death looks different.
 */

// ─── Internal helpers ────────────────────────────────────────────────────────

const _BLOOD_PALETTE = [
    '#8a0303', '#800000', '#7a0000', '#920404',
    '#5c0000', '#4a0000', '#3a0000', '#2a0000',
];

function _randRange(min, max) {
    return min + Math.random() * (max - min);
}

function _randomBloodColor() {
    return _BLOOD_PALETTE[Math.floor(Math.random() * _BLOOD_PALETTE.length)];
}

/** 8 random % values for an organic rounded blob (4 corners × 2 axes) */
function _randomBorderRadius() {
    const r = () => Math.round(_randRange(30, 70));
    return `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;
}

/**
 * Creates a single blood-blast element: organic blob + scattered droplets
 * via box-shadow (no extra DOM nodes per droplet).
 */
function _makeBloodBlast(topVh, leftVw, sizeVw) {
    const el = document.createElement('div');
    el.className = 'blood-blob';
    el.style.cssText = `
        position: absolute;
        top: ${topVh}vh;
        left: ${leftVw}vw;
        width: ${sizeVw.toFixed(1)}vw;
        height: ${(sizeVw * _randRange(0.8, 1.2)).toFixed(1)}vw;
        border-radius: ${_randomBorderRadius()};
        transform: rotate(${_randRange(-40, 40).toFixed(0)}deg);
    `;

    const light = _randomBloodColor();
    const mid   = _randomBloodColor();
    const dark  = _randomBloodColor();
    el.style.background = `radial-gradient(circle at ${Math.round(_randRange(25, 45))}% ${Math.round(_randRange(25, 45))}%, ${light} 0%, ${mid} 65%, ${dark} 100%)`;

    // Scattered droplets as box-shadow (efficient: single DOM node)
    const dropletCount = 3 + Math.floor(Math.random() * 4);
    const shadows = [];
    for (let i = 0; i < dropletCount; i++) {
        const dx     = _randRange(-9, 9).toFixed(1);
        const dy     = _randRange(-9, 9).toFixed(1);
        const blur   = _randRange(0, 1.5).toFixed(1);
        const spread = (-_randRange(1.5, 3.5)).toFixed(1);
        shadows.push(`${dx}vw ${dy}vh ${blur}px ${spread}px ${_randomBloodColor()}`);
    }
    el.style.boxShadow = shadows.join(', ');

    return el;
}

/** Creates a vertical blood drip with a bulging bead at the bottom */
function _makeBloodDrip(topVh, leftVw) {
    const el     = document.createElement('div');
    const width  = _randRange(0.6, 1.8);  // vw
    const height = _randRange(8, 22);      // vh
    const c1     = _randomBloodColor();
    const c2     = _randomBloodColor();

    el.className = 'blood-drip';
    el.style.cssText = `
        position: absolute;
        top: ${topVh.toFixed(1)}vh;
        left: ${leftVw.toFixed(1)}vw;
        width: ${width.toFixed(1)}vw;
        height: ${height.toFixed(1)}vh;
        border-radius: 50% 50% 45% 45% / 60% 60% 25% 25%;
        transform: rotate(${_randRange(-6, 6).toFixed(1)}deg);
        opacity: ${_randRange(0.75, 0.95).toFixed(2)};
        background: linear-gradient(to bottom, ${c1} 0%, ${c2} 55%, ${c2} 82%, transparent 100%);
    `;

    // Bulging bead at the tip
    const beadSize = width * 1.4;
    const bead     = document.createElement('div');
    bead.style.cssText = `
        position: absolute;
        bottom: 2%;
        left: 50%;
        width: ${beadSize.toFixed(1)}vw;
        height: ${(beadSize * 0.85).toFixed(1)}vw;
        transform: translateX(-50%);
        border-radius: 50%;
        background: radial-gradient(circle at 35% 30%, ${c1}, ${c2});
    `;
    el.appendChild(bead);

    return el;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fills the #blood-splatter-overlay element with a randomised splatter.
 * Safe to call multiple times (clears previous content first).
 */
export function generateBloodSplatter() {
    const container = document.getElementById('blood-splatter-overlay');
    if (!container) return;
    container.innerHTML = '';

    // 5 main blasts near edges/corners — centre stays readable
    const positions = [
        { top: _randRange(2,  20), left: _randRange(2,  20) },
        { top: _randRange(2,  18), left: _randRange(78, 96) },
        { top: _randRange(75, 95), left: _randRange(2,  20) },
        { top: _randRange(75, 95), left: _randRange(75, 95) },
        { top: _randRange(80, 96), left: _randRange(38, 58) },
    ];

    for (const pos of positions) {
        const size = _randRange(9, 15);
        container.appendChild(_makeBloodBlast(pos.top, pos.left, size));

        // Drip downward from blasts that aren't already near the bottom
        if (pos.top < 70 && Math.random() < 0.7) {
            const dripCount = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < dripCount; i++) {
                container.appendChild(
                    _makeBloodDrip(pos.top + size * 0.55, pos.left + _randRange(size * 0.15, size * 0.7))
                );
            }
        }
    }

    // A few smaller isolated droplets towards the centre to link the blasts
    const extras = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < extras; i++) {
        container.appendChild(_makeBloodBlast(_randRange(15, 80), _randRange(15, 80), _randRange(2, 4.5)));
    }
}
