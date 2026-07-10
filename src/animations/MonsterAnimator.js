/**
 * MonsterAnimator.js  —  Animazioni Gerarchiche del Mostro
 * RESPONSABILE: Federico (Regista)
 *
 * Controller delle animazioni procedurali del mostro. Usa tween.js
 * per pilotare le singole parti del corpo del mostro generato in Monster.js.
 * Possiede il proprio TWEEN.Group isolato per non interferire con
 * altri tween globali della scena.
 */

export class MonsterAnimator {
    /**
     * @param {import('../entities/Monster.js').Monster} monster - istanza del mostro
     * @param {object} TWEEN - libreria tween.js
     */
    constructor(monster, TWEEN) {
        this.monster = monster;
        this.TWEEN = TWEEN;
        
        // TWEEN.Group isolato per il mostro
        this._tweenGroup = new this.TWEEN.Group();
        this._animState = null; // 'walk' | 'idle' | 'attack' | 'notice' | null
        this._idleSpasmTimeoutId = null;
        this._currentLean = 0;
    }

    _stopAllTweens() {
        this._tweenGroup.removeAll();
        this.monster.testa.rotation.x = 0;
        this.monster.testa.rotation.z = 0;
        this.monster.testa.position.z = 0;
        this.monster.corpo.position.z = 0;
        this.monster.corpo.position.y = 0;
        this.monster.braccioSx.rotation.z = 0;
        this.monster.braccioDx.rotation.z = 0;

        if (this._idleSpasmTimeoutId) {
            clearTimeout(this._idleSpasmTimeoutId);
            this._idleSpasmTimeoutId = null;
        }
    }

