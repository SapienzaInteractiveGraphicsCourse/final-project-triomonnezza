/**
 * CollisionBuilder.js
 * RESPONSABILE: Davide (Artista)
 *
 * Crea le Bounding Box (THREE.Box3) di collisione a partire dalle Mesh della mappa.
 * Le box vengono poi passate al PlayerController di Alessandro.
 *
 * UTILIZZO:
 *   const cb = new CollisionBuilder(scene);
 *   cb.addFromMesh(wallMesh);          // registra una singola mesh
 *   cb.addFromGroup(mapGroup);         // registra tutte le mesh di un Group
 *   const boxes = cb.getBoxes();       // Array<THREE.Box3> → passa a PlayerController
 *
 * CONVENZIONE:
 *   Tutte le Mesh che devono bloccare il giocatore vanno registrate qui.
 *   Le Mesh SOLO decorative (es. macchie sul soffitto) NON vanno registrate.
 */

import * as THREE from 'three';

export class CollisionBuilder {
    /**
     * @param {THREE.Scene} scene - La scena (usata per aggiornare le box se necessario)
     */
    constructor(scene) {
        this.scene  = scene;
        this._boxes = []; // Array<THREE.Box3>
    }

    /**
     * Registra una singola mesh come ostacolo di collisione.
     * Calcola automaticamente la Box3 dalle coordinate world della mesh.
     *
     * @param {THREE.Mesh} mesh
     * @returns {THREE.Box3} la box appena creata (per riferimento esterno se serve)
     */
    addFromMesh(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        this._boxes.push(box);
        return box;
    }

    /**
     * Registra tutte le Mesh contenute in un Group (es. una stanza intera).
     * Utile per applicare le collisioni a intere sezioni di mappa costruite da Davide.
     *
     * @param {THREE.Group} group
     */
    addFromGroup(group) {
        group.traverse(child => {
            if (child.isMesh) {
                this.addFromMesh(child);
            }
        });
    }

    /**
     * Restituisce l'array di Box3 da passare al PlayerController.
     * @returns {THREE.Box3[]}
     */
    getBoxes() {
        return this._boxes;
    }

    /**
     * Svuota tutte le box registrate (utile al cambio mappa).
     */
    clear() {
        this._boxes = [];
    }

    // ─────────────────────────────────────────────────────────────────
    // HELPER VISIVO (solo sviluppo): mostra le bounding box in scena
    //   Chiamare con: cb.debugShowBoxes()
    //   Rimuovere prima della consegna!
    // ─────────────────────────────────────────────────────────────────
    debugShowBoxes() {
        for (const box of this._boxes) {
            const helper = new THREE.Box3Helper(box, 0x00ff00);
            this.scene.add(helper);
        }
    }
}
