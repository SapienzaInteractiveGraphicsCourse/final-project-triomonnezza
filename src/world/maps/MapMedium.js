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

        const build = (tx, tz, cols, rows, doors, flickers = false, lampColor = 0xfff4cc) => {
            this.buildRoomByTiles(tx, tz, cols, rows, doors, TM);
            const cx = tx * 4 + cols * 2 - 2;
            const cz = tz * 4 + rows * 2 - 2;
        };

        // Massive Halls (4×4)
        build(0, 0, 4, 4, ['E_1', 'S_2'], true);                            // R_A (Removed W_1 which points outside)
        build(12, 0, 4, 4, ['W_1', 'S_2'], true);                            // R_B
        build(6, 10, 4, 4, ['N_2', 'W_1', 'E_1', 'S_0', 'S_3']);      // R_C

        // Junctions (1×1 closets)
        build(8, 1, 1, 1, ['W_0', 'E_0', 'S_0']);                     // J_1
        build(2, 11, 1, 1, ['N_0', 'E_0']);                            // J_2
        build(14, 11, 1, 1, ['N_0', 'W_0']);                           // J_3
        build(6, 16, 1, 1, ['N_0', 'E_0']);                            // J_4
        build(9, 16, 1, 1, ['N_0', 'W_0']);                            // J_5

        // Long hallways
        build(4, 1, 4, 1, ['W_0', 'E_0']);                             // H1_left
        build(9, 1, 3, 1, ['W_0', 'E_0']);                             // H1_right
        build(8, 2, 1, 8, ['N_0', 'S_0'], true);                             // H2_down (8 tiles!)
        build(2, 4, 1, 7, ['N_0', 'S_0']);                             // H3_vert (7 tiles!)
        build(3, 11, 3, 1, ['W_0', 'E_0']);                            // H3_horiz
        build(14, 4, 1, 7, ['N_0', 'S_0']);                            // H4_vert (7 tiles!)
        build(10, 11, 4, 1, ['W_0', 'E_0']);                           // H4_horiz
        build(6, 14, 1, 2, ['N_0', 'S_0']);                            // H_C_down1
        build(9, 14, 1, 2, ['N_0', 'S_0']);                            // H_C_down2
        build(7, 16, 2, 1, ['W_0', 'E_0']);                            // H_back


        // ===========================================================
        // ROOM A - WAITING ROOM
        // Mood: old public building. Chairs against south wall, desk against east.
        // bounds x[-2,14]  z[-2,14]
        // Doors: E_1 (east row 1 -> z~6), S_2 (south col 2 -> x~10)
        // Goal door: west wall x=-2 at z~6 -- keep west wall z[4,8] clear of floor items!
        // ===========================================================

        // Reception desk against east wall (x=14). E_1 door at z~6 -- desk at z=2 is safe
        this.spawnProp('table2.glb',        new THREE.Vector3(12.5, 0,  2));
        this.spawnProp('chair2.glb',        new THREE.Vector3(10.5, 0,  2), -Math.PI / 2);
        this.spawnProp('phone.glb',         new THREE.Vector3(12.5, 1.16,  1.5));
        this.spawnProp('tableLamp.glb',     new THREE.Vector3(12.5, 1.16,  2.5));
        this.spawnProp('trashBin.glb',      new THREE.Vector3(12.5, 0,  4.5));

        // Waiting chairs against south wall (z=14). S_2 door at x~10 -- skip x[8,12]; place at x=2,5,7
        this.spawnProp('chair.glb',         new THREE.Vector3( 1.5, 0, 12.5), Math.PI);
        this.spawnProp('chair.glb',         new THREE.Vector3( 4.5, 0, 12.5), Math.PI);
        this.spawnProp('chair.glb',         new THREE.Vector3( 7,   0, 12.5), Math.PI);
        // Side table between chairs
        this.spawnProp('tableSmall3.glb',   new THREE.Vector3( 3,   0, 12),   Math.PI);
        this.spawnProp('bookStack.glb',     new THREE.Vector3( 3,   0.85, 12));

        // Plants in corners clear of doors
        this.spawnProp('plant.glb',         new THREE.Vector3( 0.5, 0,  0.5));   // NW corner
        this.spawnProp('plant2.glb',        new THREE.Vector3( 0.5, 0, 12.5));   // SW corner (x clear of S_2)
        this.spawnProp('trashBag.glb',      new THREE.Vector3(12.5, 0, 11));
        this.spawnProp('carpet.glb',        new THREE.Vector3( 6, 0.01, 7));

        // Wall deco: painting on north wall (no north door); clock on east wall above E_1 door
        this.spawnWallProp('painting.glb',  'N',  4,  -2, 0, 2.2);
        this.spawnWallProp('clock.glb',     'E', 14,  10, 0, 2.4);
        // TV on south wall between chairs, clear of S_2 door (x~10)
        this.spawnWallProp('tv.glb',        'S',  4,  14, 0, 1.4);

        // ===========================================================
        // ROOM B - ADMINISTRATIVE OFFICE
        // Mood: bureaucratic. Desks against east and north walls, filing
        // cabinets along north wall, bookshelf against east wall.
        // bounds x[46,62]  z[-2,14]
        // Doors: W_1 (west row 1 -> z~6), S_2 (south col 2 -> x~54)
        // ===========================================================

        // Desks against north wall (z=-2). W_1 door at z~6 is on west wall, not north.
        // S_2 door at x~54 (avoid x[52,56]) -- place desks at x=50 and x=58
        this.spawnProp('table2.glb',        new THREE.Vector3(50, 0,  0.5));
        this.spawnProp('chair2.glb',        new THREE.Vector3(50, 0,  2.5),  Math.PI);
        this.spawnProp('phone.glb',         new THREE.Vector3(50, 1.16, -0.2));
        this.spawnProp('table2.glb',        new THREE.Vector3(58, 0,  0.5));
        this.spawnProp('chair2.glb',        new THREE.Vector3(58, 0,  2.5),  Math.PI);
        this.spawnProp('phone.glb',         new THREE.Vector3(58, 1.16, -0.2));

        // Filing cabinets along west part of north wall (x[46,52]), clear of desks
        // W_1 door at z~6 is on west wall -- cabinets on north wall are fine
        this.spawnProp('cabinet.glb',       new THREE.Vector3(47.5, 0,  0));
        this.spawnProp('cabinet.glb',       new THREE.Vector3(61,   0,  0));

        // Bookshelf against east wall (x=62). E_1 is not a door here -- safe
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(61, 0,  8), -Math.PI / 2);
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(61, 0, 12), -Math.PI / 2);

        // Trash bins beside each desk
        this.spawnProp('trashBin.glb',      new THREE.Vector3(47.5, 0,  2));
        this.spawnProp('trashBin.glb',      new THREE.Vector3(60.5, 0,  2));

        // Book stacks against south wall (z=14). S_2 door at x~54 (gap x[52,56])
        // Place stacks at x=48 and x=59 -- both clear
        this.spawnProp('bookStack.glb',     new THREE.Vector3(48, 0, 12.5));
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(59, 0, 12.5));

        // Rug between the two desk clusters
        this.spawnProp('carpet2.glb',       new THREE.Vector3(54, 0.01, 7), Math.PI/2);

        // Wall deco: painting on north wall between the two desks
        this.spawnWallProp('painting2.glb', 'N', 54,  -2, 0, 2.2);
        // Mirror on east wall above bookshelf area
        this.spawnWallProp('mirror.glb',    'E', 62,   6, 0, 1.9);

        // ===========================================================
        // ROOM C - STAFF ROOM / BREAK ROOM
        // Mood: abandoned staff lounge. Sofa against west wall, dining table
        // in east section, sideboard against east wall.
        // bounds x[22,38]  z[38,54]
        // Doors: N_2 (north col 2 -> x~30), W_1 (west row 1 -> z~46),
        //        E_1 (east row 1 -> z~46), S_0 (south col 0 -> x~26), S_3 (south col 3 -> x~34)
        // ===========================================================

        // Sofa against west wall (x=22), facing east. W_1 door at z~46 (gap z[44,48])
        // -- place sofa at z=41 (above door) and armchair at z=51 (below door)
        this.spawnProp('couchBig.glb',      new THREE.Vector3(23.5, 0, 41),  Math.PI / 2);
        this.spawnProp('couchSmall2.glb',   new THREE.Vector3(23.5, 0, 51),  Math.PI / 2);
        // Coffee table in front of sofa (inward)
        this.spawnProp('tableSmall.glb',    new THREE.Vector3(26, 0, 41));
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(26, 0.7, 41));

        // Rug in front of sofa area
        this.spawnProp('carpet.glb',        new THREE.Vector3(26, 0.01, 41));

        // Dining table in east section. E_1 door at z~46 -- table at x=34,z=42 is clear of east wall
        // (table is not against east wall, it's centre-east; chairs around it)
        // Table removed
        // Chair removed
        // Chair removed
        // Chair removed
        // Chair removed

        // Sideboard against east wall (x=38). E_1 door at z~46 -- place at z=40 and z=52
        this.spawnProp('sideboard.glb',     new THREE.Vector3(37, 0, 40));
        this.spawnProp('sideboard2.glb',    new THREE.Vector3(37, 0, 52));
        // Radio on sideboard
        this.spawnProp('radio.glb',         new THREE.Vector3(37, 1.31, 40));

        // Plants in corners. N_2 door at x~30, S_0 at x~26, S_3 at x~34
        // NW corner (x=22.5, z=38.5) -- clear of N_2 (x~30) and W_1 (z~46)
        this.spawnProp('plant2.glb',        new THREE.Vector3(23, 0, 39));
        // SE corner (x=37, z=53.5) -- clear of S_3 (x~34) and E_1 (z~46)
        this.spawnProp('plant.glb',         new THREE.Vector3(37, 0, 53));

        // Trash in corners
        this.spawnProp('trashBin.glb',      new THREE.Vector3(23, 0, 53));
        this.spawnProp('trashBag.glb',      new THREE.Vector3(37, 0, 49));

        // Wall deco: painting on north wall between N_2 door gap
        // N_2 at x~30 (gap x[28,32]) -- painting at x=25 is safe
        this.spawnWallProp('painting3.glb', 'N', 25, 38, 0, 2.2);
        // Painting on south wall between S_0 and S_3 doors -- x=30 is midpoint gap
        this.spawnWallProp('painting4.glb', 'S', 30, 54, 0, 2.2);
        // TV on west wall above sofa -- W_1 door at z~46, TV at z=41 is safe
        this.spawnWallProp('tv.glb',        'W', 22, 41, 0, 1.4);

        // ===========================================================
        // JUNCTIONS - small utility closets
        // ===========================================================
        // J_1 (broom closet): cx=34, cz=4  bounds x[32,36] z[2,6]
        // Broom and bucket against north wall, clear of E/W doors
        this.spawnProp('broom.glb',         new THREE.Vector3(34,   0,  2.5));
        this.spawnProp('bucket.glb',        new THREE.Vector3(35.5, 0,  2.5));

        // J_2: cx=8, cz=44  bounds x[6,10] z[42,46]
        // Boxes against north wall (z=42). N_0 door opens from north -- keep centre clear; push to corners
        this.spawnProp('box.glb',           new THREE.Vector3( 6.5, 0, 42.5));
        this.spawnProp('box2.glb',          new THREE.Vector3( 9,   0, 45.5));

        // J_3: cx=56, cz=44  bounds x[54,58] z[42,46]
        // Ladder against east wall, trash bag against south wall
        this.spawnProp('ladder.glb',        new THREE.Vector3(57, 0, 44));
        this.spawnProp('trashBag.glb',      new THREE.Vector3(55, 0, 45.5));

        // ===========================================================
        // HALLWAYS - lamps + wall radiators
        // ===========================================================
        // H1 corridor (A->B): H1_left cx=18,cz=6  H1_right cx=42,cz=6

        // H2_down (8 tiles N-S): x[30,38] z[6,38]
        // Radiators on west wall of H2
        this.spawnWallProp('radiator.glb',   'W', 30, 10, 0, 0.3, 0.3);
        this.spawnWallProp('radiator.glb',   'W', 30, 22, 0, 0.3, 0.3);
        this.spawnWallProp('radiator.glb',   'W', 30, 34, 0, 0.3, 0.3);
        this.spawnWallProp('breakerBox.glb', 'E', 38, 14, 0, 1.4, 0.2);
        // Trash bag against east wall, not blocking corridor centre
        this.spawnProp('trashBag.glb',       new THREE.Vector3(37, 0, 20));

        // H3_vert (7 tiles N-S): x[6,14] z[14,42]
        this.spawnWallProp('radiator.glb',   'E', 14, 20, 0, 0.3, 0.3);
        this.spawnWallProp('radiator.glb',   'E', 14, 32, 0, 0.3, 0.3);
        // Box against west wall (not blocking centre)
        this.spawnProp('box.glb',            new THREE.Vector3( 7, 0, 30));

        // H4_vert (7 tiles N-S): x[54,62] z[14,42]
        this.spawnWallProp('radiator.glb',   'W', 54, 20, 0, 0.3, 0.3);
        this.spawnWallProp('radiator.glb',   'W', 54, 32, 0, 0.3, 0.3);

        // H3_horiz (3 tiles E-W): x[10,22] z[42,46]

        // H4_horiz (4 tiles E-W): x[38,54] z[42,46]

        this.spawnWallProp('radiator.glb',   'W', 54, 20, 0, 0.3, 0.3);
        this.spawnWallProp('radiator.glb',   'W', 54, 32, 0, 0.3, 0.3);

        // H3_horiz (3 tiles E-W): x[10,22] z[42,46]

        // H4_horiz (4 tiles E-W): x[38,54] z[42,46]

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

