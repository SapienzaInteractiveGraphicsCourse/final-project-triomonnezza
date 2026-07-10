/**
 * Monster.js  —  Entità Mostro (Modello Gerarchico)
 * RESPONSABILE: Alessandro (geometria base) + Federico (animazioni)
 *
 * Costruisce il mostro come modello gerarchico Three.js:
 *   Radice (corpo) → braccia, gambe, testa come child objects
 *
 * NOTA: Questo file si occupa SOLO della geometria. Le animazioni (Tween)
 * sono state spostate in src/animations/MonsterAnimator.js per separare
 * la vista dalla logica procedurale.
 */

import * as THREE from 'three';
import { AudioSystem } from '../core/AudioSystem.js';

export class Monster {
    constructor() {
        this.root = new THREE.Group();
        this.root.name = 'Mostro';

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

        // Ginocchio
        const ginocchioSx = new THREE.Group();
        ginocchioSx.name = 'ginocchio_sx';
        ginocchioSx.position.set(0, -0.45, 0);
        gambaSx.add(ginocchioSx);

        const shinSxGeom = new THREE.BoxGeometry(0.18, 0.45, 0.18);
        shinSxGeom.translate(0, -0.225, 0);
        const shinSx = new THREE.Mesh(shinSxGeom, skinMaterial);
        ginocchioSx.add(shinSx);

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

        // Riferimenti pubblici per l'animatore (MonsterAnimator)
        this.corpo         = corpo;
        this.testa         = testa;
        this.braccioSx     = braccioSx;
        this.braccioDx     = braccioDx;
        this.avanbraccioSx = avanbraccioSx;
        this.avanbraccioDx = avanbraccioDx;
        this.gambaSx       = gambaSx;
        this.gambaDx       = gambaDx;
        this.ginocchioSx   = ginocchioSx;
        this.ginocchioDx   = ginocchioDx;
    }

    /** Inizializza i suoni posizionali (chiamato dopo il preload) */
    initAudio() {
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
}
