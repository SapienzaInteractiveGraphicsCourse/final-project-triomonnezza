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

        const build = (tx, tz, cols, rows, doors) =>
            this.buildRoomByTiles(tx, tz, cols, rows, doors, WP);

        // ── Rooms ──────────────────────────────────────────────────────
        build(0, 0, 4, 3, ['E_1', 'S_1']);               // Room A  Bedroom
        build(6, 0, 4, 4, ['W_1', 'S_0', 'S_2']);        // Room B  Kitchen
        build(4, 5, 3, 3, ['N_2', 'W_1', 'E_2', 'S_1']); // Room C  Living room
        build(0, 6, 3, 3, ['N_1', 'E_0']);               // Room D  Storage
        build(8, 6, 2, 3, ['W_1', 'N_0']);               // Room E  Study/Exit

        // ── Connecting corridors ────────────────────────────────────────
        build(4, 1, 2, 1, ['W_0', 'E_0']);               // H1  A ↔ B
        build(1, 3, 1, 3, ['N_0', 'S_0']);               // H2  A ↔ D
        build(6, 4, 1, 1, ['N_0', 'S_0']);               // H3  B ↔ C
        build(3, 6, 1, 1, ['W_0', 'E_0']);               // H4  D ↔ C
        build(7, 7, 1, 1, ['W_0', 'E_0']);               // H5  C ↔ E
        build(8, 4, 1, 2, ['N_0', 'S_0']);               // H6  B ↔ E

        // ═══════════════════════════════════════════════════════════════
        // ROOM A — BEDROOM
        // Mood: warm, lived-in. Bed against north wall, desk in corner.
        // Ceiling lamp centred. Carpet under bed area.
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp( 6, 4, 5.5, 0.7, 14, 0xffeedd, true); // warm, flickers, dim

        // Bed pushed into NW corner, headboard against north wall
        this.spawnProp('bed.glb',          new THREE.Vector3( 2, 0,  1), 0);
        // Bedside table next to bed
        this.spawnProp('tableSmall3.glb',  new THREE.Vector3( 5, 0,  1), 0);
        this.spawnProp('tableLamp.glb',    new THREE.Vector3( 5, 0,  1), 0);
        // Bookshelf flat against east wall, books visible from entrance
        this.spawnProp('bookshelf.glb',    new THREE.Vector3(13, 0,  2), -Math.PI / 2);
        this.spawnProp('bookStack.glb',    new THREE.Vector3(13, 0,  7), -Math.PI / 2);
        // Rug under the bed area
        this.spawnProp('carpet2.glb',      new THREE.Vector3( 4, 0.01, 4));
        this.spawnProp('trashBin.glb',     new THREE.Vector3( 8, 0,  2));
        this.spawnProp('plant.glb',        new THREE.Vector3( 2, 0,  8));
        this.spawnProp('bookStack2.glb',   new THREE.Vector3( 8, 0,  7));
        // Wall deco: painting above bed (north wall), mirror on west wall
        this.spawnWallProp('painting.glb',  'N',  4,  -2, 0, 2.2);
        this.spawnWallProp('mirror2.glb',   'W', -2,  5, 0, 1.8);
        this.spawnWallProp('painting2.glb', 'N', 12,  -2, 0, 2.2);
        // Wall shelf on east wall above bookshelf
        this.spawnWallProp('wallShelf.glb', 'E', 14,  7, 0, 2.5);

        // ═══════════════════════════════════════════════════════════════
        // ROOM B — KITCHEN / DINING ROOM
        // Mood: domestic, messy. Dining table centred. Cabinets line the west wall.
        // Two ceiling lamps for large room coverage.
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(26, 4,  5.5, 0.6, 12, 0xffe8cc);
        this.spawnCeilingLamp(34, 10, 5.5, 0.6, 12, 0xffe8cc, true);

        // Dining table centred in the room, four chairs around it
        this.spawnProp('table.glb',         new THREE.Vector3(30, 0,  6));
        this.spawnProp('chair.glb',         new THREE.Vector3(27, 0,  6),  Math.PI / 2);
        this.spawnProp('chair.glb',         new THREE.Vector3(33, 0,  6), -Math.PI / 2);
        this.spawnProp('chair.glb',         new THREE.Vector3(30, 0,  3),  Math.PI);
        this.spawnProp('chair.glb',         new THREE.Vector3(30, 0,  9));
        // Cabinet row along west wall — kitchen appliances feel
        this.spawnProp('cabinetSink.glb',   new THREE.Vector3(23, 0,  2));
        this.spawnProp('cabinetLow.glb',    new THREE.Vector3(23, 0,  6));
        this.spawnProp('cabinetHigh.glb',   new THREE.Vector3(23, 0, 10));
        // Fridge in NE corner
        this.spawnProp('fridge.glb',        new THREE.Vector3(36, 0,  1),  Math.PI);
        // Rubbish bin near cabinets
        this.spawnProp('trashBin.glb',      new THREE.Vector3(25, 0, 12));
        // Radio on top of low cabinet (slightly raised)
        this.spawnProp('radio.glb',         new THREE.Vector3(23, 0,  6));
        // Plant in SE corner
        this.spawnProp('plant.glb',         new THREE.Vector3(36, 0, 13));
        this.spawnProp('plant2.glb',        new THREE.Vector3(25, 0, 13));
        this.spawnProp('carpet.glb',        new THREE.Vector3(30, 0.01, 6));
        this.spawnProp('bucket.glb',        new THREE.Vector3(36, 0,  4));
        // Wall deco
        this.spawnWallProp('painting2.glb', 'N', 30,  -2, 0, 2.2);
        this.spawnWallProp('painting3.glb', 'S', 36,  14, 0, 2.0);
        this.spawnWallProp('clock.glb',     'E', 38,   4, 0, 2.3);

        // ═══════════════════════════════════════════════════════════════
        // ROOM C — LIVING ROOM
        // Mood: comfortable. Sofa facing TV, coffee table between them.
        // Ceiling lamp centred, floor lamp in corner.
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(20, 24, 5.5, 0.8, 14, 0xfff0cc, Math.random() > 0.5);

        // Sofa against south wall facing north (toward TV)
        this.spawnProp('couchBig.glb',      new THREE.Vector3(20, 0, 28));
        // Coffee table in front of sofa
        this.spawnProp('tableSmall2.glb',   new THREE.Vector3(20, 0, 25));
        // TV mounted on north wall, facing south (toward sofa)
        this.spawnWallProp('tv.glb',        'N', 20, 18, 0, 1.3);
        // Sideboard below TV, against north wall
        this.spawnProp('sideboard.glb',     new THREE.Vector3(20, 0, 19));
        // Armchair in east corner, angled toward TV
        this.spawnProp('couchSmall.glb',    new THREE.Vector3(24, 0, 26), -Math.PI / 4);
        // Floor lamp in west corner
        this.spawnProp('lamp.glb',          new THREE.Vector3(15, 0, 28));
        // Plant in east corner
        this.spawnProp('plant2.glb',        new THREE.Vector3(25, 0, 29));
        // Central rug under coffee table / sofa area
        this.spawnProp('carpet.glb',        new THREE.Vector3(20, 0.01, 26));
        this.spawnProp('bookStack.glb',     new THREE.Vector3(21, 0.5, 25)); // on table
        this.spawnProp('plant.glb',         new THREE.Vector3(15, 0, 20));
        this.spawnProp('trashBin.glb',      new THREE.Vector3(16, 0, 28));
        // Wall deco: painting above TV
        this.spawnWallProp('painting4.glb', 'N', 20, 18, 0, 2.4);
        this.spawnWallProp('painting.glb',  'W', 14, 24, 0, 2.4);
        // Wall shelf on east wall
        this.spawnWallProp('wallShelf2.glb','E', 26, 22, 0, 1.8);

        // ═══════════════════════════════════════════════════════════════
        // ROOM D — BATHROOM
        // Mood: cramped, creepy apartment bathroom. Sink, mirror, toilet.
        // Single dim ceiling lamp.
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp( 4, 28, 5.5, 0.5, 10, 0xffddc0, true);

        // Toilet in the NW corner, facing east
        this.spawnProp('toilet.glb',        new THREE.Vector3( 0, 0, 24), Math.PI / 2);
        this.spawnProp('toiletPaper.glb',   new THREE.Vector3( 0, 0, 26), Math.PI / 2);

        // Sink on the west wall, further south
        this.spawnProp('bathroomSink.glb',  new THREE.Vector3(-1, 0, 30), Math.PI / 2);
        this.spawnWallProp('mirror.glb',    'W', -2, 30, 0, 1.9);

        // Bathtub or shower? We don't have one, so let's put a radiator and mop bucket
        this.spawnProp('radiator.glb',      new THREE.Vector3( 9, 0, 26), -Math.PI / 2);
        this.spawnProp('bucket.glb',        new THREE.Vector3( 8, 0, 33));
        this.spawnProp('broom.glb',         new THREE.Vector3( 9, 0, 33));

        // Trash bin and bath mat
        this.spawnProp('trashBin.glb',      new THREE.Vector3( 2, 0, 33));
        this.spawnProp('carpet2.glb',       new THREE.Vector3( 3, 0.01, 28));

        // Wall shelf with some random items (we'll just place a shelf)
        this.spawnWallProp('wallShelf.glb', 'E', 10, 30, 0, 1.7);
        this.spawnWallProp('breakerBox.glb','N',  4, 22, 0, 1.5, 0.2);

        // ═══════════════════════════════════════════════════════════════
        // ROOM E — STUDY / EXIT ROOM
        // Mood: scholarly but eerie — the key is here, and the goal door.
        // Single focused ceiling lamp, desk with books, armchair.
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(34, 28, 5.5, 0.8, 11, 0xffeedd, Math.random() > 0.5);

        // Desk against north wall with chair
        this.spawnProp('table2.glb',        new THREE.Vector3(34, 0, 24));
        this.spawnProp('chair2.glb',        new THREE.Vector3(34, 0, 26),  Math.PI);
        this.spawnProp('tableLamp.glb',     new THREE.Vector3(35, 0, 23));
        this.spawnProp('bookStack.glb',     new THREE.Vector3(32, 0, 23));
        // Bookshelf against east wall
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(37, 0, 28), -Math.PI / 2);
        // Sideboard / dresser against south wall
        this.spawnProp('sideboard2.glb',    new THREE.Vector3(32, 0, 33));
        // Plant in corner
        this.spawnProp('plant.glb',         new THREE.Vector3(37, 0, 33));
        this.spawnProp('plant2.glb',        new THREE.Vector3(30, 0, 23));
        this.spawnProp('carpet2.glb',       new THREE.Vector3(34, 0.01, 26));
        this.spawnProp('trashBin.glb',      new THREE.Vector3(37, 0, 24));
        // Wall mirror on north wall
        this.spawnWallProp('mirror.glb',    'N', 34, 22, 0, 1.9);
        // Painting on east wall
        this.spawnWallProp('painting3.glb', 'E', 38, 26, 0, 2.0);

        // ═══════════════════════════════════════════════════════════════
        // CORRIDORS — minimal lamps to keep tension, one per corridor
        // ═══════════════════════════════════════════════════════════════
        // H1 (A ↔ B) — cx=18, cz=6   bounds x[14,22] z[2,10]
        this.spawnCeilingLamp(18, 6, 5.5, 0.6, 8, 0xffeedd);
        this.spawnProp('plant.glb', new THREE.Vector3(18, 0, 9));

        // H2 (A ↔ D) — long vertical, cx=6, cz=18  bounds x[2,10] z[10,22]
        this.spawnCeilingLamp( 6, 14, 5.5, 0.5, 7, 0xffe8cc, true);
        this.spawnCeilingLamp( 6, 20, 5.5, 0.5, 7, 0xffe8cc);
        this.spawnWallProp('painting.glb', 'E', 10, 16, 0, 2.0);

        // H6 (B ↔ E) — cx=34, cz=16  bounds x[30,38] z[14,22]
        this.spawnCeilingLamp(34, 18, 5.5, 0.6, 7, 0xffeedd, true);

        // ── Goal door: South wall of Room C ────────────────────────────
        this.spawnGoalDoor(20, 30 - 0.15, Math.PI);

        // ── Spawns ─────────────────────────────────────────────────────
        this.playerSpawn          = new THREE.Vector3( 6, 1.8,  4);
        this.playerSpawnRotationY = Math.PI / 2;
        this.monsterSpawn         = new THREE.Vector3(30, 2.454, 6);
        this.spawnGoalKey(this.monsterSpawn.clone());
    }
}
