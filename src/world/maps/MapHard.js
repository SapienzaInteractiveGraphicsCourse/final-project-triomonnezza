import * as THREE from 'three';
import { MapBase } from './MapBase.js';

export class MapHard extends MapBase {
    load() {
        console.log('[MapHard] Loading 100% Asymmetrical, Loop-Only Web...');

        // 31 zones: Completely organic, zero dead ends, massive overlapping loops
        
        // Rooms
        this.buildRoomByTiles(0, 0, 3, 3, ['E_1', 'S_1', 'N_0']);       // A (Spawn)
        this.buildRoomByTiles(7, 0, 4, 4, ['W_1', 'S_2', 'E_2', 'N_1']); // B
        this.buildRoomByTiles(0, 8, 3, 4, ['N_1', 'E_1', 'E_3', 'S_0']); // C
        this.buildRoomByTiles(7, 8, 3, 5, ['N_2', 'W_1', 'E_4', 'W_3']); // D
        this.buildRoomByTiles(14, 1, 5, 4, ['W_1', 'S_1', 'S_4', 'E_2']);// E
        this.buildRoomByTiles(15, 11, 5, 4, ['N_3', 'N_0', 'W_1', 'S_0', 'S_2']); // F
        this.buildRoomByTiles(-2, 17, 5, 3, ['N_2', 'E_1', 'S_3']);      // G
        this.buildRoomByTiles(15, 17, 3, 3, ['W_1', 'N_0', 'N_2', 'S_0', 'E_0']); // H (Hub)
        this.buildRoomByTiles(0, 24, 4, 4, ['N_1', 'E_2']);              // I (Monster)
        this.buildRoomByTiles(14, 25, 3, 3, ['W_1', 'N_1']);             // J
        this.buildRoomByTiles(6, -8, 4, 3, ['S_2', 'W_1']);              // K
        this.buildRoomByTiles(-2, -9, 3, 4, ['E_2', 'S_2']);             // L
        this.buildRoomByTiles(25, 2, 3, 6, ['W_1', 'S_1']);              // M (Goal)
        this.buildRoomByTiles(24, 16, 4, 4, ['N_2', 'W_1']);             // N

        // Hallways
        this.buildRoomByTiles(3, 1, 4, 1, ['W_0', 'E_0']);               // H1 (A to B)
        this.buildRoomByTiles(1, 3, 1, 5, ['N_0', 'S_0']);               // H2 (A to C)
        this.buildRoomByTiles(9, 4, 1, 4, ['N_0', 'S_0']);               // H3 (B to D)
        this.buildRoomByTiles(3, 9, 4, 1, ['W_0', 'E_0']);               // H8 (C to D)
        this.buildRoomByTiles(11, 2, 3, 1, ['W_0', 'E_0']);              // H4 (B to E)
        this.buildRoomByTiles(18, 5, 1, 6, ['N_0', 'S_0']);              // H10 (E to F right)
        this.buildRoomByTiles(15, 5, 1, 6, ['N_0', 'S_0']);              // H11 (E to F left)
        this.buildRoomByTiles(10, 12, 5, 1, ['W_0', 'E_0']);             // H9 (D to F)
        this.buildRoomByTiles(3, 11, 4, 1, ['W_0', 'E_0']);              // H5 (C to D)
        this.buildRoomByTiles(0, 12, 1, 5, ['N_0', 'S_0']);              // H7 (C to G)
        this.buildRoomByTiles(3, 18, 12, 1, ['W_0', 'E_0']);             // H16 (G to H)
        this.buildRoomByTiles(15, 15, 1, 2, ['N_0', 'S_0']);             // H18 (F to H left)
        this.buildRoomByTiles(17, 15, 1, 2, ['N_0', 'S_0']);             // H19 (F to H right)
        this.buildRoomByTiles(1, 20, 1, 4, ['N_0', 'S_0']);              // H17 (G to I)
        this.buildRoomByTiles(4, 26, 10, 1, ['W_0', 'E_0']);             // H20 (I to J)
        this.buildRoomByTiles(15, 20, 1, 5, ['N_0', 'S_0']);             // H21 (H to J)
        this.buildRoomByTiles(8, -5, 1, 5, ['N_0', 'S_0']);              // H12 (K to B)
        this.buildRoomByTiles(1, -7, 5, 1, ['W_0', 'E_0']);              // H22 (L to K)
        this.buildRoomByTiles(0, -5, 1, 5, ['N_0', 'S_0']);              // H23 (L to A)
        this.buildRoomByTiles(19, 3, 6, 1, ['W_0', 'E_0']);              // H13 (E to M)
        this.buildRoomByTiles(26, 8, 1, 8, ['N_0', 'S_0']);              // H24 (M to N)
        this.buildRoomByTiles(18, 17, 6, 1, ['W_0', 'E_0']);             // H25 (H to N)

        // Player spawns in Room A, looking East towards H1
        this.playerSpawn = new THREE.Vector3(4, 1.8, 4);
        this.playerSpawnRotationY = -Math.PI / 2;

        // Monster spawns in Room I
        this.monsterSpawn = new THREE.Vector3(6, 1.5, 102);
        
        // Goal is in Room M
        this.addTrigger(104, 2, 18, 'GOAL_REACHED');
    }
}
