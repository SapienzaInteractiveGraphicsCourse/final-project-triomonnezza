import * as THREE from 'three';
import { MapBase } from './MapBase.js';

export class MapHard extends MapBase {
    async load() {
        console.log('[MapHard] Loading Hard Map...');
        await super.load();
        console.log('[MapHard] Loading 100% Asymmetrical, Loop-Only Web...');

        // ── Visual theme (Stone / Brick — dark dungeon feel) ────────
        const BK = {
            floorTile:   'floorStone.glb',
            ceilingTile: 'ceilingConcrete.glb',
            wallTile:    'wallBrick.glb',
            wallDoorTile:'wallDoorBrick.glb',
        };

        const build = (tx, tz, cols, rows, doors) =>
            this.buildRoomByTiles(tx, tz, cols, rows, doors, BK);

        // 31 zones: Completely organic, zero dead ends, massive overlapping loops
        
        // Rooms
        build(0, 0, 3, 3, ['E_1', 'S_1', 'N_0', 'W_1']); // Room A (start)
        build(7, 0, 4, 4, ['W_1', 'S_2', 'E_2', 'N_1']); // B
        build(0, 8, 3, 4, ['N_1', 'E_1', 'E_3', 'S_0']); // C
        build(7, 8, 3, 5, ['N_2', 'W_1', 'E_4', 'W_3']); // D
        build(14, 1, 5, 4, ['W_1', 'S_1', 'S_4', 'E_2']);// E
        build(15, 11, 5, 4, ['N_3', 'N_0', 'W_1', 'S_0', 'S_2']); // F
        build(-2, 17, 5, 3, ['N_2', 'E_1', 'S_3']);      // G
        build(15, 17, 3, 3, ['W_1', 'N_0', 'N_2', 'S_0', 'E_0']); // H (Hub)
        build(0, 24, 4, 4, ['N_1', 'E_2']);              // I (Monster)
        build(14, 25, 3, 3, ['W_1', 'N_1']);             // J
        build(6, -8, 4, 3, ['S_2', 'W_1']);              // K
        build(-2, -9, 3, 4, ['E_2', 'S_2']);             // L
        build(25, 2, 3, 6, ['W_1', 'S_1']);              // M (Goal)
        build(24, 16, 4, 4, ['N_2', 'W_1']);             // N

        // Hallways
        build(3, 1, 4, 1, ['W_0', 'E_0']);               // H1 (A to B)
        build(1, 3, 1, 5, ['N_0', 'S_0']);               // H2 (A to C)
        build(9, 4, 1, 4, ['N_0', 'S_0']);               // H3 (B to D)
        build(3, 9, 4, 1, ['W_0', 'E_0']);               // H8 (C to D)
        build(11, 2, 3, 1, ['W_0', 'E_0']);              // H4 (B to E)
        build(18, 5, 1, 6, ['N_0', 'S_0']);              // H10 (E to F right)
        build(15, 5, 1, 6, ['N_0', 'S_0']);              // H11 (E to F left)
        build(10, 12, 5, 1, ['W_0', 'E_0']);             // H9 (D to F)
        build(3, 11, 4, 1, ['W_0', 'E_0']);              // H5 (C to D)
        build(0, 12, 1, 5, ['N_0', 'S_0']);              // H7 (C to G)
        build(3, 18, 12, 1, ['W_0', 'E_0']);             // H16 (G to H)
        build(15, 15, 1, 2, ['N_0', 'S_0']);             // H18 (F to H left)
        build(17, 15, 1, 2, ['N_0', 'S_0']);             // H19 (F to H right)
        build(1, 20, 1, 4, ['N_0', 'S_0']);              // H17 (G to I)
        build(4, 26, 10, 1, ['W_0', 'E_0']);             // H20 (I to J)
        build(15, 20, 1, 5, ['N_0', 'S_0']);             // H21 (H to J)
        build(8, -5, 1, 5, ['N_0', 'S_0']);              // H12 (K to B)
        build(1, -7, 5, 1, ['W_0', 'E_0']);              // H22 (L to K)
        build(0, -5, 1, 5, ['N_0', 'S_0']);              // H23 (L to A)
        build(19, 3, 6, 1, ['W_0', 'E_0']);              // H13 (E to M)
        build(26, 8, 1, 8, ['N_0', 'S_0']);              // H24 (M to N)
        build(18, 17, 6, 1, ['W_0', 'E_0']);             // H25 (H to N)

        // ── Goal door: parete Ovest di Room A ──
        this.spawnGoalDoor(-2 + 0.15, 4, Math.PI / 2);

        // Player spawns in Room A, looking East towards H1
        this.playerSpawn = new THREE.Vector3(4, 1.8, 4);
        this.playerSpawnRotationY = -Math.PI / 2;

        // Monster spawns in Room I
        this.monsterSpawn = new THREE.Vector3(6, 2.454, 102);

        // ── Chiave: posizionata dove spawna il mostro ────────────────────────
        this.spawnGoalKey(this.monsterSpawn.clone());
    }
}