    _startWalkAnimation() {
        this._stopAllTweens();
        this._animState = 'walk';

        const dur = 380; // ms per mezza oscillazione (velocità del passo)

        new this.TWEEN.Tween(this.monster.braccioSx.rotation, this._tweenGroup)
            .to({ x: 0.45 }, dur)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.braccioDx.rotation, this._tweenGroup)
            .to({ x: -0.45 }, dur)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.avanbraccioSx.rotation, this._tweenGroup)
            .to({ x: -0.32 }, dur)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.avanbraccioDx.rotation, this._tweenGroup)
            .to({ x: 0.07 }, dur)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.gambaSx.rotation, this._tweenGroup)
            .to({ x: -0.4 }, dur)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.gambaDx.rotation, this._tweenGroup)
            .to({ x: 0.4 }, dur)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.ginocchioSx.rotation, this._tweenGroup)
            .to({ x: 0.4 }, dur / 2)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.ginocchioDx.rotation, this._tweenGroup)
            .to({ x: 0.4 }, dur / 2)
            .delay(dur / 2)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.corpo.position, this._tweenGroup)
            .to({ y: 0.05 }, dur)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.testa.rotation, this._tweenGroup)
            .to({ y: 0.18, z: 0.07 }, dur * 2)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.testa.position, this._tweenGroup)
            .to({ y: 0.95 }, dur)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();
    }

    _startIdleAnimation() {
        this._stopAllTweens();
        this._animState = 'idle';

        const dur = 1400; // ms — molto più lento del passo

        const resetDur = 300;
        for (const joint of [this.monster.gambaSx, this.monster.gambaDx, this.monster.ginocchioSx, this.monster.ginocchioDx]) {
            new this.TWEEN.Tween(joint.rotation, this._tweenGroup)
                .to({ x: 0 }, resetDur)
                .easing(this.TWEEN.Easing.Quadratic.Out)
                .start();
        }
        new this.TWEEN.Tween(this.monster.corpo.position, this._tweenGroup)
            .to({ y: 0 }, resetDur)
            .easing(this.TWEEN.Easing.Quadratic.Out)
            .start();

        new this.TWEEN.Tween(this.monster.testa.position, this._tweenGroup)
            .to({ y: 0.96 }, dur)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.testa.rotation, this._tweenGroup)
            .to({ y: 0.12 }, dur * 1.6)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.braccioSx.rotation, this._tweenGroup)
            .to({ x: 0.08 }, dur)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new this.TWEEN.Tween(this.monster.braccioDx.rotation, this._tweenGroup)
            .to({ x: 0.08 }, dur)
            .easing(this.TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        this._scheduleIdleSpasm();
    }

    _scheduleIdleSpasm() {
        if (this._idleSpasmTimeoutId) clearTimeout(this._idleSpasmTimeoutId);
        const delay = 3000 + Math.random() * 5000;
        this._idleSpasmTimeoutId = setTimeout(() => {
            if (this._animState !== 'idle') return;
            this._playIdleSpasm();
            this._scheduleIdleSpasm();
        }, delay);
    }

    _playIdleSpasm() {
        const dur = 80;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const choice = Math.random();

        if (choice < 0.4) {
            new this.TWEEN.Tween(this.monster.testa.rotation, this._tweenGroup)
                .to({ z: 0.18 * dir }, dur)
                .yoyo(true).repeat(1)
                .easing(this.TWEEN.Easing.Quadratic.InOut)
                .start();
        } else if (choice < 0.7) {
            new this.TWEEN.Tween(this.monster.braccioSx.rotation, this._tweenGroup)
                .to({ x: 0.35 }, dur)
                .yoyo(true).repeat(1)
                .easing(this.TWEEN.Easing.Quadratic.InOut)
                .start();
        } else {
            new this.TWEEN.Tween(this.monster.braccioDx.rotation, this._tweenGroup)
                .to({ x: 0.35 }, dur)
                .yoyo(true).repeat(1)
                .easing(this.TWEEN.Easing.Quadratic.InOut)
                .start();
        }
    }

    /** Animazione di shock / scoperta giocatore */
    notice() {
        this._stopAllTweens();
        this._animState = 'notice';

        const dir = Math.random() < 0.5 ? 1 : -1;
        const snapDur = 90;
        const settleDur = 200;

        const snapTesta = new this.TWEEN.Tween(this.monster.testa.rotation, this._tweenGroup)
            .to({ z: 0.25 * dir, x: -0.15 }, snapDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const snapCorpo = new this.TWEEN.Tween(this.monster.corpo.position, this._tweenGroup)
            .to({ z: 0.15, y: 0.04 }, snapDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const snapBraccioSx = new this.TWEEN.Tween(this.monster.braccioSx.rotation, this._tweenGroup)
            .to({ x: 0.3 }, snapDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const snapBraccioDx = new this.TWEEN.Tween(this.monster.braccioDx.rotation, this._tweenGroup)
            .to({ x: 0.3 }, snapDur).easing(this.TWEEN.Easing.Quadratic.Out);

        const settleTesta = new this.TWEEN.Tween(this.monster.testa.rotation, this._tweenGroup)
            .to({ z: 0, x: 0 }, settleDur).easing(this.TWEEN.Easing.Quadratic.InOut);
        const settleCorpo = new this.TWEEN.Tween(this.monster.corpo.position, this._tweenGroup)
            .to({ z: 0, y: 0 }, settleDur).easing(this.TWEEN.Easing.Quadratic.InOut);
        const settleBraccioSx = new this.TWEEN.Tween(this.monster.braccioSx.rotation, this._tweenGroup)
            .to({ x: 0 }, settleDur).easing(this.TWEEN.Easing.Quadratic.InOut);
        const settleBraccioDx = new this.TWEEN.Tween(this.monster.braccioDx.rotation, this._tweenGroup)
            .to({ x: 0 }, settleDur).easing(this.TWEEN.Easing.Quadratic.InOut)
            .onComplete(() => {
                this._animState = null;
            });

        snapTesta.chain(settleTesta);
        snapCorpo.chain(settleCorpo);
        snapBraccioSx.chain(settleBraccioSx);
        snapBraccioDx.chain(settleBraccioDx);

        snapTesta.start();
        snapCorpo.start();
        snapBraccioSx.start();
        snapBraccioDx.start();
    }

    /** Animazione di attacco (one-shot) */
    attack() {
        this._stopAllTweens();
        this._animState = 'attack';

        const anticipDur = 260;
        const lungeDur = 200;
        const recoilDur = 300;

        const anticipBraccioSx = new this.TWEEN.Tween(this.monster.braccioSx.rotation, this._tweenGroup)
            .to({ x: 0.5, z: 0.15 }, anticipDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const anticipBraccioDx = new this.TWEEN.Tween(this.monster.braccioDx.rotation, this._tweenGroup)
            .to({ x: 0.5, z: -0.15 }, anticipDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const anticipCorpo = new this.TWEEN.Tween(this.monster.corpo.position, this._tweenGroup)
            .to({ y: -0.08, z: 0.18 }, anticipDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const anticipTesta = new this.TWEEN.Tween(this.monster.testa.position, this._tweenGroup)
            .to({ z: 0.18 }, anticipDur).easing(this.TWEEN.Easing.Quadratic.Out);

        const strikeBraccioSx = new this.TWEEN.Tween(this.monster.braccioSx.rotation, this._tweenGroup)
            .to({ x: -1.5, z: -0.35 }, lungeDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const strikeBraccioDx = new this.TWEEN.Tween(this.monster.braccioDx.rotation, this._tweenGroup)
            .to({ x: -1.5, z: 0.35 }, lungeDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const strikeAvanbraccioSx = new this.TWEEN.Tween(this.monster.avanbraccioSx.rotation, this._tweenGroup)
            .to({ x: -0.95 }, lungeDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const strikeAvanbraccioDx = new this.TWEEN.Tween(this.monster.avanbraccioDx.rotation, this._tweenGroup)
            .to({ x: -0.95 }, lungeDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const strikeCorpo = new this.TWEEN.Tween(this.monster.corpo.position, this._tweenGroup)
            .to({ y: 0.02, z: -0.5 }, lungeDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const strikeTesta = new this.TWEEN.Tween(this.monster.testa.position, this._tweenGroup)
            .to({ z: -0.5 }, lungeDur).easing(this.TWEEN.Easing.Quadratic.Out);
        const strikeTestaRot = new this.TWEEN.Tween(this.monster.testa.rotation, this._tweenGroup)
            .to({ x: 0.65 }, lungeDur).easing(this.TWEEN.Easing.Quadratic.Out);

        const recoilBraccioSx = new this.TWEEN.Tween(this.monster.braccioSx.rotation, this._tweenGroup)
            .to({ x: 0, z: 0 }, recoilDur).easing(this.TWEEN.Easing.Quadratic.InOut);
        const recoilBraccioDx = new this.TWEEN.Tween(this.monster.braccioDx.rotation, this._tweenGroup)
            .to({ x: 0, z: 0 }, recoilDur).easing(this.TWEEN.Easing.Quadratic.InOut);
        const recoilAvanbraccioSx = new this.TWEEN.Tween(this.monster.avanbraccioSx.rotation, this._tweenGroup)
            .to({ x: 0 }, recoilDur).easing(this.TWEEN.Easing.Quadratic.InOut);
        const recoilAvanbraccioDx = new this.TWEEN.Tween(this.monster.avanbraccioDx.rotation, this._tweenGroup)
            .to({ x: 0 }, recoilDur).easing(this.TWEEN.Easing.Quadratic.InOut);
        const recoilCorpo = new this.TWEEN.Tween(this.monster.corpo.position, this._tweenGroup)
            .to({ y: 0, z: 0 }, recoilDur).easing(this.TWEEN.Easing.Quadratic.InOut);
        const recoilTesta = new this.TWEEN.Tween(this.monster.testa.position, this._tweenGroup)
            .to({ z: 0 }, recoilDur).easing(this.TWEEN.Easing.Quadratic.InOut);
        const recoilTestaRot = new this.TWEEN.Tween(this.monster.testa.rotation, this._tweenGroup)
            .to({ x: 0 }, recoilDur).easing(this.TWEEN.Easing.Quadratic.InOut)
            .onComplete(() => {
                this._animState = null;
            });

        anticipBraccioSx.chain(strikeBraccioSx); strikeBraccioSx.chain(recoilBraccioSx);
        anticipBraccioDx.chain(strikeBraccioDx); strikeBraccioDx.chain(recoilBraccioDx);
        anticipCorpo.chain(strikeCorpo);         strikeCorpo.chain(recoilCorpo);
        anticipTesta.chain(strikeTesta);         strikeTesta.chain(recoilTesta);

        anticipBraccioSx.start();
        anticipBraccioDx.start();
        anticipCorpo.start();
        anticipTesta.start();

        strikeAvanbraccioSx.chain(recoilAvanbraccioSx);
        strikeAvanbraccioDx.chain(recoilAvanbraccioDx);
        strikeTestaRot.chain(recoilTestaRot);

        strikeAvanbraccioSx.delay(anticipDur).start();
        strikeAvanbraccioDx.delay(anticipDur).start();
        strikeTestaRot.delay(anticipDur).start();
    }

    /**
     * Da chiamare ogni frame nel game loop.
     * @param {number} deltaTime
     * @param {boolean} isMoving
     */
    update(deltaTime, isMoving) {
        const isLocked = this._animState === 'attack' || this._animState === 'notice';
        
        if (!isLocked) {
            if (isMoving && this._animState !== 'walk') {
                this._startWalkAnimation();
            } else if (!isMoving && this._animState !== 'idle') {
                this._startIdleAnimation();
            }
        }

        if (this.monster.stepSound) {
            this.monster.stepSound.setVolume(isMoving ? 1.0 : 0.0);
        }

        const targetLean = (isMoving && !isLocked) ? 0.16 : 0;
        this._currentLean += (targetLean - this._currentLean) * Math.min(1, deltaTime * 5);
        this._currentLean = Math.max(-0.3, Math.min(0.3, this._currentLean));
        this.monster.corpo.rotation.x = this._currentLean;

        this._tweenGroup.update();
    }
}
