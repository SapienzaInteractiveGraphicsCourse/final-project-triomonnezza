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

        // 5. GAMBA SINISTRA
        const gambaSx = new THREE.Group();
        gambaSx.name = 'gamba_sx';
        gambaSx.position.set(-0.3, -0.6, 0);
        this.root.add(gambaSx);

        const thighSxGeom = new THREE.BoxGeometry(0.22, 0.45, 0.22);
        thighSxGeom.translate(0, -0.225, 0);
        const thighSx = new THREE.Mesh(thighSxGeom, skinMaterial);
        gambaSx.add(thighSx);

        const shinSxGeom = new THREE.BoxGeometry(0.18, 0.45, 0.18);
        shinSxGeom.translate(0, -0.225, 0);
        const shinSx = new THREE.Mesh(shinSxGeom, skinMaterial);
        shinSx.position.set(0, -0.45, 0);
        gambaSx.add(shinSx);

        // Piede
        const footSx = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.08, 0.28),
            accentMaterial
        );
        footSx.position.set(0, -0.45, 0.05);
        shinSx.add(footSx);

        // 6. GAMBA DESTRA
        const gambaDx = new THREE.Group();
        gambaDx.name = 'gamba_dx';
        gambaDx.position.set(0.3, -0.6, 0);
        this.root.add(gambaDx);

        const thighDxGeom = new THREE.BoxGeometry(0.22, 0.45, 0.22);
        thighDxGeom.translate(0, -0.225, 0);
        const thighDx = new THREE.Mesh(thighDxGeom, skinMaterial);
        gambaDx.add(thighDx);

        const shinDxGeom = new THREE.BoxGeometry(0.18, 0.45, 0.18);
        shinDxGeom.translate(0, -0.225, 0);
        const shinDx = new THREE.Mesh(shinDxGeom, skinMaterial);
        shinDx.position.set(0, -0.45, 0);
        gambaDx.add(shinDx);

        // Piede
        const footDx = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.08, 0.28),
            accentMaterial
        );
        footDx.position.set(0, -0.45, 0.05);
        shinDx.add(footDx);

        // Riferimenti pubblici per le animazioni di Federico
        this.corpo         = corpo;
        this.testa         = testa;
        this.braccioSx     = braccioSx;
        this.braccioDx     = braccioDx;
        this.avanbraccioSx = avanbraccioSx;
        this.avanbraccioDx = avanbraccioDx;
        this.gambaSx       = gambaSx;
        this.gambaDx       = gambaDx;
    }

    /** Aggiunge il mostro alla scena nella posizione specificata */
    addToScene(scene, position) {
        this.root.position.copy(position);
        scene.add(this.root);
    }

    getMesh() {
        return this.root;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANIMAZIONI PROCEDURALI (tween.js) — vietato importare animazioni esterne
    // ─────────────────────────────────────────────────────────────────────────

    /** Ferma tutti i tween attivi nel gruppo isolato del mostro */
    _stopAllTweens() {
        this._tweenGroup.removeAll();
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
     * update(deltaTime, isMoving)
     * Va chiamato ogni frame dal game loop in main.js.
     * Cambia stato animazione solo quando necessario (evita restart continui).
     *
     * @param {number}  deltaTime - secondi dall'ultimo frame
     * @param {boolean} isMoving  - true se il mostro sta inseguendo il player
     */
    update(deltaTime, isMoving) {
        if (isMoving && this._animState !== 'walk') {
            this._startWalkAnimation();
        } else if (!isMoving && this._animState !== 'idle') {
            this._startIdleAnimation();
        }
        // Aggiorna tutti i tween del gruppo isolato del mostro
        this._tweenGroup.update();
    }
}
