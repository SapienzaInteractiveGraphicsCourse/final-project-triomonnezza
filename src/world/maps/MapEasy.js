import * as THREE from 'three';
import { MapBase } from './MapBase.js';

/**
 * MapEasy — Wood-floor + wallpaper theme.
 *
 * The texture is applied directly to the BoxGeometry walls/floor/ceiling
 * via buildRoomByTiles(…, theme) — no floating overlay tiles.
 *
 * Room layout (tile coords, tileSize = 4 m):
 *   Room A  (0,0) 4×3   entrance room
 *   Room B  (6,0) 4×4   junction / monster start
 *   Room C  (4,5) 3×3   central hub
 *   Room D  (0,6) 3×3   side room
 *   Room E  (8,6) 2×3   goal room
 *   H1–H6              connecting corridors
 */
export class MapEasy extends MapBase {
    load() {
        console.log('[MapEasy] Loading Decorated Map...');

        // ── Visual theme ─────────────────────────────────────────────
        const WP = {
            floorTile:  'floorWood.glb',
            ceilingTile:'ceilingWood.glb',
            wallTile:   'wallWallpaper.glb',
        };

        // ── Helper: one-liner to build + skin each zone ───────────────
        const build = (tx, tz, cols, rows, doors) =>
            this.buildRoomByTiles(tx, tz, cols, rows, doors, WP);

        // ── Rooms ─────────────────────────────────────────────────────
        build(0, 0, 4, 3, ['E_1', 'S_1']);            // Room A
        build(6, 0, 4, 4, ['W_1', 'S_0', 'S_2']);     // Room B
        build(4, 5, 3, 3, ['N_2', 'W_1', 'E_2']);     // Room C
        build(0, 6, 3, 3, ['N_1', 'E_0']);             // Room D
        build(8, 6, 2, 3, ['W_1', 'N_0']);             // Room E

        // ── Connecting corridors ───────────────────────────────────────
        build(4, 1, 2, 1, ['W_0', 'E_0']);             // H1  A↔B
        build(1, 3, 1, 3, ['N_0', 'S_0']);             // H2  A↔D
        build(6, 4, 1, 1, ['N_0', 'S_0']);             // H3  B↔C
        build(3, 6, 1, 1, ['W_0', 'E_0']);             // H4  D↔C
        build(7, 7, 1, 1, ['W_0', 'E_0']);             // H5  C↔E
        build(8, 4, 1, 2, ['N_0', 'S_0']);             // H6  B↔E

        // ── Props ─────────────────────────────────────────────────────
        // Room A centre ≈ (10, 0,  4)  bounds x[−2,22] z[−2,10]
        this.spawnProp('bed.glb',         new THREE.Vector3( 2, 0,  2));
        this.spawnProp('lamp.glb',        new THREE.Vector3( 2, 0,  6));
        this.spawnProp('bookshelf.glb',   new THREE.Vector3(18, 0,  2), Math.PI / 2);
        this.spawnProp('bookStack.glb',   new THREE.Vector3(16, 0,  2));

        // Room B centre ≈ (30, 0,  6)  bounds x[22,38] z[−2,14]
        this.spawnProp('table.glb',       new THREE.Vector3(30, 0,  6));
        this.spawnProp('chair.glb',       new THREE.Vector3(27, 0,  6),  Math.PI / 2);
        this.spawnProp('chair.glb',       new THREE.Vector3(33, 0,  6), -Math.PI / 2);
        this.spawnProp('cabinet.glb',     new THREE.Vector3(23, 0,  2));
        this.spawnProp('cabinetHigh.glb', new THREE.Vector3(23, 0,  6));
        this.spawnProp('radio.glb',       new THREE.Vector3(36, 0,  2));
        this.spawnProp('clock.glb',       new THREE.Vector3(23, 0, 10), -Math.PI / 2);

        // Room C centre ≈ (22, 0, 26)  bounds x[14,26] z[18,30]
        this.spawnProp('couchSmall.glb',  new THREE.Vector3(20, 0, 24),  Math.PI / 2);
        this.spawnProp('sideboard.glb',   new THREE.Vector3(24, 0, 20));
        this.spawnProp('lamp.glb',        new THREE.Vector3(21, 0, 26));
        this.spawnProp('plant.glb',       new THREE.Vector3(25, 0, 29));

        // Room D centre ≈ ( 4, 0, 30)  bounds x[−2,14] z[22,34]
        this.spawnProp('box.glb',         new THREE.Vector3( 2, 0, 24));
        this.spawnProp('box.glb',         new THREE.Vector3( 4, 0, 24), Math.PI / 3);
        this.spawnProp('box.glb',         new THREE.Vector3( 3, 0, 26), Math.PI / 6);
        this.spawnProp('trashBin.glb',    new THREE.Vector3(10, 0, 26));
        this.spawnProp('bookStack.glb',   new THREE.Vector3(10, 0, 32));

        // Room E centre ≈ (34, 0, 34)  bounds x[30,38] z[22,34]
        this.spawnProp('sideboard.glb',   new THREE.Vector3(31, 0, 24));
        this.spawnProp('plant.glb',       new THREE.Vector3(37, 0, 33));
        this.spawnProp('trashBin.glb',    new THREE.Vector3(37, 0, 24));

        // ── Spawns ────────────────────────────────────────────────────
        this.playerSpawn         = new THREE.Vector3(22, 2.5, 26);
        this.playerSpawnRotationY = Math.PI / 2;
        this.monsterSpawn         = new THREE.Vector3(30, 2.454, 6);

        // Goal trigger in Room E
        this.addTrigger(34, 2, 28, 'GOAL_REACHED');
    }
}
