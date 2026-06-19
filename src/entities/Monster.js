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

export class Monster {
    constructor() {
        this.root = new THREE.Group();
        this.root.name = 'Mostro';

        this._buildHierarchy();
    }

    _buildHierarchy() {
        // TODO Alessandro/Federico: costruire la geometria gerarchica reale
        // Placeholder: cubo viola monolitico
        const corpo = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 3, 1.5),
            new THREE.MeshPhongMaterial({ color: 0x6600aa })
        );
        corpo.name = 'corpo';
        corpo.position.y = 1.5;
        this.root.add(corpo);

        // Riferimenti pubblici per le animazioni di Federico
        this.corpo     = corpo;
        this.testa     = null; // TODO
        this.braccioSx = null; // TODO
        this.braccioDx = null; // TODO
    }

    /** Aggiunge il mostro alla scena nella posizione specificata */
    addToScene(scene, position) {
        this.root.position.copy(position);
        scene.add(this.root);
    }

    getMesh() {
        return this.root;
    }
}
