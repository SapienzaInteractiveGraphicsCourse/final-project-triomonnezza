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

        const build = (tx, tz, cols, rows, doors) =>
            this.buildRoomByTiles(tx, tz, cols, rows, doors, TM);

        // Massive Halls (4×4)
        build(0, 0, 4, 4, ['E_1', 'S_2', 'W_1']);                     // R_A
        build(12, 0, 4, 4, ['W_1', 'S_2']);                            // R_B
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
        build(8, 2, 1, 8, ['N_0', 'S_0']);                             // H2_down (8 tiles!)
        build(2, 4, 1, 7, ['N_0', 'S_0']);                             // H3_vert (7 tiles!)
        build(3, 11, 3, 1, ['W_0', 'E_0']);                            // H3_horiz
        build(14, 4, 1, 7, ['N_0', 'S_0']);                            // H4_vert (7 tiles!)
        build(10, 11, 4, 1, ['W_0', 'E_0']);                           // H4_horiz
        build(6, 14, 1, 2, ['N_0', 'S_0']);                            // H_C_down1
        build(9, 14, 1, 2, ['N_0', 'S_0']);                            // H_C_down2
        build(7, 16, 2, 1, ['W_0', 'E_0']);                            // H_back

        // ── Goal door ─────────────────────────────────────────────────
        this.spawnGoalDoor(-2 + 0.15, 6, Math.PI / 2);

        // ═══════════════════════════════════════════════════════════════
        // ROOM A — WAITING ROOM
        // Mood: old public building waiting area. Rows of chairs, a reception
        // desk in the corner, dying plants. Warm but flickering light.
        // bounds x[-2,14]  z[-2,14]
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp( 4, 4, 5.5, 0.7, 13, 0xfff4cc, true);  // flickers — broken fluorescent
        this.spawnCeilingLamp(10, 10, 5.5, 0.6, 13, 0xfff4cc);

        // Reception desk against east wall
        this.spawnProp('table2.glb',        new THREE.Vector3(12, 0,  4));
        this.spawnProp('chair2.glb',        new THREE.Vector3(10, 0,  4),  Math.PI / 2);
        this.spawnProp('phone.glb',         new THREE.Vector3(12, 0,  3));
        this.spawnProp('tableLamp.glb',     new THREE.Vector3(12, 0,  5));

        // Row of waiting chairs along south wall
        this.spawnProp('chair.glb',         new THREE.Vector3( 2, 0, 12),  Math.PI);
        this.spawnProp('chair.glb',         new THREE.Vector3( 6, 0, 12),  Math.PI);
        this.spawnProp('chair.glb',         new THREE.Vector3(10, 0, 12),  Math.PI);
        
        // Small table between chairs with books on it
        this.spawnProp('tableSmall3.glb',   new THREE.Vector3( 4, 0, 11),  Math.PI);
        this.spawnProp('bookStack.glb',     new THREE.Vector3( 4, 0.6, 11)); 

        // Dead/dying plant in NW corner
        this.spawnProp('plant.glb',         new THREE.Vector3( 0, 0,  0));
        this.spawnProp('plant2.glb',        new THREE.Vector3(12, 0, 10)); // Near reception
        
        // Trash bin near reception
        this.spawnProp('trashBin.glb',      new THREE.Vector3(12, 0, 12));
        this.spawnProp('trashBag.glb',      new THREE.Vector3( 0, 0,  8));
        this.spawnProp('carpet.glb',        new THREE.Vector3( 6, 0.01, 6)); // Old waiting rug
        
        // Wall: painting + clock on north wall (reception backdrop)
        this.spawnWallProp('painting.glb',  'N',  6,  -2, 0, 2.2);
        this.spawnWallProp('clock.glb',     'E', 14,   2, 0, 2.4);
        // Wall TV on the West wall for waiting patients
        this.spawnWallProp('tv.glb',        'W', -2,  6, 0, 1.4);

        // ═══════════════════════════════════════════════════════════════
        // ROOM B — ADMINISTRATIVE OFFICE
        // Mood: bureaucratic. Two desks facing each other, filing cabinets,
        // bookshelves lining the walls. Papers everywhere.
        // bounds x[46,62]  z[-2,14]
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(50, 4,  5.5, 0.7, 14, 0xfff4cc);
        this.spawnCeilingLamp(58, 10, 5.5, 0.7, 14, 0xfff4cc, true);

        // Two desks facing each other across the room
        this.spawnProp('table2.glb',        new THREE.Vector3(50, 0,  5));
        this.spawnProp('chair2.glb',        new THREE.Vector3(50, 0,  7),  Math.PI);
        this.spawnProp('table2.glb',        new THREE.Vector3(58, 0,  9));
        this.spawnProp('chair2.glb',        new THREE.Vector3(58, 0,  7),  0);
        this.spawnProp('carpet2.glb',       new THREE.Vector3(54, 0.01, 7), Math.PI/2); // Rug between desks
        
        // Phones on each desk
        this.spawnProp('phone.glb',         new THREE.Vector3(50, 0,  4));
        this.spawnProp('phone.glb',         new THREE.Vector3(58, 0, 10));
        
        // Filing cabinets along north wall
        this.spawnProp('cabinet.glb',       new THREE.Vector3(48, 0,  0));
        this.spawnProp('cabinet.glb',       new THREE.Vector3(52, 0,  0));
        this.spawnProp('cabinetHigh.glb',   new THREE.Vector3(56, 0,  0));
        this.spawnProp('cabinetHigh.glb',   new THREE.Vector3(60, 0,  0));
        
        // Bookshelf against east wall
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(61, 0,  8), -Math.PI / 2);
        
        // Book stacks on cabinets and floor
        this.spawnProp('bookStack.glb',     new THREE.Vector3(48, 0, 12));
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(52, 0, 12));
        this.spawnProp('bookStack.glb',     new THREE.Vector3(54, 0, 6)); // On floor
        
        // Trash bins under desks
        this.spawnProp('trashBin.glb',      new THREE.Vector3(48, 0,  8));
        this.spawnProp('trashBin.glb',      new THREE.Vector3(60, 0,  6));
        
        // Overturned chair and clutter
        this.spawnProp('chair.glb',         new THREE.Vector3(54, 0, 10), Math.PI/3); 
        this.spawnProp('box.glb',           new THREE.Vector3(61, 0,  3));
        this.spawnProp('box2.glb',          new THREE.Vector3(60, 0,  4), Math.PI/4);
        
        // Wall deco: notice board feel
        this.spawnWallProp('painting2.glb', 'N', 54,  -2, 0, 2.2);
        this.spawnWallProp('mirror.glb',    'E', 62,   6, 0, 1.9);

        // ═══════════════════════════════════════════════════════════════
        // ROOM C — STAFF ROOM / BREAK ROOM
        // Mood: abandoned staff lounge. Sofa, tables, radio, old carpet.
        // Monster key is here. Three lamps for a large room.
        // bounds x[22,38]  z[38,54]
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(26, 42, 5.5, 0.6, 13, 0xfff4cc);
        this.spawnCeilingLamp(34, 50, 5.5, 0.6, 13, 0xfff4cc, true);
        this.spawnCeilingLamp(30, 46, 5.5, 0.5, 10, 0xfff4cc, Math.random() > 0.5);

        // Central rug and sofa cluster against west wall
        this.spawnProp('carpet.glb',        new THREE.Vector3(26, 0.01, 46));
        this.spawnProp('couchBig.glb',      new THREE.Vector3(24, 0, 44),  Math.PI / 2);
        this.spawnProp('couchSmall2.glb',   new THREE.Vector3(24, 0, 50),  Math.PI / 2);
        
        // Coffee table in front of sofa
        this.spawnProp('tableSmall.glb',    new THREE.Vector3(27, 0, 46));
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(27, 0.4, 46)); // On coffee table
        
        // Dining table in east section
        this.spawnProp('table.glb',         new THREE.Vector3(34, 0, 46));
        this.spawnProp('chair3.glb',        new THREE.Vector3(31, 0, 46),  Math.PI / 2);
        this.spawnProp('chair3.glb',        new THREE.Vector3(37, 0, 46), -Math.PI / 2);
        this.spawnProp('chair3.glb',        new THREE.Vector3(34, 0, 43),  Math.PI);
        this.spawnProp('chair3.glb',        new THREE.Vector3(34, 0, 49),  0);
        
        // Sideboard against east wall
        this.spawnProp('sideboard.glb',     new THREE.Vector3(37, 0, 40));
        this.spawnProp('sideboard2.glb',    new THREE.Vector3(37, 0, 52));
        
        // Radio and plant on sideboards
        this.spawnProp('radio.glb',         new THREE.Vector3(37, 0, 40));
        this.spawnProp('plant.glb',         new THREE.Vector3(37, 0, 52));

        // Plants in corners
        this.spawnProp('plant2.glb',        new THREE.Vector3(23, 0, 39));
        
        // Trash bin and bags
        this.spawnProp('trashBin.glb',      new THREE.Vector3(23, 0, 53));
        this.spawnProp('trashBag.glb',      new THREE.Vector3(24, 0, 40));
        this.spawnProp('trashBag.glb',      new THREE.Vector3(36, 0, 40));
        this.spawnProp('box.glb',           new THREE.Vector3(24, 0, 42));
        
        // Wall deco
        this.spawnWallProp('painting3.glb', 'N', 28, 38, 0, 2.2);
        this.spawnWallProp('painting4.glb', 'S', 34, 54, 0, 2.2);
        this.spawnWallProp('tv.glb',        'W', 22, 44, 0, 1.4);

        // ═══════════════════════════════════════════════════════════════
        // JUNCTIONS — small utility closets
        // ═══════════════════════════════════════════════════════════════
        // J_1 (broom closet): cx=34, cz=6  bounds x[32,36] z[2,6]
        this.spawnCeilingLamp(34, 4, 5.5, 0.8, 5, 0xfff4cc, true);   // very dim, flickers
        this.spawnProp('broom.glb',         new THREE.Vector3(33, 0,  3));
        this.spawnProp('bucket.glb',        new THREE.Vector3(35, 0,  3));

        // J_2: cx=10, cz=46  bounds x[6,14] z[42,46]
        this.spawnCeilingLamp(10, 44, 5.5, 0.9, 5, 0xfff4cc);
        this.spawnProp('box.glb',           new THREE.Vector3( 8, 0, 43));
        this.spawnProp('box2.glb',          new THREE.Vector3(12, 0, 45), Math.PI / 4);

        // J_3 (tx=14,tz=11, 1×1): cx=56, cz=44  bounds x[54,58] z[42,46]
        this.spawnCeilingLamp(56, 44, 5.5, 0.9, 5, 0xfff4cc, true);
        this.spawnProp('trashBag.glb',      new THREE.Vector3(56, 0, 43));
        this.spawnProp('ladder.glb',        new THREE.Vector3(56, 0, 45));

        // ═══════════════════════════════════════════════════════════════
        // HALLWAYS — one lamp every ~8m with wall radiators for atmosphere
        // ═══════════════════════════════════════════════════════════════
        // H1 corridor (A ↔ B): cx=18, cz=6   bounds x[14,34] z[2,10]
        // H1_left: cx=18,cz=6  H1_right: cx=42,cz=6
        this.spawnCeilingLamp(18, 6, 5.5, 0.6, 9, 0xfff4cc);
        this.spawnCeilingLamp(42, 6, 5.5, 0.6, 9, 0xfff4cc, true);

        // H2_down (8 tiles N-S): x[30,38] z[6,38] — lamp every 2 tiles
        this.spawnCeilingLamp(34, 10, 5.5, 0.5, 9, 0xfff4cc, true);
        this.spawnCeilingLamp(34, 18, 5.5, 0.5, 9, 0xfff4cc);
        this.spawnCeilingLamp(34, 26, 5.5, 0.5, 9, 0xfff4cc, true);
        this.spawnCeilingLamp(34, 34, 5.5, 0.5, 9, 0xfff4cc);
        // Radiators on west wall
        this.spawnWallProp('radiator.glb',   'W', 30, 10, 0, 0.3, 0.3);
        this.spawnWallProp('radiator.glb',   'W', 30, 22, 0, 0.3, 0.3);
        this.spawnWallProp('radiator.glb',   'W', 30, 34, 0, 0.3, 0.3);
        this.spawnWallProp('breakerBox.glb', 'E', 38, 14, 0, 1.4, 0.2);
        this.spawnProp('trashBag.glb',       new THREE.Vector3(37, 0, 20));

        // H3_vert (7 tiles N-S): x[6,14] z[14,42]
        this.spawnCeilingLamp(10, 18, 5.5, 0.5, 9, 0xfff4cc);
        this.spawnCeilingLamp(10, 26, 5.5, 0.5, 9, 0xfff4cc, true);
        this.spawnCeilingLamp(10, 34, 5.5, 0.5, 9, 0xfff4cc);
        this.spawnWallProp('radiator.glb',   'E', 14, 20, 0, 0.3, 0.3);
        this.spawnWallProp('radiator.glb',   'E', 14, 32, 0, 0.3, 0.3);
        this.spawnProp('box.glb',            new THREE.Vector3( 7, 0, 30));

        // H4_vert (7 tiles N-S): x[54,62] z[14,42]
        this.spawnCeilingLamp(58, 18, 5.5, 0.5, 9, 0xfff4cc, true);
        this.spawnCeilingLamp(58, 26, 5.5, 0.5, 9, 0xfff4cc);
        this.spawnCeilingLamp(58, 34, 5.5, 0.5, 9, 0xfff4cc, true);
        this.spawnWallProp('radiator.glb',   'W', 54, 20, 0, 0.3, 0.3);
        this.spawnWallProp('radiator.glb',   'W', 54, 32, 0, 0.3, 0.3);

        // H3_horiz (3 tiles E-W): x[10,22] z[42,46]
        this.spawnCeilingLamp(16, 44, 5.5, 0.5, 8, 0xfff4cc);

        // H4_horiz (4 tiles E-W): x[38,54] z[42,46]
        this.spawnCeilingLamp(46, 44, 5.5, 0.5, 8, 0xfff4cc, true);

        // ── Spawns ─────────────────────────────────────────────────────
        this.playerSpawn          = new THREE.Vector3( 6, 1.8,  4);
        this.playerSpawnRotationY = -Math.PI / 2;
        this.monsterSpawn         = new THREE.Vector3(30, 2.454, 46);
        this.spawnGoalKey(this.monsterSpawn.clone());
    }
}
