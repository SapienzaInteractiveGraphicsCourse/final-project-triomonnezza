import * as THREE from 'three';
import { MapBase } from './MapBase.js';

/**
 * MapEasy — Appartamento accogliente
 * Layout stanze (coordinate tile, tileSize = 4m):
 *   Stanza A (0,0) 4x3 Camera
 *   Stanza B (6,0) 4x4 Cucina
 *   Stanza C (4,5) 3x3 Soggiorno
 *   Stanza D (0,6) 3x3 Ripostiglio
 *   Stanza E (8,6) 2x3 Studio/Uscita
 */
export class MapEasy extends MapBase {
    async load() {
        console.log('[MapEasy] Loading Apartment Map...');
        await super.load();

        const WP = {
            floorTile:  'floorWood.glb',
            ceilingTile:'ceilingWood.glb',
            wallTile:   'wallWallpaper.glb',
        };

        // La porta di uscita DEVE essere creata prima del build()
        this.spawnGoalDoor(20, 30 - 0.15, Math.PI);

        const easyAllowedAssets = ['couchBig.glb', 'couchSmall.glb', 'couchSmall2.glb', 'plant.glb', 'plant2.glb', 'bookshelf.glb'];

        const build = (tx, tz, cols, rows, doors, flickers = false, lampColor = 0xffeedd, isBigRoom = false) => {
            this.buildRoomByTiles(tx, tz, cols, rows, doors, WP);
            const cx = tx * 4 + cols * 2 - 2;
            const cz = tz * 4 + rows * 2 - 2;
            this.spawnCeilingLamp(cx, cz, 5.5, 0.75, Math.max(cols, rows) * 4.5, lampColor, flickers);
            if (isBigRoom) {
                this.autoPopulateBigRoom(tx, tz, cols, rows, doors, easyAllowedAssets);
            }
        };

        // Stanze
        build(0, 0, 4, 3, ['E_1', 'S_1'], true, 0xffeedd, true);               // A (Camera)
        build(6, 0, 4, 4, ['W_1', 'S_0', 'S_2'], false, 0xffeedd, true);        // B (Cucina)
        build(4, 5, 3, 3, ['N_2', 'W_1', 'E_2', 'S_1'], Math.random() > 0.5, 0xffeedd, true); // C (Soggiorno)
        build(0, 6, 3, 3, ['N_1', 'E_0'], false, 0xffeedd, true);               // D (Ripostiglio)
        build(8, 6, 2, 3, ['W_1', 'N_0'], Math.random() > 0.5, 0xffeedd, true);               // E (Studio)

        // Corridoi
        build(4, 1, 2, 1, ['W_0', 'E_0']);               // H1  A ↔ B
        build(1, 3, 1, 3, ['N_0', 'S_0'], true);               // H2  A ↔ D
        build(6, 4, 1, 1, ['N_0', 'S_0']);               // H3  B ↔ C
        build(3, 6, 1, 1, ['W_0', 'E_0']);               // H4  D ↔ C
        build(7, 7, 1, 1, ['W_0', 'E_0']);               // H5  C ↔ E
        build(8, 4, 1, 2, ['N_0', 'S_0']);               // H6  B ↔ E

        // STANZA C - SOGGIORNO
        // Vuota. Porte su tutti i muri.

        // Trigger spavento in stanza D
        this.addTrigger(4, 2, 28, 'STORAGE_SCARE');

        // Spawns
        this.playerSpawn          = new THREE.Vector3( 6, 1.8,  4);
        this.playerSpawnRotationY = Math.PI / 2;
        this.monsterSpawn         = new THREE.Vector3(30, 2.454, 6);
        // Chiave in stanza B (Cucina) angolo SE
        this.spawnGoalKey(new THREE.Vector3(35, 1.3, 12));

        // Batteria in stanza C (Soggiorno)
        this.spawnBattery(new THREE.Vector3(16, 0, 20), 'batteria_easy_1');
    }
}

