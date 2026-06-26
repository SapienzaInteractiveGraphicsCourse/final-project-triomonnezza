import * as THREE from 'three';
import { MapBase } from './MapBase.js';

export class MapEasy extends MapBase {
    load() {
        console.log('[MapEasy] Loading Variable-Geometry Map...');

        // 11 zones: Irregular Big Rooms + Connecting Hallways
        
        // Rooms
        this.buildRoomByTiles(0, 0, 4, 3, ['E_1', 'S_1']);         // Room A: 4x3
        this.buildRoomByTiles(6, 0, 4, 4, ['W_1', 'S_0', 'S_2']);  // Room B: 4x4 (3 openings)
        this.buildRoomByTiles(4, 5, 3, 3, ['N_2', 'W_1', 'E_2']);  // Room C: 3x3 (3 openings)
        this.buildRoomByTiles(0, 6, 3, 3, ['N_1', 'E_0']);         // Room D: 3x3
        this.buildRoomByTiles(8, 6, 2, 3, ['W_1', 'N_0']);         // Room E: 2x3

        // Connecting Hallways
        this.buildRoomByTiles(4, 1, 2, 1, ['W_0', 'E_0']);         // H1: connects A and B
        this.buildRoomByTiles(1, 3, 1, 3, ['N_0', 'S_0']);         // H2: connects A and D
        this.buildRoomByTiles(6, 4, 1, 1, ['N_0', 'S_0']);         // H3: connects B and C
        this.buildRoomByTiles(3, 6, 1, 1, ['W_0', 'E_0']);         // H4: connects D and C
        this.buildRoomByTiles(7, 7, 1, 1, ['W_0', 'E_0']);         // H5: connects C and E
        this.buildRoomByTiles(8, 4, 1, 2, ['N_0', 'S_0']);         // H6: connects B and E

        // Player spawns in Room C, looking West towards the W_1 exit
        this.playerSpawn = new THREE.Vector3(20, 1.8, 24);
        this.playerSpawnRotationY = Math.PI / 2;

        // Monster spawns far away in Room B
        this.monsterSpawn = new THREE.Vector3(30, 1.5, 6);

        // Goal is in Room A
        this.addTrigger(6, 2, 4, 'GOAL_REACHED');
    }
}
