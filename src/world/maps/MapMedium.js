import * as THREE from 'three';
import { MapBase } from './MapBase.js';

export class MapMedium extends MapBase {
    async load() {
        console.log('[MapMedium] Loading Variable-Geometry Map...');
        await super.load();

        // ── Visual theme (Plaster / Tiles — aged hospital feel) ──────
        const TM = {
            floorTile:   'floorTiles.glb',
            ceilingTile: 'ceilingPlaster.glb',
            wallTile:    'wallPlaster.glb',
            wallDoorTile:'wallDoorPlaster.glb',
        };

        const build = (tx, tz, cols, rows, doors) =>
            this.buildRoomByTiles(tx, tz, cols, rows, doors, TM);

        // 18 zones: Massive Halls + Long claustrophobic hallways + Junctions
        
        // Massive Halls (4x4)
        build(0, 0, 4, 4, ['E_1', 'S_2', 'W_1']); // R_A (0,0)
        build(12, 0, 4, 4, ['W_1', 'S_2']);                             // R_B (12,0)
        build(6, 10, 4, 4, ['N_2', 'W_1', 'E_1', 'S_0', 'S_3']);       // R_C (6,10) - 5 openings!

        // Junctions (1x1 Closets)
        build(8, 1, 1, 1, ['W_0', 'E_0', 'S_0']);                       // J_1 (8,1)
        build(2, 11, 1, 1, ['N_0', 'E_0']);                             // J_2 (2,11)
        build(14, 11, 1, 1, ['N_0', 'W_0']);                            // J_3 (14,11)
        build(6, 16, 1, 1, ['N_0', 'E_0']);                             // J_4 (6,16)
        build(9, 16, 1, 1, ['N_0', 'W_0']);                             // J_5 (9,16)

        // Long Interlocking Hallways
        build(4, 1, 4, 1, ['W_0', 'E_0']);                              // H1_left (4,1)
        build(9, 1, 3, 1, ['W_0', 'E_0']);                              // H1_right (9,1)
        build(8, 2, 1, 8, ['N_0', 'S_0']);                              // H2_down (8,2) - 8 tiles long!

        build(2, 4, 1, 7, ['N_0', 'S_0']);                              // H3_vert (2,4) - 7 tiles long!
        build(3, 11, 3, 1, ['W_0', 'E_0']);                             // H3_horiz (3,11)

        build(14, 4, 1, 7, ['N_0', 'S_0']);                             // H4_vert (14,4) - 7 tiles long!
        build(10, 11, 4, 1, ['W_0', 'E_0']);                            // H4_horiz (10,11)

        build(6, 14, 1, 2, ['N_0', 'S_0']);                             // H_C_down1 (6,14)
        build(9, 14, 1, 2, ['N_0', 'S_0']);                             // H_C_down2 (9,14)
        build(7, 16, 2, 1, ['W_0', 'E_0']);                             // H_back (7,16)

        // ── Goal door: parete Ovest di Room A ──
        this.spawnGoalDoor(-2 + 0.15, 6, Math.PI / 2);

        // Player spawns in Room A, aligned with the E_1 exit and looking East
        this.playerSpawn = new THREE.Vector3(6, 1.8, 4);
        this.playerSpawnRotationY = -Math.PI / 2;

        // Monster spawns far away in Room C
        this.monsterSpawn = new THREE.Vector3(30, 2.454, 46);

        // ── Chiave: posizionata dove spawna il mostro ────────────────────────
        this.spawnGoalKey(this.monsterSpawn.clone());
    }
}
