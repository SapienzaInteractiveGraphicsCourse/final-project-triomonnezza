import * as THREE from 'three';
import { MapBase } from './MapBase.js';

/**
 * MapMedium — Ospedale / Edificio amministrativo abbandonato
 * 
 * Layout stanze (coordinate tile, tileSize = 4m):
 *   R_A (0,0) 4x4
 *   R_B (12,0) 4x4
 *   R_C (6,10) 4x4
 */
export class MapMedium extends MapBase {
    async load() {
        console.log('[MapMedium] Loading Hospital Map...');
        await super.load();

        const TM = {
            floorTile:   'floorTiles.glb',
            ceilingTile: 'ceilingPlaster.glb',
            wallTile:    'wallPlaster.glb',
            wallDoorTile:'wallDoorPlaster.glb',
        };

        // La porta di uscita DEVE essere creata prima del build()
        this.spawnGoalDoor(-2 + 0.15, 6, Math.PI / 2);
        const allowedAssets = ['cabinet.glb', 'trashBin.glb', 'box.glb', 'box2.glb', 'trashBag.glb', 'radiator.glb', 'fridge.glb'];

        const build = (tx, tz, cols, rows, doors, flickers = false, lampColor = 0xfff4cc, isBigRoom = false) => {
            this.buildRoomByTiles(tx, tz, cols, rows, doors, TM);
            const cx = tx * 4 + cols * 2 - 2;
            const cz = tz * 4 + rows * 2 - 2;
            this.spawnCeilingLamp(cx, cz, 5.5, 0.75, Math.max(cols, rows) * 4.5, lampColor, flickers);
            
            if (isBigRoom) {
                this.autoPopulateBigRoom(tx, tz, cols, rows, doors, allowedAssets);
            }
        };

        // Stanze grandi (4x4)
        build(0, 0, 4, 4, ['E_1', 'S_2'], true, 0xfff4cc, true);                            // R_A
        build(12, 0, 4, 4, ['W_1', 'S_2'], true, 0xfff4cc, true);                            // R_B
        build(6, 10, 4, 4, ['N_2', 'W_1', 'E_1', 'S_0', 'S_3'], false, 0xfff4cc, true);      // R_C

        // Sgabuzzini (1x1)
        build(8, 1, 1, 1, ['W_0', 'E_0', 'S_0']);                     // J_1
        build(2, 11, 1, 1, ['N_0', 'E_0']);                            // J_2
        build(14, 11, 1, 1, ['N_0', 'W_0']);                           // J_3
        build(6, 16, 1, 1, ['N_0', 'E_0']);                            // J_4
        build(9, 16, 1, 1, ['N_0', 'W_0']);                            // J_5

        // Corridoi lunghi
        build(4, 1, 4, 1, ['W_0', 'E_0']);                             // H1_left
        build(9, 1, 3, 1, ['W_0', 'E_0']);                             // H1_right
        build(8, 2, 1, 8, ['N_0', 'S_0'], true);                       // H2_down (8 tiles!)
        build(2, 4, 1, 7, ['N_0', 'S_0']);                             // H3_vert (7 tiles!)
        build(3, 11, 3, 1, ['W_0', 'E_0']);                            // H3_horiz
        build(14, 4, 1, 7, ['N_0', 'S_0']);                            // H4_vert (7 tiles!)
        build(10, 11, 4, 1, ['W_0', 'E_0']);                           // H4_horiz
        build(6, 14, 1, 2, ['N_0', 'S_0']);                            // H_C_down1
        build(9, 14, 1, 2, ['N_0', 'S_0']);                            // H_C_down2
        build(7, 16, 2, 1, ['W_0', 'E_0']);                            // H_back

        // Trigger spavento in closet J_1
        this.addTrigger(34, 2, 6, 'CLOSET_SCARE');

        // Spawns
        this.playerSpawn          = new THREE.Vector3( 6, 1.8,  4);
        this.playerSpawnRotationY = -Math.PI / 2;
        this.monsterSpawn         = new THREE.Vector3(30, 2.454, 46);
        // Chiave in stanza C angolo SW
        this.spawnGoalKey(new THREE.Vector3(26, 1.3, 52));

        // Batterie in stanza B e closet J_2
        this.spawnBattery(new THREE.Vector3(50, 0, 4),  'batteria_medium_1');
        this.spawnBattery(new THREE.Vector3(10, 0, 44), 'batteria_medium_2');
    }
}

