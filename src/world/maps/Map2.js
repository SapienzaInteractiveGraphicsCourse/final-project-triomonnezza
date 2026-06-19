/**
 * Map2.js  —  "Il Corridoio dell'Ospedale"
 * RESPONSABILE: Davide (Artista)
 *
 * Seconda mappa. Atmosfera diversa dalla Map1:
 *   - Ambiente più largo (corridoio ospedaliero)
 *   - Luci fluorescenti al neon (sfarfallio diverso)
 *   - Più stanze, più punti di interesse
 *   - Il mostro parte già aggressivo (aggro radius ridotto per testare)
 *
 * INTERFACCIA IDENTICA a Map1:
 *   const map = new Map2(scene, textureLoader, lightingSetup, collisionBuilder);
 *   map.build();
 *   const triggers = map.getTriggers();
 *
 * TODO Davide: definisci il layout di questa mappa quando Map1 è completata.
 *              Puoi riciclare gli stessi helper, cambia solo geometria e posizioni.
 */

import * as THREE from 'three';

export class Map2 {
    /**
     * @param {THREE.Scene}          scene
     * @param {HorrorTextureLoader}  textureLoader
     * @param {LightingSetup}        lightingSetup
     * @param {CollisionBuilder}     collisionBuilder
     */
    constructor(scene, textureLoader, lightingSetup, collisionBuilder) {
        this.scene    = scene;
        this.tl       = textureLoader;
        this.lighting = lightingSetup;
        this.cb       = collisionBuilder;

        this._triggers = [];
        this._doors    = [];
    }

    build() {
        // TODO Davide: implementa il layout della mappa 2
        // Suggerimento: inizia solo dopo che Map1 è funzionante al 100%
        console.warn('[Map2] build() → TODO: implementare Mappa 2 (Ospedale)');
    }

    getTriggers() { return this._triggers; }
    getDoors()    { return this._doors;    }

    dispose() {
        console.warn('[Map2] dispose() → TODO: implementare la pulizia della scena');
    }
}
