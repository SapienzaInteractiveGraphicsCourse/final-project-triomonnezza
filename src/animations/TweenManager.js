/**
 * TweenManager.js  —  Gestore Animazioni Tween
 * RESPONSABILE: Federico (Regista)
 *
 * Centralizza tutte le animazioni "cosmetiche" smooth del gioco usando
 * tween.js, ascoltando gli eventi globali disaccoppiati emessi da
 * PlayerController / LightingSetup / main.js e rispondendo con i tween
 * appropriati. Nessuna logica di gameplay (collisioni, inventario, AI)
 * vive qui: solo "la magia dei movimenti".
 *
 * EVENTI ASCOLTATI (emessi da PlayerController / LightingSetup / main.js):
 *   - 'itemRaccolto'      → l'oggetto raccolto vola via, ruota e scompare
 *   - 'horrorTrigger'     → jumpscare: flash rosso + screen shake (CSS)
 *   - 'torciaScarica'     → batteria torcia calata di 1% (detail: {percent, norm, proxy, torcia}):
 *                           dissolvenza morbida dell'intensità (via proxy) +
 *                           restringimento diretto di angle/distance sulla
 *                           SpotLight, più un lieve sfarfallio d'ansia sotto il 40%
 *   - 'portaAperta'       → leggero "colpo" di schermo per il cigolio (cosmetico;
 *                           la rotazione fisica dell'anta è già gestita in main.js
 *                           insieme alla collisione, per non animare due volte
 *                           la stessa proprietà)
 *   - 'mostroInMovimento' → riservato per future reazioni ambientali; l'oscillazione
 *                           delle braccia è già gestita internamente da Monster.js
 *                           (ha bisogno del proprio TWEEN.Group isolato)
 */

