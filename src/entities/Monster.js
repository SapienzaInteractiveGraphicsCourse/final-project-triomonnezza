/**
 * Monster.js  —  Entità Mostro (Modello Gerarchico)
 * RESPONSABILE: Alessandro (geometria base) + Federico (animazioni)
 *
 * Costruisce il mostro come modello gerarchico Three.js:
 *   Radice (corpo) → braccia, gambe, testa come child objects
 *   Questo permette a Federico di animare ogni parte indipendentemente.
 *
 * STRUTTURA GERARCHICA:
 *   monsterRoot (Group)
 *     ├── corpo  (Mesh)
 *     ├── testa  (Mesh)
 *     ├── braccio_sx (Group)
 *     │     └── avanbraccio_sx (Mesh)
 *     └── braccio_dx (Group)
 *           └── avanbraccio_dx (Mesh)
 *
 * TODO: Sostituire le geometry primitive con modelli più elaborati
 *       (trovati online — senza animazioni importate, come da requisiti).
 */

import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { AudioSystem } from '../core/AudioSystem.js';

export class Monster {
    constructor() {
        this.root = new THREE.Group();
        this.root.name = 'Mostro';

        /**
         * TWEEN.Group isolato: tutte le animazioni procedurali del mostro
         * vengono gestite in questo gruppo, senza interferire con altri tween
         * della scena (requisito: animazioni in JavaScript via tween.js).
         */
        this._tweenGroup = new TWEEN.Group();
        this._animState = null; // 'walk' | 'idle' | null

        // Raw monster height: feet bottom (~-1.5) to horn top (~+1.25) = ~2.75 units.
        // Door height = 4.5m → scale = 4.5 / 2.75 ≈ 1.636  →  monster fills the doorway.
        this.root.scale.set(1.636, 1.636, 1.636);

        this._buildHierarchy();
    }

