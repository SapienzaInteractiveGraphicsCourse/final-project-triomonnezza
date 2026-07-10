/**
 * FlashlightController.js
 *
 * Manages all per-frame flashlight behaviour extracted from main.js:
 *   - Torch sway / bob (idle / walk / sprint + fear tremor)
 *   - Battery drain over time
 *   - Low-battery flicker effect
 *   - Fear-interference flicker (monster proximity)
 *   - Sprint FOV kick
 *   - Battery recharge (pickup)
 *
 * Call update(deltaTime, fearFactor) every frame AFTER player.update().
 * Call recharge() when a battery is collected.
 */

export class FlashlightController {
    /**
     * @param {object} deps
     * @param {object}           deps.player    — PlayerController instance
     * @param {THREE.Camera}     deps.camera    — main perspective camera
     * @param {object}           deps.TWEEN     — tween.js library reference
     * @param {object}           [deps.config]  — optional overrides
     */
    constructor({ player, camera, TWEEN, config = {} }) {
        this.getPlayer = () => player; // allow late binding (player may be null at init)
        this._playerRef = player;
        this.camera = camera;
        this.TWEEN  = TWEEN;

        // ── Battery config ──────────────────────────────────────────────
        this.BATTERY_MIN_PERCENT    = config.batteryMinPercent    ?? 30;
        this.DRAIN_INTERVAL_SEC     = config.drainIntervalSec     ?? 2;
        this.FLICKER_THRESHOLD_PCT  = config.flickerThresholdPct  ?? 40;
        this.FEAR_FLICKER_THRESHOLD = config.fearFlickerThreshold ?? 0.15;

        // ── FOV config ──────────────────────────────────────────────────
        this.BASE_FOV   = config.baseFov   ?? 75;
        this.SPRINT_FOV = config.sprintFov ?? 84;

        // ── State ───────────────────────────────────────────────────────
        this.batteryPercent   = 100;
        this._drainTimer      = 0;

        // Animated multiplier written by TweenManager via 'torciaScarica' event
        // Applied on top of PlayerController's intensity every frame.
        this.batteryMult = { mult: 1.0 };

        // Sway oscillator times
        this._swayTime      = 0;
        this._fearOscTime   = 0;
        this._currentFov    = this.BASE_FOV;

        // Discrete flicker state machines
        this._flickerStepTimer       = 0;
        this._flickerCurrentMult     = 1.0;
        this._fearFlickerStepTimer   = 0;
        this._fearFlickerCurrentMult = 1.0;
    }

    /** Replace the player reference after it is created (lazy bind). */
    setPlayer(player) {
        this._playerRef = player;
    }

    get player() { return this._playerRef; }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Call every frame after player.update().
     * @param {number} deltaTime   — seconds since last frame (clamped upstream)
     * @param {number} fearFactor  — 0 (calm) → 1 (monster right on top)
     */
    update(deltaTime, fearFactor = 0) {
        const player = this.player;
        if (!player) return;

        this._updateSway(deltaTime, fearFactor);
        this._updateBattery(deltaTime);
        this._updateSprintFOV(deltaTime);

        // Apply battery + flicker multipliers on top of PlayerController intensity
        if (player.flashlight) {
            const battFlicker  = this._computeLowBatteryFlicker(deltaTime, this.batteryPercent);
            const fearFlicker  = this._computeFearFlicker(deltaTime, fearFactor);
            player.flashlight.intensity *= this.batteryMult.mult * battFlicker * fearFlicker;
        }
    }

    /**
     * Recharge the battery to 100 % (e.g. after picking up a battery item).
     * Re-uses the 'torciaScarica' event so TweenManager animates the ramp-up
     * with the same smooth curve used for the drain — no duplicated code.
     */
    recharge() {
        const player = this.player;
        if (!player || !player.flashlight) return;

        this.batteryPercent = 100;
        this._drainTimer    = 0;
        this._flickerStepTimer     = 0;
        this._flickerCurrentMult   = 1.0;

        document.dispatchEvent(new CustomEvent('torciaScarica', {
            detail: {
                percent: 100,
                norm:    1,
                proxy:   this.batteryMult,
                torcia:  player.flashlight,
            }
        }));
    }