export class TweenManager {
    /**
     * @param {object} TWEEN   - libreria tween.js passata dall'esterno
     * @param {object} deps
     * @param {THREE.Scene}     deps.scene  - per rimuovere gli oggetti raccolti a fine tween
     * @param {HTMLElement}     deps.canvas - renderer.domElement, per lo screen-shake CSS
     *                          (MAI la camera: vedi nota sopra)
     * @param {string}          [deps.overlayId='fade-overlay'] - id del div overlay per il flash
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
        document.addEventListener('itemRaccolto',      (e) => this._onItemRaccolto(e.detail));
        document.addEventListener('horrorTrigger',     (e) => this._onHorrorTrigger(e.detail));
        document.addEventListener('mostroInMovimento', (e) => this._onMostroMoves(e.detail));
        document.addEventListener('torciaScarica',     (e) => this._onTorciaScarica(e.detail));
    }

    // ─────────────────────────────────────────────────────────────────
    // ITEM RACCOLTO — vola in alto, ruota e si rimpicciolisce, poi
    // viene rimosso dalla scena. main.js NON rimuove più l'oggetto in
    // modo istantaneo: entrambi i listener reagiscono allo stesso evento,
    // ma solo questo si occupa dell'oggetto 3D.
    // ─────────────────────────────────────────────────────────────────
    _onItemRaccolto(detail) {
        const obj = detail && detail.object;
        if (!obj) return;

        const startY = obj.position.y;
        const startRotY = obj.rotation.y;

        // Sale leggermente mentre "vola verso l'inventario"
        new this.TWEEN.Tween(obj.position)
            .to({ y: startY + 0.6 }, 500)
            .easing(this.TWEEN.Easing.Quadratic.Out)
            .start();

        // Ruota su se stesso mentre sparisce
        new this.TWEEN.Tween(obj.rotation)
            .to({ y: startRotY + Math.PI * 2 }, 500)
            .easing(this.TWEEN.Easing.Quadratic.Out)
            .start();

        // Si rimpicciolisce con un piccolo "pop" finale, poi via dalla scena
        new this.TWEEN.Tween(obj.scale)
            .to({ x: 0.001, y: 0.001, z: 0.001 }, 450)
            .easing(this.TWEEN.Easing.Back.In)
            .delay(120)
            .onComplete(() => {
                if (this.scene) this.scene.remove(obj);
            })
            .start();
    }

    // ─────────────────────────────────────────────────────────────────
    // PORTA APERTA — piccolo tocco cosmetico extra: un lieve "colpo" di
    // camera che simula la vibrazione del cigolio, sincronizzato con
    // l'audio del cigolio già riprodotto in main.js. Non tocca la
    // rotazione dell'anta (già animata altrove) né la collisione.
    // ─────────────────────────────────────────────────────────────────
    _onPortaAperta() {
        this._cameraShake(90, 3); // piccolo "colpo" da 3px, quasi impercettibile
    }

    // ─────────────────────────────────────────────────────────────────
    // HORROR TRIGGER — jumpscare generico: flash rosso sull'overlay +
    // scossa di camera. Lo stesso handler serve sia per i trigger di
    // mappa (es. zone horror) sia per l'attacco del mostro, dispatchato
    // da main.js con eventName 'PLAYER_ATTACKED'.
    // ─────────────────────────────────────────────────────────────────
    _onHorrorTrigger(detail) {
        const eventName = detail && detail.eventName;

        // Il raggiungimento del goal ha già la sua sequenza dedicata in
        // main.js (porta che si apre e si rimpicciolisce): niente jumpscare qui.
        if (eventName === 'GOAL_REACHED') return;

        if (eventName === 'PLAYER_ATTACKED') {
            this._flash('#3d0000', 60, 420);
            this._cameraShake(500, 18);
            return;
        }

        // Jumpscare generico per qualsiasi altra zona horror della mappa
        this._flash('#1a1a1a', 80, 300);
        this._cameraShake(300, 9);
    }

    _onMostroMoves() {
        // L'oscillazione di braccia/gambe è gestita internamente da
        // Monster.js tramite il proprio TWEEN.Group isolato (necessario
        // perché il mostro deve poter interrompere/riavviare i tween
        // senza interferire con gli altri tween della scena). Questo
        // handler resta come punto di estensione per future reazioni
        // ambientali (es. intensificare l'audio del respiro quando
        // il mostro si muove nei pressi del giocatore).
    }

    // ─────────────────────────────────────────────────────────────────
    // TORCIA IN ESAURIMENTO — la batteria cala di 1% alla volta (vedi
    // main.js: updateTorchBattery). Qui animiamo con una dissolvenza
    // morbida (non un salto secco) il moltiplicatore che main.js applica
    // OGNI FRAME sopra l'intensità già calcolata da PlayerController.
    // NON scriviamo mai light.intensity direttamente: PlayerController la
    // riscrive ogni frame per il proprio sfarfallio, quindi qualunque tween
    // diretto sulla luce verrebbe sovrascritto e invisibile (stesso tipo di
    // conflitto già risolto per lo screen-shake).
    // ─────────────────────────────────────────────────────────────────
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

        // Sotto al 40% aggiungiamo un breve sfarfallio d'ansia ogni 5%,
        // sovrapposto alla dissolvenza morbida, per far percepire la crisi
        // della batteria senza esagerare con la frequenza dell'effetto.
        if (percent <= 40 && percent % 5 === 0) {
            new this.TWEEN.Tween(proxy)
                .to({ mult: targetMult * 0.25 }, 70)
                .delay(1200)
                .yoyo(true).repeat(3)
                .easing(this.TWEEN.Easing.Quadratic.InOut)
                .start();
        }

        // ─────────────────────────────────────────────────────────
        // Fascio che si restringe: apertura (angle) e portata (distance)
        // calano assieme all'intensità, dando la sensazione di un fascio
        // sempre più stretto e corto invece che semplicemente più debole.
        // Animati DIRETTAMENTE sulla luce (non tramite proxy) perché
        // PlayerController non scrive mai queste due proprietà: nessun
        // rischio che vengano sovrascritte frame-by-frame come intensity.
        // ─────────────────────────────────────────────────────────
        if (torcia && norm !== undefined) {
            // Cattura i valori "di riposo" al primo utilizzo, così l'effetto
            // resta corretto qualunque siano i valori base scelti da chi ha
            // configurato la torcia in PlayerController.
            if (torcia.userData._baseAngle === undefined) {
                torcia.userData._baseAngle    = torcia.angle;
                torcia.userData._baseDistance = torcia.distance;
            }
            const baseAngle    = torcia.userData._baseAngle;
            const baseDistance = torcia.userData._baseDistance;

            const MIN_ANGLE_FACTOR    = 0.70; // a batteria quasi scarica: 35% dell'apertura originale
            const MIN_DISTANCE_FACTOR = 0.70; // e 45% della portata originale

            const targetAngle    = baseAngle    * (MIN_ANGLE_FACTOR    + norm * (1 - MIN_ANGLE_FACTOR));
            const targetDistance = baseDistance * (MIN_DISTANCE_FACTOR + norm * (1 - MIN_DISTANCE_FACTOR));

            new this.TWEEN.Tween(torcia)
                .to({ angle: targetAngle, distance: targetDistance }, 1200)
                .easing(this.TWEEN.Easing.Quadratic.InOut)
                .start();
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // UTILITY DI EFFETTO
    // ─────────────────────────────────────────────────────────────────

    /** Flash colorato sull'overlay a schermo intero (jumpscare) */
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
     * Screen-shake via transform CSS sul canvas del renderer.
     * NON tocca mai la camera Three.js (vedi nota in cima al file):
     * i PointerLockControls governano rotation/quaternion e qualunque
     * scrittura diretta lì causa desync (visuale capovolta/ruotata).
     *
     * @param {number} duration  - durata totale in ms
     * @param {number} magnitude - ampiezza massima dello shake in pixel
     */
    _cameraShake(duration, magnitude) {
        if (!this.canvas) return;

        const proxy = { t: 0 };
        new this.TWEEN.Tween(proxy)
            .to({ t: 1 }, duration)
            .onUpdate(() => {
                const decay = 1 - proxy.t; // si smorza verso la fine
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

    /** Da chiamare nel game loop: aggiorna tutti i Tween registrati da questo manager */
    update() {
        // I Tween creati qui vivono nel gruppo di default di TWEEN,
        // già aggiornato ad ogni frame in main.js con TWEEN.update().
        // Metodo mantenuto per compatibilità con l'interfaccia originale.
    }
}
