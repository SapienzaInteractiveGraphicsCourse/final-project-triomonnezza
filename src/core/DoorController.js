/**
 * DoorController.js
 *
 * Handles all hinged-door animation (open / close / goal door) that was
 * previously scattered through main.js.  Listens to the same global events
 * ('portaAperta', 'portaGoalAperta') so the rest of the game doesn't need
 * to change at all.
 *
 * Dependencies injected via constructor so this class stays testable and
 * has no implicit globals.
 */

import * as THREE from 'three';

export class DoorController {
    /**
     * @param {object} TWEEN        — tween.js library reference
     * @param {THREE.Scene} scene   — for positional audio placement
     * @param {object} audioSystem  — AudioSystem singleton
     * @param {Function} [onGoalOpened] — optional callback when goal door opens
     */
    constructor(TWEEN, scene, audioSystem, onGoalOpened = null) {
        this.TWEEN       = TWEEN;
        this.scene       = scene;
        this.audio       = audioSystem;
        this.onGoalOpened = onGoalOpened;

        this._initListeners();
    }

    _initListeners() {
        document.addEventListener('portaAperta',     (e) => this._onDoorInteract(e.detail));
        document.addEventListener('portaGoalAperta', (e) => this._onGoalDoor(e.detail));
    }

    // ─────────────────────────────────────────────────────────────────────
    // EASING — "back-out" for door opening: overshoots slightly then
    // settles back — a single continuous curve (no velocity-zero seams).
    // Lower overshootStrength than tween.js default (1.70158) for a heavy
    // wooden door feel rather than a bouncy UI button.
    // ─────────────────────────────────────────────────────────────────────
    _doorBackOut(t) {
        const s = 1.2;
        t -= 1;
        return t * t * ((s + 1) * t + s) + 1;
    }

    _onDoorInteract(detail) {
        const hitMesh = detail.object;
        const hinge   = hitMesh.parentHinge || hitMesh;

        // Block re-triggering while mid-swing
        if (hinge.userData.isAnimating) return;
        if (!hinge.userData.isOpen && hinge.userData.isAnimating) return;

        const wasOpen = hinge.userData.isOpen;
        hinge.userData.isOpen      = !wasOpen;
        hinge.userData.isAnimating = true;

        if (wasOpen) {
            this._animateClose(hinge);
        } else {
            this._animateOpen(hinge);
        }
    }

    _animateClose(hinge) {
        // Restore collision box immediately so the monster can't slip through
        if (hinge.userData.collisionBox && hinge.userData.closedBoxMin) {
            hinge.userData.collisionBox.set(
                hinge.userData.closedBoxMin,
                hinge.userData.closedBoxMax
            );
        }

        const targetY    = hinge.userData.startRotationY;
        const overshootY = targetY - 0.07; // slams slightly past closed then settles

        const swing = new this.TWEEN.Tween(hinge.rotation)
            .to({ y: overshootY }, 550)
            .easing(this.TWEEN.Easing.Quadratic.In)
            .onComplete(() => {
                // Sound fires at the moment of physical impact, not at start
                const closeSound = this.audio.playPositionalSoundAt(
                    'close_door', this.scene, hinge.position, 10, 1.0
                );
                document.dispatchEvent(new CustomEvent('portaSbattuta'));

                // Fade out the tail of the close sound naturally
                if (closeSound) {
                    setTimeout(() => {
                        if (!closeSound.isPlaying) return;
                        const proxy = { vol: closeSound.getVolume() };
                        new this.TWEEN.Tween(proxy)
                            .to({ vol: 0 }, 250)
                            .easing(this.TWEEN.Easing.Quadratic.In)
                            .onUpdate(() => { closeSound.setVolume(proxy.vol); })
                            .onComplete(() => { closeSound.stop(); })
                            .start();
                    }, 600);
                }

                // Record when the player closed this door (monster reopen cooldown)
                hinge.userData.closedAt = performance.now();
            });

        const thud = new this.TWEEN.Tween(hinge.rotation)
            .to({ y: targetY }, 150)
            .easing(this.TWEEN.Easing.Quadratic.Out)
            .onComplete(() => { hinge.userData.isAnimating = false; });

        swing.chain(thud);
        swing.start();
    }

    _animateOpen(hinge) {
        // Clear collision box only after the door is ~45% open visually,
        // so the monster can't slip through while the anta is still swinging.
        const doorOpenClearanceDelay = 220 + 2200 * 0.45; // ~1210 ms

        const baseY   = hinge.userData.startRotationY;
        const targetY = baseY + (Math.PI / 2);
        const stickY  = baseY + (targetY - baseY) * 0.035; // micro-movement to break static friction

        const stick = new this.TWEEN.Tween(hinge.rotation)
            .to({ y: stickY }, 220)
            .easing(this.TWEEN.Easing.Sinusoidal.In)
            .onComplete(() => {
                // Play creak sound once the actual visible swing begins
                const sound = this.audio.playPositionalSoundAt(
                    'open_door', this.scene, hinge.position, 10, 1.0
                );
                if (sound && sound.setPlaybackRate) sound.setPlaybackRate(0.75);
            });

        setTimeout(() => {
            if (hinge.userData.collisionBox) hinge.userData.collisionBox.makeEmpty();
        }, doorOpenClearanceDelay);

        const swing = new this.TWEEN.Tween(hinge.rotation)
            .to({ y: targetY }, 2200)
            .easing((t) => this._doorBackOut(t))
            .onComplete(() => {
                hinge.updateMatrixWorld(true);
                hinge.userData.collisionBox.setFromObject(hinge);
                hinge.userData.isAnimating = false;
            });

        stick.chain(swing);
        stick.start();
    }

    _onGoalDoor(detail) {
        const group = detail.object.parent || detail.object;

        this.audio.playPositionalSoundAt('door_key', this.scene, group.position, 10, 1.0);

        // Shrink and remove the goal door mesh
        new this.TWEEN.Tween(group.scale)
            .to({ x: 0.001, y: 0.001, z: 0.001 }, 600)
            .easing(this.TWEEN.Easing.Back.In)
            .onComplete(() => { this.scene.remove(group); })
            .start();

        if (this.onGoalOpened) this.onGoalOpened(group);
    }
}
