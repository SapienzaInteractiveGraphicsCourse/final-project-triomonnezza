import * as THREE from 'three';
import { MapBase } from './MapBase.js';

/**
 * MapEasy — Cozy domestic apartment, wood floors + wallpaper.
 *
 * Narrative: The player wakes up in a lived-in apartment and must escape.
 * Each room has a clear domestic identity and warm ceiling lamps.
 *
 * Room layout (tile coords, tileSize = 4 m):
 *   Room A  (0,0) 4×3   Bedroom  — bed, wardrobe, desk
 *   Room B  (6,0) 4×4   Kitchen/Dining — table, chairs, cabinets
 *   Room C  (4,5) 3×3   Living room — sofa, TV, carpet, plants
 *   Room D  (0,6) 3×3   Storage / Hallway closet — boxes, shelves
 *   Room E  (8,6) 2×3   Study / Exit room — bookshelf, desk, key door
 *   H1–H6              Connecting corridors
 *
 * World-coord formula: cx = tx*4 + cols*2 - 2,  cz = tz*4 + rows*2 - 2
 *   Room A: cx=6,  cz=4   bounds x[-2,14]   z[-2,10]
 *   Room B: cx=30, cz=6   bounds x[22,38]   z[-2,14]
 *   Room C: cx=20, cz=24  bounds x[14,26]   z[18,30]
 *   Room D: cx=4,  cz=28  bounds x[-2,10]   z[22,34]
 *   Room E: cx=34, cz=28  bounds x[30,38]   z[22,34]
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

        // ── Goal door MUST be registered BEFORE build() calls ──────────────────
        // so that _goalDoorPositions is populated before hinged doors are spawned.
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

        // ── Rooms ──────────────────────────────────────────────────────
        build(0, 0, 4, 3, ['E_1', 'S_1'], true, 0xffeedd, true);               // Room A  Bedroom
        build(6, 0, 4, 4, ['W_1', 'S_0', 'S_2'], false, 0xffeedd, true);        // Room B  Kitchen
        build(4, 5, 3, 3, ['N_2', 'W_1', 'E_2', 'S_1'], Math.random() > 0.5, 0xffeedd, true); // Room C  Living room
        build(0, 6, 3, 3, ['N_1', 'E_0'], false, 0xffeedd, true);               // Room D  Storage
        build(8, 6, 2, 3, ['W_1', 'N_0'], Math.random() > 0.5, 0xffeedd, true);               // Room E  Study/Exit

        // ── Connecting corridors ────────────────────────────────────────
        build(4, 1, 2, 1, ['W_0', 'E_0']);               // H1  A ↔ B
        build(1, 3, 1, 3, ['N_0', 'S_0'], true);               // H2  A ↔ D
        build(6, 4, 1, 1, ['N_0', 'S_0']);               // H3  B ↔ C
        build(3, 6, 1, 1, ['W_0', 'E_0']);               // H4  D ↔ C
        build(7, 7, 1, 1, ['W_0', 'E_0']);               // H5  C ↔ E
        build(8, 4, 1, 2, ['N_0', 'S_0']);               // H6  B ↔ E

        // ═══════════════════════════════════════════════════════
        // ROOM C - LIVING ROOM
        // Room C bounds x[14,26] z[18,30]
        // Doors: N_2, W_1, E_2, S_1. ALL WALLS HAVE DOORS.
        // Rule: Leave empty.
        // ═══════════════════════════════════════════════════════

        // ── Trigger horror (Regista) ──────────────────────────────────
        // Room D (Storage/Hallway closet), cx=4 cz=28 — jumpscare al primo ingresso
        this.addTrigger(4, 2, 28, 'STORAGE_SCARE');

        // ── Spawns ─────────────────────────────────────────────────────
        this.playerSpawn          = new THREE.Vector3( 6, 1.8,  4);
        this.playerSpawnRotationY = Math.PI / 2;
        this.monsterSpawn         = new THREE.Vector3(30, 2.454, 6);
        // Key in Room B (Kitchen) SE corner — open floor, no furniture on top
        this.spawnGoalKey(new THREE.Vector3(35, 1.3, 12));

        // ── Batteria di ricarica torcia (Regista) ─────────────────────
        // 1 batteria su Easy — Room C (Living room), lontana da chiave/spawn
        this.spawnBattery(new THREE.Vector3(16, 0, 20), 'batteria_easy_1');
    }
}