    _buildHierarchy() {
        // Materiali per un look horror curato e inquietante
        const skinMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1f1f2e, 
            shininess: 40,
            flatShading: true
        });
        const accentMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x880000, 
            shininess: 10,
            flatShading: true
        });
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff3300 
        });

        // 1. TORSO (Corpo)
        const corpo = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 1.2, 0.6),
            skinMaterial
        );
        corpo.name = 'corpo';
        corpo.position.set(0, 0, 0);
        this.root.add(corpo);

        // Gabbia toracica dettagliata (3 costole rosse sporgenti e luminose sul petto)
        const ribGeom = new THREE.BoxGeometry(0.7, 0.08, 0.08);
        for (let i = 0; i < 3; i++) {
            const rib = new THREE.Mesh(ribGeom, glowMaterial);
            rib.position.set(0, 0.3 - i * 0.25, 0.31);
            corpo.add(rib);
        }

        // 2. TESTA
        const testa = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.6, 0.6),
            skinMaterial
        );
        testa.name = 'testa';
        testa.position.set(0, 0.9, 0); // Posizionata sopra il torso
        this.root.add(testa);

        // Occhi rossi spaventosi
        const eyeGeom = new THREE.SphereGeometry(0.06, 8, 8);
        const occhioSx = new THREE.Mesh(eyeGeom, glowMaterial);
        occhioSx.position.set(-0.18, 0.1, 0.31);
        const occhioDx = new THREE.Mesh(eyeGeom, glowMaterial);
        occhioDx.position.set(0.18, 0.1, 0.31);
        testa.add(occhioSx);
        testa.add(occhioDx);

        // Corna creepy
        const hornGeom = new THREE.ConeGeometry(0.06, 0.25, 4);
        hornGeom.rotateX(-Math.PI / 6); // Inclina leggermente in avanti
        const cornoSx = new THREE.Mesh(hornGeom, accentMaterial);
        cornoSx.position.set(-0.2, 0.35, -0.05);
        const cornoDx = new THREE.Mesh(hornGeom, accentMaterial);
        cornoDx.position.set(0.2, 0.35, -0.05);
        testa.add(cornoSx);
        testa.add(cornoDx);

        // 3. BRACCIO SINISTRO (Articolato)
        const braccioSx = new THREE.Group();
        braccioSx.name = 'braccio_sx';
        braccioSx.position.set(-0.6, 0.4, 0);
        this.root.add(braccioSx);

        // Spalla / Parte superiore braccio
        const upperArmSxGeom = new THREE.BoxGeometry(0.2, 0.5, 0.2);
        upperArmSxGeom.translate(0, -0.25, 0); // Sposta pivot alla spalla
        const upperArmSx = new THREE.Mesh(upperArmSxGeom, skinMaterial);
        braccioSx.add(upperArmSx);

        // Avanbraccio
        const forearmSxGeom = new THREE.BoxGeometry(0.16, 0.5, 0.16);
        forearmSxGeom.translate(0, -0.25, 0); // Sposta pivot al gomito
        const avanbraccioSx = new THREE.Mesh(forearmSxGeom, skinMaterial);
        avanbraccioSx.name = 'avanbraccio_sx';
        avanbraccioSx.position.set(0, -0.5, 0); // Posizionato al gomito del braccio superiore
        braccioSx.add(avanbraccioSx);

        // Artigli mano sinistra
        const clawGeom = new THREE.ConeGeometry(0.04, 0.18, 4);
        clawGeom.rotateX(Math.PI); // Punta verso il basso
        for (let i = 0; i < 3; i++) {
            const artiglio = new THREE.Mesh(clawGeom, accentMaterial);
            artiglio.position.set(-0.05 + i * 0.05, -0.5, 0.05);
            avanbraccioSx.add(artiglio);
        }

        // 4. BRACCIO DESTRO (Articolato)
        const braccioDx = new THREE.Group();
        braccioDx.name = 'braccio_dx';
        braccioDx.position.set(0.6, 0.4, 0);
        this.root.add(braccioDx);

        // Spalla / Parte superiore braccio
        const upperArmDxGeom = new THREE.BoxGeometry(0.2, 0.5, 0.2);
        upperArmDxGeom.translate(0, -0.25, 0);
        const upperArmDx = new THREE.Mesh(upperArmDxGeom, skinMaterial);
        braccioDx.add(upperArmDx);

        // Avanbraccio
        const forearmDxGeom = new THREE.BoxGeometry(0.16, 0.5, 0.16);
        forearmDxGeom.translate(0, -0.25, 0);
        const avanbraccioDx = new THREE.Mesh(forearmDxGeom, skinMaterial);
        avanbraccioDx.name = 'avanbraccio_dx';
        avanbraccioDx.position.set(0, -0.5, 0);
        braccioDx.add(avanbraccioDx);

        // Artigli mano destra
        for (let i = 0; i < 3; i++) {
            const artiglio = new THREE.Mesh(clawGeom, accentMaterial);
            artiglio.position.set(-0.05 + i * 0.05, -0.5, 0.05);
            avanbraccioDx.add(artiglio);
        }

        // 5. GAMBA SINISTRA (con giunto ginocchio articolato)
        const gambaSx = new THREE.Group();
        gambaSx.name = 'gamba_sx';
        gambaSx.position.set(-0.3, -0.6, 0);
        this.root.add(gambaSx);

        const thighSxGeom = new THREE.BoxGeometry(0.22, 0.45, 0.22);
        thighSxGeom.translate(0, -0.225, 0);
        const thighSx = new THREE.Mesh(thighSxGeom, skinMaterial);
        gambaSx.add(thighSx);

        // Ginocchio: nuovo giunto pivot (stesso pattern spalla→gomito del braccio)
        const ginocchioSx = new THREE.Group();
        ginocchioSx.name = 'ginocchio_sx';
        ginocchioSx.position.set(0, -0.45, 0);
        gambaSx.add(ginocchioSx);

        const shinSxGeom = new THREE.BoxGeometry(0.18, 0.45, 0.18);
        shinSxGeom.translate(0, -0.225, 0);
        const shinSx = new THREE.Mesh(shinSxGeom, skinMaterial);
        ginocchioSx.add(shinSx); // ora figlio del ginocchio, non più dell'anca

        // Piede
        const footSx = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.08, 0.28),
            accentMaterial
        );
        footSx.position.set(0, -0.45, 0.05);
        shinSx.add(footSx);

        // 6. GAMBA DESTRA (con giunto ginocchio articolato)
        const gambaDx = new THREE.Group();
        gambaDx.name = 'gamba_dx';
        gambaDx.position.set(0.3, -0.6, 0);
        this.root.add(gambaDx);

        const thighDxGeom = new THREE.BoxGeometry(0.22, 0.45, 0.22);
        thighDxGeom.translate(0, -0.225, 0);
        const thighDx = new THREE.Mesh(thighDxGeom, skinMaterial);
        gambaDx.add(thighDx);

        const ginocchioDx = new THREE.Group();
        ginocchioDx.name = 'ginocchio_dx';
        ginocchioDx.position.set(0, -0.45, 0);
        gambaDx.add(ginocchioDx);

        const shinDxGeom = new THREE.BoxGeometry(0.18, 0.45, 0.18);
        shinDxGeom.translate(0, -0.225, 0);
        const shinDx = new THREE.Mesh(shinDxGeom, skinMaterial);
        ginocchioDx.add(shinDx);

        // Piede
        const footDx = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.08, 0.28),
            accentMaterial
        );
        footDx.position.set(0, -0.45, 0.05);
        shinDx.add(footDx);

        // Riferimenti pubblici per le animazioni di Federico
        this.corpo         = corpo;
        this.testa          = testa;
        this.braccioSx      = braccioSx;
        this.braccioDx      = braccioDx;
        this.avanbraccioSx  = avanbraccioSx;
        this.avanbraccioDx  = avanbraccioDx;
        this.gambaSx        = gambaSx;
        this.gambaDx        = gambaDx;
        this.ginocchioSx    = ginocchioSx;
        this.ginocchioDx    = ginocchioDx;
    }

    /** Inizializza i suoni posizionali (chiamato dopo il preload) */
    initAudio() {
        // Aggiungi audio posizionale
        this.stepSound = AudioSystem.getPositionalSound('tunnel_steps', 8, 1.0);
        if (this.stepSound) {
            this.stepSound.setLoop(true);
            this.stepSound.setVolume(0);
            this.stepSound.play();
            this.root.add(this.stepSound);
        }

        this.breathSound = AudioSystem.getPositionalSound('demon_breathing', 3, 1.0);
        if (this.breathSound) {
            this.breathSound.setLoop(true);
            this.breathSound.play();
            this.root.add(this.breathSound);
        }
    }

    getMesh() {
        return this.root;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANIMAZIONI PROCEDURALI (tween.js) — vietato importare animazioni esterne
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Ferma tutti i tween attivi nel gruppo isolato del mostro.
     *
     * Riporta esplicitamente a zero anche le proprietà usate SOLO
     * dall'attacco (testa.rotation.x, testa/corpo.position.z, corpo.position.y,
     * braccia.rotation.z): se un attacco viene interrotto a metà del suo
     * rientro (es. cambia stato verso camminata/idle prima che lo yoyo/catena
     * di ritorno finisca — può succedere in modalità test con attacchi
     * ravvicinati), queste proprietà resterebbero altrimenti "bloccate"
     * nella posa del colpo, perché camminata/idle non le toccano mai e
     * quindi non le correggerebbero da sole.
     */
    _stopAllTweens() {
        this._tweenGroup.removeAll();
        this.testa.rotation.x = 0;
        this.testa.position.z = 0;
        this.corpo.position.z = 0;
        this.corpo.position.y = 0;
        this.braccioSx.rotation.z = 0;
        this.braccioDx.rotation.z = 0;
    }

    /**
     * Avvia l'animazione di camminata con tween ping-pong ciclici.
     * Ogni articolazione ha la propria durata e easing per un movimento
     * organico — braccia e gambe si oscillano in fase opposta.
     */
    _startWalkAnimation() {
        this._stopAllTweens();
        this._animState = 'walk';

        const dur = 380; // ms per mezza oscillazione (velocità del passo)

        // Braccio sinistro: parte da 0, va in avanti
        new TWEEN.Tween(this.braccioSx.rotation, this._tweenGroup)
            .to({ x: 0.65 }, dur)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        // Braccio destro: parte dal lato opposto (fase sfasata di 180°)
        new TWEEN.Tween(this.braccioDx.rotation, this._tweenGroup)
            .to({ x: -0.65 }, dur)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        // Avanbraccio sinistro: si flette in sincrono col braccio
        new TWEEN.Tween(this.avanbraccioSx.rotation, this._tweenGroup)
            .to({ x: -0.45 }, dur)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        // Avanbraccio destro: fase opposta
        new TWEEN.Tween(this.avanbraccioDx.rotation, this._tweenGroup)
            .to({ x: 0.1 }, dur)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        // Gamba sinistra: opposta al braccio sinistro (camminata naturale)
        new TWEEN.Tween(this.gambaSx.rotation, this._tweenGroup)
            .to({ x: -0.55 }, dur)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        // Gamba destra: opposta alla sinistra
        new TWEEN.Tween(this.gambaDx.rotation, this._tweenGroup)
            .to({ x: 0.55 }, dur)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        // Ginocchia: si piegano durante la fase di sollevamento del passo.
        // Frequenza doppia rispetto all'anca (dur/2): si flettono ad ogni
        // "apice" dell'oscillazione anziché restare rigide come un blocco
        // unico — sfrutta il nuovo giunto ginocchio→stinco della gerarchia.
        new TWEEN.Tween(this.ginocchioSx.rotation, this._tweenGroup)
            .to({ x: 0.55 }, dur / 2)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        // Sfasata di un quarto di ciclo rispetto alla sinistra, per non
        // piegarsi esattamente in sincrono con l'altro ginocchio.
        new TWEEN.Tween(this.ginocchioDx.rotation, this._tweenGroup)
            .to({ x: 0.55 }, dur / 2)
            .delay(dur / 2)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        // Bob verticale del busto: dà peso/impatto al passo (prima solo la
        // testa si muoveva, il busto restava fermo → sembrava "scivolare").
        new TWEEN.Tween(this.corpo.position, this._tweenGroup)
            .to({ y: 0.05 }, dur)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        // Testa: leggero bob laterale + su/giù (passo ritmico, periodo doppio)
        new TWEEN.Tween(this.testa.rotation, this._tweenGroup)
            .to({ y: 0.18, z: 0.07 }, dur * 2)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new TWEEN.Tween(this.testa.position, this._tweenGroup)
            .to({ y: 0.95 }, dur)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();
    }

    /**
     * Avvia l'animazione idle (respiro lento, dondolamento creepy).
     * Durata molto più lenta rispetto alla camminata.
     */
    _startIdleAnimation() {
        this._stopAllTweens();
        this._animState = 'idle';

        const dur = 1400; // ms — molto più lento del passo

        // Riporta rapidamente le gambe/ginocchia a posizione neutra: se si
        // arriva qui a metà di un passo (camminata appena interrotta), senza
        // questo le gambe resterebbero bloccate in una posa a metà falcata.
        const resetDur = 300;
        for (const joint of [this.gambaSx, this.gambaDx, this.ginocchioSx, this.ginocchioDx]) {
            new TWEEN.Tween(joint.rotation, this._tweenGroup)
                .to({ x: 0 }, resetDur)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
        new TWEEN.Tween(this.corpo.position, this._tweenGroup)
            .to({ y: 0 }, resetDur)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        // Respirazione: testa sale e scende impercettibilmente
        new TWEEN.Tween(this.testa.position, this._tweenGroup)
            .to({ y: 0.96 }, dur)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        // Testa: rotazione lenta e inquietante
        new TWEEN.Tween(this.testa.rotation, this._tweenGroup)
            .to({ y: 0.12 }, dur * 1.6)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        // Braccia: ondeggiamento leggero verso il basso
        new TWEEN.Tween(this.braccioSx.rotation, this._tweenGroup)
            .to({ x: 0.08 }, dur)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();

        new TWEEN.Tween(this.braccioDx.rotation, this._tweenGroup)
            .to({ x: 0.08 }, dur)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .yoyo(true).repeat(Infinity)
            .start();
    }

    /**
     * Animazione di ATTACCO (one-shot), in 3 fasi concatenate — più lunga e
     * leggibile di prima, pensata per essere vista da qualche passo di
     * distanza (il mostro ora scatta quando sei a ~2.5m, non più incollato):
     *
     *   1. ANTICIPAZIONE (260ms) — braccia indietro, busto si accovaccia e
     *      si inarca all'indietro: il classico "richiamo" prima del colpo.
     *   2. SCATTO (200ms) — le braccia si aprono a "artiglio" con uno swing
     *      diagonale (non solo in avanti), busto/testa proiettati avanti.
     *   3. ASSESTAMENTO (300ms) — tutto torna lentamente a neutro: dà peso
     *      al colpo invece di scattare indietro di colpo come un elastico.
     *
     * Durata totale ~760ms (~doppia della versione precedente).
     *
     * Le gambe NON partecipano (restano ferme dove sono): scelta voluta.
     *
     * Durante l'attacco lo stato animazione viene bloccato su 'attack' cosicché
     * update() non lo sovrascriva a metà mentre i tween sono ancora attivi.
     */
    attack() {
        this._stopAllTweens();
        this._animState = 'attack';

        const anticipDur = 260; // richiamo indietro, lento e leggibile
        const lungeDur    = 200; // scatto vero e proprio, ancora rapido
        const recoilDur   = 300; // rientro lento, dà "peso" dopo il colpo

        // ── 1. ANTICIPAZIONE ────────────────────────────────────────────
        const anticipBraccioSx = new TWEEN.Tween(this.braccioSx.rotation, this._tweenGroup)
            .to({ x: 0.5, z: 0.15 }, anticipDur).easing(TWEEN.Easing.Quadratic.Out);
        const anticipBraccioDx = new TWEEN.Tween(this.braccioDx.rotation, this._tweenGroup)
            .to({ x: 0.5, z: -0.15 }, anticipDur).easing(TWEEN.Easing.Quadratic.Out);
        const anticipCorpo = new TWEEN.Tween(this.corpo.position, this._tweenGroup)
            .to({ y: -0.08, z: 0.18 }, anticipDur).easing(TWEEN.Easing.Quadratic.Out); // si accovaccia e si inarca indietro
        const anticipTesta = new TWEEN.Tween(this.testa.position, this._tweenGroup)
            .to({ z: 0.18 }, anticipDur).easing(TWEEN.Easing.Quadratic.Out);

        // ── 2. SCATTO (swing diagonale, non solo dritto in avanti) ────────
        const strikeBraccioSx = new TWEEN.Tween(this.braccioSx.rotation, this._tweenGroup)
            .to({ x: -1.5, z: -0.35 }, lungeDur).easing(TWEEN.Easing.Quadratic.Out);
        const strikeBraccioDx = new TWEEN.Tween(this.braccioDx.rotation, this._tweenGroup)
            .to({ x: -1.5, z: 0.35 }, lungeDur).easing(TWEEN.Easing.Quadratic.Out);
        const strikeAvanbraccioSx = new TWEEN.Tween(this.avanbraccioSx.rotation, this._tweenGroup)
            .to({ x: -0.95 }, lungeDur).easing(TWEEN.Easing.Quadratic.Out);
        const strikeAvanbraccioDx = new TWEEN.Tween(this.avanbraccioDx.rotation, this._tweenGroup)
            .to({ x: -0.95 }, lungeDur).easing(TWEEN.Easing.Quadratic.Out);
        const strikeCorpo = new TWEEN.Tween(this.corpo.position, this._tweenGroup)
            .to({ y: 0.02, z: -0.5 }, lungeDur).easing(TWEEN.Easing.Quadratic.Out);
        const strikeTesta = new TWEEN.Tween(this.testa.position, this._tweenGroup)
            .to({ z: -0.5 }, lungeDur).easing(TWEEN.Easing.Quadratic.Out);
        const strikeTestaRot = new TWEEN.Tween(this.testa.rotation, this._tweenGroup)
            .to({ x: 0.65 }, lungeDur).easing(TWEEN.Easing.Quadratic.Out);

        // ── 3. ASSESTAMENTO — rientro lento, non un elastico ──────────────
        const recoilBraccioSx = new TWEEN.Tween(this.braccioSx.rotation, this._tweenGroup)
            .to({ x: 0, z: 0 }, recoilDur).easing(TWEEN.Easing.Quadratic.InOut);
        const recoilBraccioDx = new TWEEN.Tween(this.braccioDx.rotation, this._tweenGroup)
            .to({ x: 0, z: 0 }, recoilDur).easing(TWEEN.Easing.Quadratic.InOut);
        const recoilAvanbraccioSx = new TWEEN.Tween(this.avanbraccioSx.rotation, this._tweenGroup)
            .to({ x: 0 }, recoilDur).easing(TWEEN.Easing.Quadratic.InOut);
        const recoilAvanbraccioDx = new TWEEN.Tween(this.avanbraccioDx.rotation, this._tweenGroup)
            .to({ x: 0 }, recoilDur).easing(TWEEN.Easing.Quadratic.InOut);
        const recoilCorpo = new TWEEN.Tween(this.corpo.position, this._tweenGroup)
            .to({ y: 0, z: 0 }, recoilDur).easing(TWEEN.Easing.Quadratic.InOut);
        const recoilTesta = new TWEEN.Tween(this.testa.position, this._tweenGroup)
            .to({ z: 0 }, recoilDur).easing(TWEEN.Easing.Quadratic.InOut);
        const recoilTestaRot = new TWEEN.Tween(this.testa.rotation, this._tweenGroup)
            .to({ x: 0 }, recoilDur).easing(TWEEN.Easing.Quadratic.InOut)
            .onComplete(() => {
                // Rilascia il lock di stato: il prossimo update() potrà
                // riportare il mostro in idle/walk normalmente.
                this._animState = null;
            });

        // Concatena: anticipazione → scatto → assestamento
        anticipBraccioSx.chain(strikeBraccioSx); strikeBraccioSx.chain(recoilBraccioSx);
        anticipBraccioDx.chain(strikeBraccioDx); strikeBraccioDx.chain(recoilBraccioDx);
        anticipCorpo.chain(strikeCorpo);         strikeCorpo.chain(recoilCorpo);
        anticipTesta.chain(strikeTesta);         strikeTesta.chain(recoilTesta);

        anticipBraccioSx.start();
        anticipBraccioDx.start();
        anticipCorpo.start();
        anticipTesta.start();

        // Avambracci e rotazione testa non hanno una fase di anticipazione
        // propria (seguono l'arto/il busto a cui appartengono): partono
        // insieme allo scatto, dopo lo stesso ritardo dell'anticipazione.
        strikeAvanbraccioSx.chain(recoilAvanbraccioSx);
        strikeAvanbraccioDx.chain(recoilAvanbraccioDx);
        strikeTestaRot.chain(recoilTestaRot);

        strikeAvanbraccioSx.delay(anticipDur).start();
        strikeAvanbraccioDx.delay(anticipDur).start();
        strikeTestaRot.delay(anticipDur).start();
    }

    /** Stato animazione corrente ('walk' | 'idle' | 'attack' | null) */
    getAnimState() {
        return this._animState;
    }

    /**
     * update(deltaTime, isMoving)
     * Va chiamato ogni frame dal game loop in main.js.
     * Cambia stato animazione solo quando necessario (evita restart continui).
     *
     * @param {number}  deltaTime - secondi dall'ultimo frame
     * @param {boolean} isMoving  - true se il mostro sta inseguendo il player
     */
    update(deltaTime, isMoving) {
        // Non interrompere un'animazione di attacco già in corso
        if (this._animState !== 'attack') {
            if (isMoving && this._animState !== 'walk') {
                this._startWalkAnimation();
            } else if (!isMoving && this._animState !== 'idle') {
                this._startIdleAnimation();
            }
        }

        if (this.stepSound) {
            this.stepSound.setVolume(isMoving ? 1.0 : 0.0);
        }

        // Inclinazione predatoria in avanti quando insegue, eretto quando
        // fermo/attacca. IMPORTANTE: applicata a `corpo.rotation.x`, MAI a
        // `root.rotation`/`root.quaternion` — quella proprietà è "di
        // proprietà" di PlayerController, che ogni frame chiama
        // mostroMesh.lookAt() per farlo girare verso il giocatore. La
        // decomposizione di un quaternion in angoli Euler non è unica: per
        // certi angoli di imbardata lookAt() può produrre una
        // rappresentazione x/z "capovolta ma equivalente" (es. x≈180° invece
        // di x≈0), e sovrascrivere solo rotation.x in quel caso produceva
        // un orientamento visivamente sbagliato in modo intermittente (il
        // "cammina a testa in giù" osservato, a volte sì a volte no a
        // seconda dell'angolo). corpo.rotation.x non è mai toccato da
        // nessun altro sistema (lookAt, attacco, camminata): zero conflitti.
        const targetLean = (isMoving && this._animState !== 'attack') ? 0.16 : 0;
        this._currentLean = this._currentLean ?? 0;
        this._currentLean += (targetLean - this._currentLean) * Math.min(1, deltaTime * 5);
        this._currentLean = Math.max(-0.3, Math.min(0.3, this._currentLean));
        this.corpo.rotation.x = this._currentLean;

        // Aggiorna tutti i tween del gruppo isolato del mostro
        this._tweenGroup.update();
    }
}
