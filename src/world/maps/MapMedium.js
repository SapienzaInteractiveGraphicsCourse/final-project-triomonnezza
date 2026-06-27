import * as THREE from 'three';
import { MapBase } from './MapBase.js';

export class MapMedium extends MapBase {
    load() {
        console.log('[MapMedium] Loading Variable-Geometry Map...');

        // 18 zones: Massive Halls + Long claustrophobic hallways + Junctions
        
        // Massive Halls (4x4)
        this.buildRoomByTiles(0, 0, 4, 4, ['E_1', 'S_2']);                              // R_A (0,0)
        this.buildRoomByTiles(12, 0, 4, 4, ['W_1', 'S_2']);                             // R_B (12,0)
        this.buildRoomByTiles(6, 10, 4, 4, ['N_2', 'W_1', 'E_1', 'S_0', 'S_3']);        // R_C (6,10) - 5 openings!

        // Junctions (1x1 Closets)
        this.buildRoomByTiles(8, 1, 1, 1, ['W_0', 'E_0', 'S_0']);                       // J_1 (8,1)
        this.buildRoomByTiles(2, 11, 1, 1, ['N_0', 'E_0']);                             // J_2 (2,11)
        this.buildRoomByTiles(14, 11, 1, 1, ['N_0', 'W_0']);                            // J_3 (14,11)
        this.buildRoomByTiles(6, 16, 1, 1, ['N_0', 'E_0']);                             // J_4 (6,16)
        this.buildRoomByTiles(9, 16, 1, 1, ['N_0', 'W_0']);                             // J_5 (9,16)

        // Long Interlocking Hallways
        this.buildRoomByTiles(4, 1, 4, 1, ['W_0', 'E_0']);                              // H1_left (4,1)
        this.buildRoomByTiles(9, 1, 3, 1, ['W_0', 'E_0']);                              // H1_right (9,1)
        this.buildRoomByTiles(8, 2, 1, 8, ['N_0', 'S_0']);                              // H2_down (8,2) - 8 tiles long!

        this.buildRoomByTiles(2, 4, 1, 7, ['N_0', 'S_0']);                              // H3_vert (2,4) - 7 tiles long!
        this.buildRoomByTiles(3, 11, 3, 1, ['W_0', 'E_0']);                             // H3_horiz (3,11)

        this.buildRoomByTiles(14, 4, 1, 7, ['N_0', 'S_0']);                             // H4_vert (14,4) - 7 tiles long!
        this.buildRoomByTiles(10, 11, 4, 1, ['W_0', 'E_0']);                            // H4_horiz (10,11)

        this.buildRoomByTiles(6, 14, 1, 2, ['N_0', 'S_0']);                             // H_C_down1 (6,14)
        this.buildRoomByTiles(9, 14, 1, 2, ['N_0', 'S_0']);                             // H_C_down2 (9,14)
        this.buildRoomByTiles(7, 16, 2, 1, ['W_0', 'E_0']);                             // H_back (7,16)

        // Player spawns in Room A, aligned with the E_1 exit and looking East
        this.playerSpawn = new THREE.Vector3(6, 1.8, 4);
        this.playerSpawnRotationY = -Math.PI / 2;

        // Monster spawns far away in Room C
        this.monsterSpawn = new THREE.Vector3(30, 2.454, 46); // Root Y so feet rest on floor

        // Goal is in Room B
        this.addTrigger(54, 2, 6, 'GOAL_REACHED');
    }
}
