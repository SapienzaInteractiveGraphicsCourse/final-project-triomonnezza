import * as THREE from 'three';
import { MapBase } from './MapBase.js';

/**
 * MapMedium — Abandoned hospital / administrative building.
 * Plaster walls, tile floors, flickering fluorescent lights.
 *
 * Narrative: An old public building sealed for decades. Paperwork, gurneys,
 * waiting chairs, and broken equipment litter every room.
 *
 * World-coord formula: cx = tx*4 + cols*2 - 2,  cz = tz*4 + rows*2 - 2
 *   Room A (tx=0,  tz=0,  4×4): cx=6,  cz=6   bounds x[-2,14]  z[-2,14]
 *   Room B (tx=12, tz=0,  4×4): cx=54, cz=6   bounds x[46,62]  z[-2,14]
 *   Room C (tx=6,  tz=10, 4×4): cx=30, cz=46  bounds x[22,38]  z[38,54]
 *   J_1   (tx=8,  tz=1,  1×1): cx=34, cz=6   bounds x[32,36]  z[2,6]  (closet)
 *   J_2   (tx=2,  tz=11, 1×1): cx=10, cz=46  bounds x[6,14]   z[42,46]
 *   J_3   (tx=14, tz=11, 1×1): cx=56, cz=44  bounds x[54,58]  z[42,46]
 *   H2    (tx=8,  tz=2,  1×8): cx=34, cz=22  bounds x[30,38]  z[6,38]
 *   H3    (tx=2,  tz=4,  1×7): cx=10, cz=26  bounds x[6,14]   z[14,42]
 *   H4    (tx=14, tz=4,  1×7): cx=58, cz=26  bounds x[54,62]  z[14,42]
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

        // ── Goal door MUST be registered BEFORE build() calls ──────────────────
        // so that _goalDoorPositions is populated before hinged doors are spawned.
        this.spawnGoalDoor(-2 + 0.15, 6, Math.PI / 2);
        const allowedAssets = ['cabinet.glb', 'bookshelf.glb', 'table2.glb', 'trashBin.glb', 'painting2.glb'];

        const build = (tx, tz, cols, rows, doors, flickers = false, lampColor = 0xfff4cc, isBigRoom = false) => {
            this.buildRoomByTiles(tx, tz, cols, rows, doors, TM);
            const cx = tx * 4 + cols * 2 - 2;
            const cz = tz * 4 + rows * 2 - 2;
            this.spawnCeilingLamp(cx, cz, 5.5, 0.6, Math.max(cols, rows) * 4, lampColor, flickers);
            
            if (isBigRoom) {
                this.autoPopulateBigRoom(tx, tz, cols, rows, doors, allowedAssets);
            }
        };

        // Massive Halls (4×4)
        build(0, 0, 4, 4, ['E_1', 'S_2'], true, 0xfff4cc, true);                            // R_A
        build(12, 0, 4, 4, ['W_1', 'S_2'], true, 0xfff4cc, true);                            // R_B
        build(6, 10, 4, 4, ['N_2', 'W_1', 'E_1', 'S_0', 'S_3'], false, 0xfff4cc, true);      // R_C

        // Junctions (1×1 closets)
        build(8, 1, 1, 1, ['W_0', 'E_0', 'S_0']);                     // J_1
        build(2, 11, 1, 1, ['N_0', 'E_0']);                            // J_2
        build(14, 11, 1, 1, ['N_0', 'W_0']);                           // J_3
        build(6, 16, 1, 1, ['N_0', 'E_0']);                            // J_4
        build(9, 16, 1, 1, ['N_0', 'W_0']);                            // J_5

        // Long hallways
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

        // ── Trigger horror (Regista) ──────────────────────────────────
        // J_1 closet, cx=34 cz=6 — jumpscare quando il giocatore ci passa vicino
        this.addTrigger(34, 2, 6, 'CLOSET_SCARE');

        // ── Spawns ─────────────────────────────────────────────────────
        this.playerSpawn          = new THREE.Vector3( 6, 1.8,  4);
        this.playerSpawnRotationY = -Math.PI / 2;
        this.monsterSpawn         = new THREE.Vector3(30, 2.454, 46);
        // Key in Room C (Staff Room) SW corner — open floor, no furniture on top
        this.spawnGoalKey(new THREE.Vector3(26, 1.3, 52));

        // ── Batterie di ricarica torcia (Regista) ─────────────────────
        // 2 batterie su Medium — Room B (lato opposto allo spawn) e closet J_2
        this.spawnBattery(new THREE.Vector3(50, 0, 4),  'batteria_medium_1');
        this.spawnBattery(new THREE.Vector3(10, 0, 44), 'batteria_medium_2');
    }
}

