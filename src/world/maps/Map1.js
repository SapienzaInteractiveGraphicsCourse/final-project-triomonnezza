/**
 * Map1.js  —  "Il Sanatorio Abbandonato"
 * RESPONSABILE: Davide (Artista)
 *
 * Prima mappa giocabile. Contiene:
 *   - Corridoi stretti con soffitto basso
 *   - Stanza iniziale (spawn)
 *   - Stanza finale (obiettivo)
 *   - Porte interattive
 *   - Zone trigger per i jumpscare di Federico
 *   - Luci del corridoio registrate su LightingSetup
 *
 * INTERFACCIA ATTESA:
 *   const map = new Map1(scene, textureLoader, lightingSetup, collisionBuilder);
 *   map.build();                        // costruisce la geometria
 *   const triggers = map.getTriggers(); // Array<{box, nome, giaAttivato}> → PlayerController
 *
 * LAYOUT MAPPA (vista dall'alto):
 *
 *   +-------+   +--+   +-------+
 *   | SPAWN |===|  |===| STANZA|
 *   +-------+   |  |   |  B    |
 *               |CO|   +---+---+
 *               |RR|       |
 *               |ID|   +---+---+
 *               |OI|   | STANZA|
 *               |O |   |  C    |
 *               +--+   +-------+
 *
 * COORDINATE: Sistema ThreeJS standard (+Y su, unità = 1 metro)
 * DIMENSIONI CORRIDOIO: 3m larghezza, 3m altezza, variabile lunghezza
 */

import * as THREE from 'three';

export class Map1 {
    /**
     * @param {THREE.Scene}          scene
     * @param {HorrorTextureLoader}  textureLoader   - istanza di src/world/TextureLoader.js
     * @param {LightingSetup}        lightingSetup   - istanza di src/world/LightingSetup.js
     * @param {CollisionBuilder}     collisionBuilder- istanza di src/world/CollisionBuilder.js
     */
    constructor(scene, textureLoader, lightingSetup, collisionBuilder) {
        this.scene            = scene;
        this.tl               = textureLoader;
        this.lighting         = lightingSetup;
        this.cb               = collisionBuilder;

        this._triggers = [];  // Array<{box, nome, giaAttivato}> → passato al PlayerController
        this._doors    = [];  // Array<{mesh, isOpen}> → usato da Federico per i Tween
    }

    /** Costruisce tutta la geometria della mappa nella scena. */
    build() {
        this._buildSpawnRoom();
        this._buildMainCorridor();
        this._buildRoomB();
        this._buildRoomC();
        this._buildDoors();
        this._buildTriggers();
        this._buildDecorations();
    }

    // ─────────────────────────────────────────────────────────
    //  STANZE E CORRIDOI
    // ─────────────────────────────────────────────────────────

    /** Stanza di spawn: 6x6m, altezza 3m */
    _buildSpawnRoom() {
        // TODO Davide: costruisci pavimento, soffitto e 4 muri della stanza spawn
        // Suggerimento: usa BoxGeometry + MeshPhongMaterial con le texture del tl
        // Registra ogni muro nel collisionBuilder: this.cb.addFromMesh(mesh)
        // Aggiungi una luce: this.lighting.addCorridoioLuce(new THREE.Vector3(0, 2.8, 0), 0.6)

        console.warn('[Map1] _buildSpawnRoom() → TODO: implementare la stanza di spawn');
    }

    /** Corridoio principale: 3m larghezza, 3m altezza, 20m lunghezza */
    _buildMainCorridor() {
        // TODO Davide: costruisci il corridoio principale
        // Texture suggerita: this.tl.createMaterial('muro') per i muri
        //                    this.tl.createMaterial('pavimento_bagnato') per il pavimento
        // Luci ogni 6m: this.lighting.addCorridoioLuce(pos, 0.8, 6, 0xff4400)

        console.warn('[Map1] _buildMainCorridor() → TODO: implementare il corridoio');
    }

    /** Stanza B: 5x5m */
    _buildRoomB() {
        // TODO Davide
        console.warn('[Map1] _buildRoomB() → TODO: implementare stanza B');
    }

    /** Stanza C (finale / obiettivo): 4x4m, texture sangue */
    _buildRoomC() {
        // TODO Davide: usa this.tl.createMaterial('muro_sangue') per un parete
        console.warn('[Map1] _buildRoomC() → TODO: implementare stanza C');
    }

    // ─────────────────────────────────────────────────────────
    //  PORTE INTERATTIVE
    // ─────────────────────────────────────────────────────────

    _buildDoors() {
        // TODO Davide: crea le porte come Mesh con userData interattivi
        // Esempio struttura userData di una porta:
        //   porta.userData = { isInteractive: true, tipo: 'porta', richiedeChiave: true, idChiave: 'chiave_map1_b' }
        //   porta.name = 'Porta_Corridoio_B';
        //
        // Le porte vengono anche aggiunte all'array this._doors
        // così Federico può animarle via Tween quando riceve l'evento 'portaAperta'

        console.warn('[Map1] _buildDoors() → TODO: implementare le porte');
    }

    // ─────────────────────────────────────────────────────────
    //  TRIGGER ZONES (per Federico)
    // ─────────────────────────────────────────────────────────

    _buildTriggers() {
        // TODO Davide: definisci le zone invisibili che scatenano i jumpscare
        // Ogni trigger ha: { box: THREE.Box3, nome: string, giaAttivato: false }
        //
        // TRIGGER 1 — Metà corridoio: la luce si spegne
        // this._triggers.push({
        //     box:          new THREE.Box3(new THREE.Vector3(-1.5, 0, -12), new THREE.Vector3(1.5, 3, -8)),
        //     nome:         'JUMPSCARE_CORRIDOIO_BUIO',
        //     giaAttivato:  false,
        // });
        //
        // TRIGGER 2 — Ingresso Stanza C: il mostro spawna
        // this._triggers.push({
        //     box:          ...,
        //     nome:         'SPAWN_MOSTRO_STANZA_C',
        //     giaAttivato:  false,
        // });

        console.warn('[Map1] _buildTriggers() → TODO: definire le zone trigger');
    }

    // ─────────────────────────────────────────────────────────
    //  DECORAZIONI (non collisioni)
    // ─────────────────────────────────────────────────────────

    _buildDecorations() {
        // TODO Davide: oggetti decorativi (sedie, lettighe, ecc.)
        // Non registrarli in CollisionBuilder a meno che non blocchino il passaggio
        console.warn('[Map1] _buildDecorations() → TODO: aggiungere decorazioni');
    }

    // ─────────────────────────────────────────────────────────
    //  GETTER PER GLI ALTRI MODULI
    // ─────────────────────────────────────────────────────────

    /**
     * Restituisce le trigger zones per il PlayerController di Alessandro.
     * @returns {Array<{box: THREE.Box3, nome: string, giaAttivato: boolean}>}
     */
    getTriggers() {
        return this._triggers;
    }

    /**
     * Restituisce le porte per Federico (Tween di apertura).
     * @returns {Array<{mesh: THREE.Mesh, isOpen: boolean}>}
     */
    getDoors() {
        return this._doors;
    }

    /**
     * Rimuove tutta la geometria della mappa dalla scena (cambio mappa).
     * TODO Davide: implementa la pulizia quando aggiungi oggetti alla scena
     */
    dispose() {
        // TODO Davide: rimuovi ogni mesh aggiunta con this.scene.remove(mesh)
        console.warn('[Map1] dispose() → TODO: implementare la pulizia della scena');
    }
}