    /** Reset all state for a new game session. */
    reset() {
        this.batteryPercent          = 100;
        this._drainTimer             = 0;
        this.batteryMult.mult        = 1.0;
        this._swayTime               = 0;
        this._fearOscTime            = 0;
        this._flickerStepTimer       = 0;
        this._flickerCurrentMult     = 1.0;
        this._fearFlickerStepTimer   = 0;
        this._fearFlickerCurrentMult = 1.0;
        this._currentFov             = this.BASE_FOV;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — Sway
    // ─────────────────────────────────────────────────────────────────────────

    _updateSway(deltaTime, fearFactor) {
        const player = this.player;
        if (!player || !player.flashlight) return;

        const isWalking   = player.controls.isLocked &&
            (player.keys.forward || player.keys.backward || player.keys.left || player.keys.right);
        const isSprinting = isWalking && player.isSprinting;

        let timeSpeed, bobAmount, swayAmount, pushAmount, tiltAmount, aimMult;

        if (isSprinting) {
            timeSpeed = 11.0; bobAmount = 0.16; swayAmount = 0.13;
            pushAmount = 0.05; tiltAmount = 0.11; aimMult = 2.3;
        } else if (isWalking) {
            timeSpeed = 6.5; bobAmount = 0.09; swayAmount = 0.075;
            pushAmount = 0.035; tiltAmount = 0.06; aimMult = 1.8;
        } else {
            timeSpeed = 1.3; bobAmount = 0.018; swayAmount = 0.015;
            pushAmount = 0.0; tiltAmount = 0.02; aimMult = 1.5;
        }

        this._swayTime += deltaTime * timeSpeed;

        const bobY  = Math.sin(this._swayTime * 2) * bobAmount;
        const swayX = Math.cos(this._swayTime)     * swayAmount;
        const pushZ = Math.abs(Math.sin(this._swayTime * 2)) * pushAmount;
        const aimX  = swayX * aimMult;
        const aimY  = Math.sin(this._swayTime * 2 + 0.5) * bobAmount * aimMult;

        // ── Fear tremor ────────────────────────────────────────────────
        this._fearOscTime += deltaTime * (2.5 + fearFactor * 9);
        const fearAmp = fearFactor * fearFactor;

        const oscX = Math.sin(this._fearOscTime * 2.2) * 0.6 + Math.sin(this._fearOscTime * 5.3 + 1.7) * 0.4;
        const oscY = Math.cos(this._fearOscTime * 1.8 + 0.5) * 0.6 + Math.cos(this._fearOscTime * 4.6) * 0.4;

        const FEAR_AIM_MAX   = 0.5;
        const FEAR_TORCH_MAX = 0.035;
        const fearAimX   = oscX * fearAmp * FEAR_AIM_MAX;
        const fearAimY   = oscY * fearAmp * FEAR_AIM_MAX;
        const fearTorchX = oscX * fearAmp * FEAR_TORCH_MAX;
        const fearTorchY = oscY * fearAmp * FEAR_TORCH_MAX;

        const totalX = swayX + fearTorchX;
        const totalY = bobY  + fearTorchY;

        // Apply offset relative to each object's rest position (captured lazily)
        for (const obj of [player.flashlight, player.flashlightModel]) {
            if (!obj) continue;
            if (!obj.userData._swayBase) obj.userData._swayBase = obj.position.clone();
            const base = obj.userData._swayBase;
            obj.position.set(base.x + totalX, base.y + totalY, base.z + pushZ);
        }

        // Cosmetic tilt of the torch model (does not affect the real light direction)
        if (player.flashlightModel) {
            if (player.flashlightModel.userData._swayBaseRotZ === undefined) {
                player.flashlightModel.userData._swayBaseRotZ = player.flashlightModel.rotation.z;
            }
            const baseRotZ = player.flashlightModel.userData._swayBaseRotZ;
            player.flashlightModel.rotation.z = baseRotZ + Math.cos(this._swayTime) * tiltAmount + fearTorchX * 2.0;
        }

        // Aim (target) oscillates more than the physical torch
        if (player.flashlight.target) {
            if (!player.flashlight.target.userData._swayBase) {
                player.flashlight.target.userData._swayBase = player.flashlight.target.position.clone();
            }
            const baseT = player.flashlight.target.userData._swayBase;
            player.flashlight.target.position.set(
                baseT.x + aimX + fearAimX,
                baseT.y + aimY + fearAimY,
                baseT.z
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — Battery drain
    // ─────────────────────────────────────────────────────────────────────────

    _updateBattery(deltaTime) {
        const player = this.player;
        if (!player || this.batteryPercent <= this.BATTERY_MIN_PERCENT) return;

        this._drainTimer += deltaTime;
        if (this._drainTimer < this.DRAIN_INTERVAL_SEC) return;

        this._drainTimer = 0;
        this.batteryPercent = Math.max(this.BATTERY_MIN_PERCENT, this.batteryPercent - 1);

        const norm = (this.batteryPercent - this.BATTERY_MIN_PERCENT) / (100 - this.BATTERY_MIN_PERCENT);

        document.dispatchEvent(new CustomEvent('torciaScarica', {
            detail: {
                percent: this.batteryPercent,
                norm,
                proxy:  this.batteryMult,
                torcia: player.flashlight,
            }
        }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — Flicker machines
    // ─────────────────────────────────────────────────────────────────────────

    _computeLowBatteryFlicker(deltaTime, percent) {
        if (percent > this.FLICKER_THRESHOLD_PCT) {
            this._flickerCurrentMult = 1.0;
            return 1.0;
        }

        const severity = Math.min(1, Math.max(0,
            (this.FLICKER_THRESHOLD_PCT - percent) /
            (this.FLICKER_THRESHOLD_PCT - this.BATTERY_MIN_PERCENT)
        ));
        const freqHz     = 3 + severity * 15;
        const depth      = 0.3 + severity * 0.6;
        const stepDur    = 1 / freqHz;

        this._flickerStepTimer += deltaTime;
        if (this._flickerStepTimer >= stepDur) {
            this._flickerStepTimer = 0;
            this._flickerCurrentMult = Math.random() < 0.5 ? (1 - depth) : 1.0;
        }
        return this._flickerCurrentMult;
    }

    _computeFearFlicker(deltaTime, fearFactor) {
        if (fearFactor < this.FEAR_FLICKER_THRESHOLD) {
            this._fearFlickerCurrentMult = 1.0;
            return 1.0;
        }

        const intensity = Math.min(1, Math.max(0,
            (fearFactor - this.FEAR_FLICKER_THRESHOLD) / (1 - this.FEAR_FLICKER_THRESHOLD)
        ));
        const freqHz  = 2 + intensity * 8;
        const depth   = 0.15 + intensity * 0.2;
        const stepDur = 1 / freqHz;

        this._fearFlickerStepTimer += deltaTime;
        if (this._fearFlickerStepTimer >= stepDur) {
            this._fearFlickerStepTimer = 0;
            this._fearFlickerCurrentMult = Math.random() < 0.5 ? (1 - depth) : 1.0;
        }
        return this._fearFlickerCurrentMult;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — Sprint FOV kick
    // ─────────────────────────────────────────────────────────────────────────

    _updateSprintFOV(deltaTime) {
        const player = this.player;
        if (!player) return;

        const isSprinting = player.controls.isLocked && player.isSprinting &&
            (player.keys.forward || player.keys.backward || player.keys.left || player.keys.right);

        const target = isSprinting ? this.SPRINT_FOV : this.BASE_FOV;
        this._currentFov += (target - this._currentFov) * Math.min(1, deltaTime * 8);

        if (Math.abs(this.camera.fov - this._currentFov) > 0.01) {
            this.camera.fov = this._currentFov;
            this.camera.updateProjectionMatrix();
        }
    }
}
