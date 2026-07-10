/**
 * TweenManager.js — Gestore Animazioni Tween
 * Centralizza tutte le animazioni cosmetiche del gioco.
 * Nessuna logica di gameplay.
 *
 * NOTA: Lo "screen shake" usa trasformazioni CSS sul canvas,
 * MAI camera.rotation per evitare glitch con i controlli.
 */

export class TweenManager {
    /**
     * @param {object} TWEEN Libreria tween.js
     * @param {object} deps Dipendenze (scene, canvas, overlayId)
     */
    constructor(TWEEN, deps = {}) {
        this.TWEEN   = TWEEN;
        this.scene   = deps.scene  || null;
        this.canvas  = deps.canvas || null;
        this.overlay = document.getElementById(deps.overlayId || 'fade-overlay');

        this._initListeners();
    }

    _initListeners() {
        document.addEventListener('portaAperta',       (e) => this._onPortaAperta(e.detail));
        document.addEventListener('portaSbattuta',     ()  => this._onPortaSbattuta());
        document.addEventListener('itemRaccolto',      (e) => this._onItemRaccolto(e.detail));
        document.addEventListener('horrorTrigger',     (e) => this._onHorrorTrigger(e.detail));
        document.addEventListener('mostroInMovimento', (e) => this._onMostroMoves(e.detail));
        document.addEventListener('torciaScarica',     (e) => this._onTorciaScarica(e.detail));
    }

    // Animazione oggetto raccolto (vola, ruota, scompare)
    _onItemRaccolto(detail) {
        const obj = detail && detail.object;
        if (!obj) return;

        const startY = obj.position.y;
        const startRotY = obj.rotation.y;

        // Sale verso alto
        new this.TWEEN.Tween(obj.position)
            .to({ y: startY + 0.6 }, 500)
            .easing(this.TWEEN.Easing.Quadratic.Out)
            .start();

        // Ruota
        new this.TWEEN.Tween(obj.rotation)
            .to({ y: startRotY + Math.PI * 2 }, 500)
            .easing(this.TWEEN.Easing.Quadratic.Out)
            .start();

        // Rimpicciolisce e rimuove
        new this.TWEEN.Tween(obj.scale)
            .to({ x: 0.001, y: 0.001, z: 0.001 }, 450)
            .easing(this.TWEEN.Easing.Back.In)
            .delay(120)
            .onComplete(() => {
                if (this.scene) this.scene.remove(obj);
            })
            .start();
    }

    // Shake camera all'apertura porta
    _onPortaAperta() {
        this._cameraShake(90, 3);
    }

    /** Shake più forte quando sbatte porta */
    _onPortaSbattuta() {
        this._cameraShake(200, 12);
    }

    // Trigger Jumpscare (Attacco mostro o eventi mappa)
    _onHorrorTrigger(detail) {
        const eventName = detail && detail.eventName;

        // Ignora vittoria
        if (eventName === 'GOAL_REACHED') return;

        if (eventName === 'PLAYER_ATTACKED') {
            this._flash('#3d0000', 60, 420);
            this._cameraShake(500, 18);
            return;
        }

        // Jumpscare mappa
        this._flash('#1a1a1a', 80, 300);
        this._cameraShake(300, 9);
    }

    _onMostroMoves() {
        // Placeholder per future reazioni (es. audio respiro)
    }

    // Torcia in esaurimento (dissolvenza morbida)
    _onTorciaScarica(detail) {
        const proxy   = detail && detail.proxy;
        const percent = detail && detail.percent;
        const norm    = detail && detail.norm;   // 1 = batteria piena, 0 = al minimo
        const torcia  = detail && detail.torcia; // riferimento diretto alla SpotLight
        if (!proxy || percent === undefined) {
            console.warn('[TweenManager] torciaScarica ricevuto senza proxy/percent validi');
            return;
        }

        const targetMult = percent / 100;

        new this.TWEEN.Tween(proxy)
            .to({ mult: targetMult }, 1200)
            .easing(this.TWEEN.Easing.Quadratic.InOut)
            .start();

        // Sfarfallio sotto il 40% di batteria
        if (percent <= 40 && percent % 5 === 0) {
            new this.TWEEN.Tween(proxy)
                .to({ mult: targetMult * 0.25 }, 70)
                .delay(1200)
                .yoyo(true).repeat(3)
                .easing(this.TWEEN.Easing.Quadratic.InOut)
                .start();
        }

        // Restringimento raggio torcia (angle e distance)
        if (torcia && norm !== undefined) {
            // Salva valori di base
            if (torcia.userData._baseAngle === undefined) {
                torcia.userData._baseAngle    = torcia.angle;
                torcia.userData._baseDistance = torcia.distance;
            }
            const baseAngle    = torcia.userData._baseAngle;
            const baseDistance = torcia.userData._baseDistance;

            const MIN_ANGLE_FACTOR    = 0.35;
            const MIN_DISTANCE_FACTOR = 0.45;

            const targetAngle    = baseAngle    * (MIN_ANGLE_FACTOR    + norm * (1 - MIN_ANGLE_FACTOR));
            const targetDistance = baseDistance * (MIN_DISTANCE_FACTOR + norm * (1 - MIN_DISTANCE_FACTOR));

            new this.TWEEN.Tween(torcia)
                .to({ angle: targetAngle, distance: targetDistance }, 1200)
                .easing(this.TWEEN.Easing.Quadratic.InOut)
                .start();
        }
    }

    // Utility Effetti

    /** Flash colore su schermo (jumpscare) */
    _flash(color, inMs, outMs) {
        if (!this.overlay) return;
        this.overlay.style.transition = 'none';
        this.overlay.style.backgroundColor = color;

        const proxy = { opacity: 0 };
        new this.TWEEN.Tween(proxy)
            .to({ opacity: 0.85 }, inMs)
            .easing(this.TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => { this.overlay.style.opacity = proxy.opacity; })
            .chain(
                new this.TWEEN.Tween(proxy)
                    .to({ opacity: 0 }, outMs)
                    .easing(this.TWEEN.Easing.Quadratic.In)
                    .onUpdate(() => { this.overlay.style.opacity = proxy.opacity; })
                    .onComplete(() => {
                        this.overlay.style.backgroundColor = '#000';
                        this.overlay.style.transition = '';
                    })
            )
            .start();
    }

    /** 
     * Screen shake su canvas
     * @param {number} duration
     * @param {number} magnitude
     */
    _cameraShake(duration, magnitude) {
        if (!this.canvas) return;

        const proxy = { t: 0 };
        new this.TWEEN.Tween(proxy)
            .to({ t: 1 }, duration)
            .onUpdate(() => {
                const decay = 1 - proxy.t;
                const dx  = (Math.random() - 0.5) * magnitude * decay;
                const dy  = (Math.random() - 0.5) * magnitude * decay;
                const rot = (Math.random() - 0.5) * magnitude * 0.3 * decay;
                this.canvas.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
            })
            .onComplete(() => {
                this.canvas.style.transform = '';
            })
            .start();
    }

    /** Aggiorna manager (placeholder) */
    update() {}
}
