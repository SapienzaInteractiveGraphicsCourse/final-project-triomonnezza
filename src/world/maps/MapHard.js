import * as THREE from 'three';
import { MapBase } from './MapBase.js';

/**
 * MapHard — Ancient dungeon / abandoned fortress. Stone + brick.
 *
 * Narrative: A cursed stone labyrinth. Each room served a distinct purpose
 * in the fortress's past. Dim orange torchlight. Many flickering lamps.
 *
 * Key room identities:
 *   A  — Guard post (entrance)
 *   B  — Armoury / barracks
 *   C  — Servant quarters / sleeping cells
 *   D  — Interrogation chamber
 *   E  — Council hall / command room
 *   F  — Archives / scriptorium
 *   G  — Undercroft / storage vault
 *   H  — The crossroads hub
 *   I  — Monster lair (former throne room)
 *   J  — Antechamber to the lair
 *   K  — Forgotten upper level
 *   L  — Flooded basement (debris)
 *   M  — Goal room (inner sanctum)
 *   N  — The library wing
 *
 * World-coord formula: cx = tx*4 + cols*2 - 2,  cz = tz*4 + rows*2 - 2
 *   A: cx=4,  cz=4    bounds x[-2,10]   z[-2,10]
 *   B: cx=34, cz=6    bounds x[26,42]   z[-2,14]
 *   C: cx=4,  cz=34   bounds x[-2,10]   z[30,46]  (tx=0,tz=8, 3×4)
 *   D: cx=32, cz=28   bounds x[26,38]   z[28,50]  (tx=7,tz=8, 3×5) — wait: cx=7*4+3*2-2=36, cz=8*4+5*2-2=46
 *   E: cx=64, cz=10   bounds x[54,74]   z[2,18]
 *   F: cx=68, cz=52   bounds x[58,78]   z[42,58]  (tx=15,tz=11, 5×4 → cx=15*4+5*2-2=68, cz=11*4+4*2-2=50)
 *   G: cx=8,  cz=72   bounds x[-8,24]   z[66,78]  (tx=-2,tz=17, 5×3 → cx=-2*4+5*2-2=0, cz=17*4+3*2-2=74)
 *   H: cx=64, cz=72   bounds x[58,74]   z[66,78]  (tx=15,tz=17, 3×3 → cx=64, cz=74)
 *   I: cx=6,  cz=102  bounds x[-2,14]   z[94,110]
 *   J: cx=58, cz=106  bounds x[54,70]   z[98,114] (tx=14,tz=25, 3×3 → cx=56, cz=106) — recalc: 14*4+3*2-2=56+6-2=60
 *   K: cx=30, cz=-14  bounds x[22,38]   z[-22,-6]  (tx=6,tz=-8, 4×3 → cx=6*4+4*2-2=30, cz=-8*4+3*2-2=-26)
 *   L: cx=2,  cz=-20  bounds x[-10,10]  z[-26,-14] (tx=-2,tz=-9, 3×4 → cx=-2*4+3*2-2=0, cz=-9*4+4*2-2=-30)
 *   M: cx=104,cz=18   bounds x[98,110]  z[6,30]
 *   N: cx=98, cz=66   bounds x[90,106]  z[62,78]
 */
export class MapHard extends MapBase {
    async load() {
        console.log('[MapHard] Loading Dungeon Map...');
        await super.load();

        const BK = {
            floorTile:   'floorStone.glb',
            ceilingTile: 'ceilingConcrete.glb',
            wallTile:    'wallBrick.glb',
            wallDoorTile:'wallDoorBrick.glb',
        };

        // ── Goal door MUST be registered BEFORE build() calls ──────────────────
        // so that _goalDoorPositions is populated before hinged doors are spawned.
        this.spawnGoalDoor(-2 + 0.15, 4, Math.PI / 2);

        const build = (tx, tz, cols, rows, doors, flickers = false, lampColor = 0xff8844) => {
            this.buildRoomByTiles(tx, tz, cols, rows, doors, BK);
            const cx = tx * 4 + cols * 2 - 2;
            const cz = tz * 4 + rows * 2 - 2;
            this.spawnCeilingLamp(cx, cz, 5.5, 0.6, Math.max(cols, rows) * 4, lampColor, flickers);
        };

        // Rooms
        build(0, 0, 3, 3, ['E_1', 'S_1', 'N_0', 'W_1']); // A (start)
        build(7, 0, 4, 4, ['W_1', 'S_2', 'E_2', 'N_1']); // B
        build(0, 8, 3, 4, ['N_1', 'E_1', 'E_3', 'S_0']); // C
        build(7, 8, 3, 5, ['N_2', 'W_1', 'E_4', 'W_3']); // D
        build(14, 1, 5, 4, ['W_1', 'S_1', 'S_4', 'E_2']); // E
        build(15, 11, 5, 4, ['N_3', 'N_0', 'W_1', 'S_0', 'S_2']); // F
        build(-2, 17, 5, 3, ['N_2', 'E_1', 'S_3']);      // G
        build(15, 17, 3, 3, ['W_1', 'N_0', 'N_2', 'S_0', 'E_0']); // H (Hub)
        build(0, 24, 4, 4, ['N_1', 'E_2']);               // I (Monster lair)
        build(14, 25, 3, 3, ['W_1', 'N_1']);              // J
        build(6, -8, 4, 3, ['S_2', 'W_1']);               // K
        build(-2, -9, 3, 4, ['E_2', 'S_2']);              // L
        build(25, 2, 3, 6, ['W_1', 'S_1']);               // M (Goal/Sanctum)
        build(24, 16, 4, 4, ['N_2', 'W_1']);              // N

        // Hallways
        build(3, 1, 4, 1, ['W_0', 'E_0']);                // H1 A→B
        build(1, 3, 1, 5, ['N_0', 'S_0']);                // H2 A→C
        build(9, 4, 1, 4, ['N_0', 'S_0']);                // H3 B→D
        build(3, 9, 4, 1, ['W_0', 'E_0']);                // H8 C→D
        build(11, 2, 3, 1, ['W_0', 'E_0']);               // H4 B→E
        build(18, 5, 1, 6, ['N_0', 'S_0']);               // H10 E→F right
        build(15, 5, 1, 6, ['N_0', 'S_0']);               // H11 E→F left
        build(10, 12, 5, 1, ['W_0', 'E_0']);              // H9 D→F
        build(3, 11, 4, 1, ['W_0', 'E_0']);               // H5 C→D
        build(0, 12, 1, 5, ['N_0', 'S_0']);               // H7 C→G
        build(3, 18, 12, 1, ['W_0', 'E_0']);              // H16 G→H
        build(15, 15, 1, 2, ['N_0', 'S_0']);              // H18 F→H left
        build(17, 15, 1, 2, ['N_0', 'S_0']);              // H19 F→H right
        build(1, 20, 1, 4, ['N_0', 'S_0']);               // H17 G→I
        build(4, 26, 10, 1, ['W_0', 'E_0']);              // H20 I→J
        build(15, 20, 1, 5, ['N_0', 'S_0']);              // H21 H→J
        build(8, -5, 1, 5, ['N_0', 'S_0']);               // H12 K→B
        build(1, -7, 5, 1, ['W_0', 'E_0']);               // H22 L→K
        build(0, -5, 1, 5, ['N_0', 'S_0']);               // H23 L→A
        build(19, 3, 6, 1, ['W_0', 'E_0']);               // H13 E→M
        build(26, 8, 1, 8, ['N_0', 'S_0']);               // H24 M→N
        build(18, 17, 6, 1, ['W_0', 'E_0']);              // H25 H→N


        // Dungeon lamp colour: dim orange torchlight
        const TORCH = 0xff8844;
        const TORCH_DIM = 0xee6633;

        // ===========================================================
        // ROOM A - GUARD POST (entrance)
        // Mood: checkpoint. Crates against east wall, overturned chair.
        // bounds x[-2,10]  z[-2,10]
        // Doors: E_1 (east row 1 -> z~4), S_1 (south col 1 -> x~4),
        //        N_0 (north col 0 -> x~2), W_1 (west row 1 -> z~4)
        // Goal door: west wall x=-2 at z~4 -- keep west wall z[2,6] floor clear!
        // ===========================================================

        // Shelves against south wall (z=10). S_1 door at x~4 (gap x[2,6]) -- place at x=8 (east corner)
        this.spawnProp('shelves.glb',       new THREE.Vector3( 8.5, 0,  8.5));
        // Crate stack against east wall (x=10). E_1 door at z~4 (gap z[2,6]) -- place at z=8 (south corner)
        this.spawnProp('box.glb',           new THREE.Vector3( 8.5, 0,  8.5));
        this.spawnProp('box2.glb',          new THREE.Vector3( 7,   0,  9));
        // Chair knocked over near south wall clear of S_1 door
        this.spawnProp('chair3.glb',        new THREE.Vector3( 8,   0,  7),   Math.PI / 3);
        // Trash bin in NE corner (x=8.5, z=0.5) -- N_0 door at x~2, NE corner x=8.5 is safe
        this.spawnProp('trashBin.glb',      new THREE.Vector3( 8.5, 0, -0.5));
        // Breaker box on east wall -- E_1 door at z~4, place at z=0 (north of door)
        this.spawnWallProp('breakerBox.glb','E', 10, -0.5, 0, 1.5, 0.2);
        // Painting on south wall, east of S_1 door opening
        this.spawnWallProp('painting2.glb', 'S',  8, 10, 0, 2.2);

        // ===========================================================
        // ROOM B - ARMOURY / BARRACKS
        // Mood: fortified storage. Shelves against north wall, crates east.
        // bounds x[26,42]  z[-2,14]
        // Doors: W_1 (west row 1 -> z~4), S_2 (south col 2 -> x~34),
        //        E_2 (east row 2 -> z~6), N_1 (north col 1 -> x~34)
        // ===========================================================

        // Shelves against west wall (x=26). W_1 door at z~4 (gap z[2,6])
        // -- shelves at z=0 (north of door) and z=10 (south of door)
        this.spawnProp('shelves.glb',       new THREE.Vector3(27, 0, -0.5));
        this.spawnProp('shelves.glb',       new THREE.Vector3(27, 0, 10.5));
        // Cabinets against north wall (z=-2). N_1 at x~34 (gap x[32,36]) -- place at x=28 and x=40
        this.spawnProp('cabinet.glb',       new THREE.Vector3(28.5, 0, -0.5));
        this.spawnProp('cabinet.glb',       new THREE.Vector3(40,   0, -0.5));
        // Bookshelf against east wall (x=42). E_2 door at z~6 (gap z[4,8]) -- place at z=1 and z=12
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(41, 0,  1), -Math.PI / 2);
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(41, 0, 12), -Math.PI / 2);
        // Crates in SE corner (x=40, z=12). S_2 door at x~34 -- x=40 is safe
        this.spawnProp('box.glb',           new THREE.Vector3(40, 0, 12));
        this.spawnProp('box2.glb',          new THREE.Vector3(38, 0, 12.5), Math.PI / 5);
        // Ladder against south wall (z=14). S_2 door at x~34 (gap x[32,36]) -- place at x=28
        this.spawnProp('ladder.glb',        new THREE.Vector3(28, 0, 12.5));
        // Trash bin and bag against south wall, east corner
        this.spawnProp('trashBin.glb',      new THREE.Vector3(40.5, 0, 12.5));
        this.spawnProp('trashBag.glb',      new THREE.Vector3(27,   0,  7));
        // Wall deco
        this.spawnWallProp('painting3.glb', 'N', 30, -2, 0, 2.2);
        this.spawnWallProp('clock.glb',     'E', 42,  10, 0, 2.4);

        // ===========================================================
        // ROOM C - SERVANT QUARTERS / SLEEPING CELLS
        // Mood: cramped sleeping area. Beds along north and south walls.
        // bounds x[-2,10]  z[30,46]
        // Doors: N_1 (north col 1 -> x~4), E_1 (east row 1 -> z~36),
        //        E_3 (east row 3 -> z~44), S_0 (south col 0 -> x~2)
        // ===========================================================

        // Beds along north wall (z=30). N_1 door at x~4 (gap x[2,6]) -- beds at x=8 (east) and x=0 (west)
        this.spawnProp('bed2.glb',          new THREE.Vector3( 8,   0, 31),  Math.PI);
        this.spawnProp('bed.glb',           new THREE.Vector3(-0.5, 0, 31),  Math.PI);
        // Beds along south wall (z=46). S_0 door at x~2 (gap x[0,4]) -- bed at x=8 only
        this.spawnProp('bed2.glb',          new THREE.Vector3( 8,   0, 44.5), 0);
        // Small table beside each bed
        this.spawnProp('tableSmall3.glb',   new THREE.Vector3( 8,   0, 33.5));
        this.spawnProp('tableLamp.glb',     new THREE.Vector3( 8,   0.85, 33.5));
        // Cabinet against east wall (x=10). E_1 at z~36, E_3 at z~44 -- place at z=32 (between) 
        this.spawnProp('cabinet.glb',       new THREE.Vector3( 9,   0, 32));
        // Plant in NW corner (x=-0.5, z=30) -- N_1 door at x~4, corner x=0 is safe
        this.spawnProp('plant.glb',         new THREE.Vector3(-0.5, 0, 30.5));
        // Broom against west wall (x=-2), mid room -- clear of N and S doors
        this.spawnProp('broom.glb',         new THREE.Vector3(-0.5, 0, 39));
        // Bucket against west wall
        this.spawnProp('bucket.glb',        new THREE.Vector3(-0.5, 0, 41));
        // Wall deco
        this.spawnWallProp('painting.glb',  'W', -2, 38, 0, 2.0);
        this.spawnWallProp('mirror.glb',    'E', 10, 40, 0, 1.9);

        // ===========================================================
        // ROOM D - INTERROGATION CHAMBER
        // Mood: dark and oppressive. Desk and chair against east wall.
        // Sink and cabinet along south wall.
        // bounds x[26,38]  z[28,50]  (from build(7,8,3,5))
        // Doors: N_2 (north col 2 -> x~34), W_1 (west row 1 -> z~34),
        //        E_4 (east row 4 -> z~46), W_3 (west row 3 -> z~42)
        // ===========================================================

        // Desk against east wall (x=38). N_2 door at x~34 on north wall -- desk on east is clear
        // E_4 door at z~46 (gap z[44,48]) -- desk at z=30 is clear (north section)
        this.spawnProp('table2.glb',        new THREE.Vector3(36.5, 0, 31));
        this.spawnProp('chair2.glb',        new THREE.Vector3(34.5, 0, 31),  Math.PI / 2);
        this.spawnProp('tableLamp.glb',     new THREE.Vector3(36.5, 1.16, 30));
        // Interrogation chair in centre of room (moveable furniture, not against wall)
        // Place it south section away from all doors -- x=32, z=40 is centre and clear
        // Interrogation chair removed
        // Cabinet against south wall (z=50). W_3 door at z~42 on west wall -- south wall clear
        this.spawnProp('cabinetLow.glb',    new THREE.Vector3(36, 0, 48.5));
        // Sink against south wall
        this.spawnProp('bathroomSink.glb',  new THREE.Vector3(29, 0, 48.5), -Math.PI / 2);
        // Ladder against west wall (x=26). W_1 at z~34, W_3 at z~42 -- place at z=48 (south corner)
        this.spawnProp('ladder.glb',        new THREE.Vector3(27, 0, 48));
        // Broom against west wall, north corner (z=29) -- W_1 at z~34, broom at z=29 is safe
        this.spawnProp('broom.glb',         new THREE.Vector3(27, 0, 29));
        // Box and trash in corners
        this.spawnProp('box.glb',           new THREE.Vector3(36.5, 0, 49));
        this.spawnProp('trashBin.glb',      new THREE.Vector3(27,   0, 38));
        // Wall deco
        this.spawnWallProp('painting2.glb', 'N', 29, 28, 0, 2.2);
        this.spawnWallProp('breakerBox.glb','E', 38, 38, 0, 1.4, 0.2);

        // ===========================================================
        // ROOM E - COUNCIL HALL / COMMAND ROOM
        // Mood: grand. Long table pushed north, chairs around it. Bookcases on west.
        // bounds x[54,74]  z[2,18]
        // Doors: W_1 (west row 1 -> z~6), S_1 (south col 1 -> x~58),
        //        S_4 (south col 4 -> x~70), E_2 (east row 2 -> z~10)
        // ===========================================================

        // Long council table along north wall (z=2). N wall has no doors.
        // S_1 at x~58, S_4 at x~70. W_1 at z~6. E_2 at z~10.
        // Table centred x=64,z=5 -- chairs on west side (x=57) and east side (x=72) clear of doors
        this.spawnProp('table.glb',         new THREE.Vector3(61, 0, 3.5));
        this.spawnProp('table.glb',         new THREE.Vector3(67, 0, 3.5));
        // Chairs around table -- south side of table (z=7) avoids W_1 (z~6 gap) slightly
        // N side of table at z=3 is fine, S side at z=7 is fine (door gap is z[4,8] but chairs are on south side of table which is at z=5+width~1=z=6, touch the gap edge; push table north)
        // Chair removed  // north of table
        // Chair removed
        this.spawnProp('chair.glb',         new THREE.Vector3(57, 0, 3.5), Math.PI / 2); // west head
        this.spawnProp('chair.glb',         new THREE.Vector3(72, 0, 3.5), -Math.PI / 2); // east head
        // Bookcases against west wall (x=54). W_1 at z~6 (gap z[4,8]) -- place at z=2 and z=13
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(55, 0,  2), Math.PI / 2);
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(55, 0, 13), Math.PI / 2);
        // Sideboard against east wall (x=74). E_2 at z~10 (gap z[8,12]) -- place at z=4 and z=16
        this.spawnProp('sideboard.glb',     new THREE.Vector3(72.5, 0,  4));
        this.spawnProp('sideboard.glb',     new THREE.Vector3(72.5, 0, 15));
        // Books and radio on sideboard
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(72.5, 1.31,  3.5));
        this.spawnProp('radio.glb',         new THREE.Vector3(72.5, 1.31,  4.5));
        // Carpet under table
        this.spawnProp('carpet.glb',        new THREE.Vector3(64, 0.01, 5));
        // Plant in SW corner (x=55, z=16) -- W_1 at z~6, plant at z=16 is safe
        this.spawnProp('plant.glb',         new THREE.Vector3(55, 0, 16));
        // Trash bin in NW corner
        this.spawnProp('trashBin.glb',      new THREE.Vector3(55, 0,  2.5));
        // Wall deco
        this.spawnWallProp('painting3.glb', 'N', 64,  2, 0, 2.4);
        this.spawnWallProp('clock.glb',     'W', 54,  2, 0, 2.4);
        this.spawnWallProp('painting4.glb', 'E', 74, 15, 0, 2.0);

        // ===========================================================
        // ROOM F - ARCHIVES / SCRIPTORIUM
        // Mood: scholarly disorder. Writing desks against north wall,
        // bookshelves against east and south walls.
        // bounds x[58,78]  z[42,58]
        // Doors: N_3 (north col 3 -> x~70), N_0 (north col 0 -> x~60),
        //        W_1 (west row 1 -> z~46), S_0 (south col 0 -> x~60), S_2 (south col 2 -> x~68)
        // ===========================================================

        // Writing desks against east wall (x=78). S_2 at x~68, N_3 at x~70. East wall clear.
        // E_2 is not a door in this room. Place desks at z=44 and z=54
        this.spawnProp('table2.glb',        new THREE.Vector3(76.5, 0, 44));
        this.spawnProp('chair2.glb',        new THREE.Vector3(74.5, 0, 44),  Math.PI / 2);
        this.spawnProp('tableLamp.glb',     new THREE.Vector3(76.5, 1.16, 43.5));
        this.spawnProp('table2.glb',        new THREE.Vector3(76.5, 0, 54));
        this.spawnProp('chair2.glb',        new THREE.Vector3(74.5, 0, 54),  Math.PI / 2);
        // Bookshelves against south wall (z=58). S_0 at x~60 (gap x[58,62]), S_2 at x~68 (gap x[66,70])
        // Place at x=64 (between doors) and x=75 (east of S_2 gap)
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(64, 0, 57), -Math.PI / 2);
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(75, 0, 57), -Math.PI / 2);
        // Shelves against west wall (x=58). W_1 at z~46 (gap z[44,48]) -- place at z=43 and z=54
        this.spawnProp('shelves.glb',       new THREE.Vector3(59.5, 0, 43));
        this.spawnProp('shelves.glb',       new THREE.Vector3(59.5, 0, 54));
        // Book stacks on floor and desks
        this.spawnProp('bookStack.glb',     new THREE.Vector3(76.5, 0, 46));
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(64,   0, 50));
        this.spawnProp('bookStack.glb',     new THREE.Vector3(59.5, 0, 50));
        // Trash bins
        this.spawnProp('trashBin.glb',      new THREE.Vector3(76.5, 0, 56));
        this.spawnProp('trashBag.glb',      new THREE.Vector3(64,   0, 57.5));
        // Wall deco
        this.spawnWallProp('painting4.glb', 'N', 65, 42, 0, 2.2);
        this.spawnWallProp('clock.glb',     'E', 78, 50, 0, 2.4);

        // ===========================================================
        // ROOM G - UNDERCROFT / STORAGE VAULT
        // Mood: underground storage. All crates against walls, ladder in corner.
        // bounds x[-8,24]  z[66,78]
        // Doors: N_2 (north col 2 -> x~4), E_1 (east row 1 -> z~70), S_3 (south col 3 -> x~8)
        // ===========================================================

        // Crates against west wall (x=-8). No doors on west wall -- full row
        this.spawnProp('box.glb',           new THREE.Vector3(-6.5, 0, 68));
        this.spawnProp('box2.glb',          new THREE.Vector3(-6.5, 0, 72),  Math.PI / 5);
        this.spawnProp('box.glb',           new THREE.Vector3(-6.5, 0, 76));
        // Crates against north wall (z=66). N_2 at x~4 (gap x[2,6]) -- place at x=-4 and x=14
        this.spawnProp('box.glb',           new THREE.Vector3(-4,   0, 67));
        this.spawnProp('box2.glb',          new THREE.Vector3(14,   0, 67));
        this.spawnProp('box.glb',           new THREE.Vector3(18,   0, 67));
        // Crates against south wall (z=78). S_3 at x~8 (gap x[6,10]) -- place at x=-4 and x=16
        this.spawnProp('box.glb',           new THREE.Vector3(-4,   0, 77));
        this.spawnProp('box2.glb',          new THREE.Vector3(16,   0, 77),  Math.PI / 4);
        // Ladder against east wall (x=24). E_1 at z~70 (gap z[68,72]) -- ladder at z=74
        this.spawnProp('ladder.glb',        new THREE.Vector3(22.5, 0, 74));
        // Bucket and broom in NW corner
        this.spawnProp('bucket.glb',        new THREE.Vector3(-6.5, 0, 66.5));
        this.spawnProp('broom.glb',         new THREE.Vector3(-5,   0, 66.5));
        // Trash bag against south wall
        this.spawnProp('trashBag.glb',      new THREE.Vector3(-4,   0, 77.5));
        // Breaker boxes on south wall
        this.spawnWallProp('breakerBox.glb','S',  2, 78, 0, 1.5, 0.2);
        this.spawnWallProp('breakerBox.glb','S', 14, 78, 0, 1.5, 0.2);

        // ===========================================================
        // ROOM H - THE CROSSROADS HUB
        // Mood: junction point. Minimal furniture, resting spot against north wall.
        // bounds x[58,74]  z[66,78]
        // Doors: W_1 (west row 1 -> z~70), N_0 (north col 0 -> x~60),
        //        N_2 (north col 2 -> x~68), S_0 (south col 0 -> x~60), E_0 (east row 0 -> z~68)
        // ===========================================================

        // Small table against east wall (x=74). E_0 at z~68 (gap z[66,70]) -- table at z=74
        this.spawnProp('tableSmall2.glb',   new THREE.Vector3(72.5, 0, 74));
        this.spawnProp('chair3.glb',        new THREE.Vector3(70.5, 0, 74),  Math.PI / 2);
        // Plant in SE corner (x=73, z=77) -- S_0 at x~60, E_0 at z~68; SE corner clear
        this.spawnProp('plant2.glb',        new THREE.Vector3(73,   0, 77));
        // Painting on east wall, south of E_0 door -- E_0 at z~68, painting at z=74 is safe
        this.spawnWallProp('painting.glb',  'E', 74, 74, 0, 2.2);

        // ===========================================================
        // ROOM I - MONSTER LAIR (former throne room)
        // Mood: deeply unsettling. Torn mattress in corner, refuse everywhere.
        // bounds x[-2,14]  z[94,110]
        // Doors: N_1 (north col 1 -> x~4), E_2 (east row 2 -> z~102)
        // ===========================================================

        // Torn mattress against west wall (x=-2). N_1 at x~4 -- west wall clear
        this.spawnProp('bed2.glb',          new THREE.Vector3(-0.5, 0, 96));
        // Refuse scattered but always against walls, not in doorway areas
        // E_2 at z~102 (gap z[100,104]) -- keep x[12,14] z[100,104] clear
        this.spawnProp('trashBag.glb',      new THREE.Vector3(-0.5, 0, 108));
        this.spawnProp('trashBag.glb',      new THREE.Vector3( 6,   0, 108.5), Math.PI / 3);
        this.spawnProp('trashBag.glb',      new THREE.Vector3(12,   0, 96.5),  Math.PI / 5);
        this.spawnProp('trashBag.glb',      new THREE.Vector3(12,   0, 106),   Math.PI / 7);
        this.spawnProp('trashBin.glb',      new THREE.Vector3(-0.5, 0, 104.5));
        this.spawnProp('bucket.glb',        new THREE.Vector3(12.5, 0, 96));
        this.spawnProp('tableLamp.glb',     new THREE.Vector3(-0.5, 0, 98));
        // Cracked mirror on west wall -- E_2 at z~102 on east wall; west wall clear
        this.spawnWallProp('mirror.glb',    'W', -2, 102, 0, 1.8);

        // ===========================================================
        // ROOM J - ANTECHAMBER TO THE LAIR
        // Mood: transitional. Sofa against east wall, small table against south.
        // cx=60, cz=106  bounds x[54,70]  z[98,114]
        // Doors: W_1 (west row 1 -> z~104), N_1 (north col 1 -> x~58)
        // ===========================================================

        // Sofa against east wall (x=70), facing west. W_1 at z~104, N_1 at x~58.
        // E_0 is not a door here. Sofa at z=106 (room centre north-south is clear)
        this.spawnProp('couchSmall2.glb',   new THREE.Vector3(68.5, 0, 106), -Math.PI / 2);
        // Small table against south wall (z=114). W_1 at z~104 on west -- south wall clear
        this.spawnProp('tableSmall.glb',    new THREE.Vector3(62, 0, 112.5));
        // Plant in SE corner (x=68, z=113) -- clear of both doors
        this.spawnProp('plant.glb',         new THREE.Vector3(68.5, 0, 113));
        // Trash bin in SW corner (x=55, z=113) -- W_1 at z~104, corner at z=113 is safe
        this.spawnProp('trashBin.glb',      new THREE.Vector3(55, 0, 113));
        // Painting on south wall
        this.spawnWallProp('painting2.glb', 'S', 62, 114, 0, 2.2);

        // ===========================================================
        // ROOM K - FORGOTTEN UPPER LEVEL
        // Mood: old records room. Bookshelves against north wall, reading
        // chair in east corner.
        // bounds x[22,38]  z[-22,-6]
        // Doors: S_2 (south col 2 -> x~30), W_1 (west row 1 -> z~14 -> z~-14)
        // ===========================================================

        // Bookshelves against north wall (z=-22). No north door -- full row
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(24, 0, -20.5));
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(28, 0, -20.5));
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(32, 0, -20.5));
        // Reading chair in east corner (x=37, z=-8) -- S_2 at x~30, east corner x=37 is safe
        this.spawnProp('chair.glb',         new THREE.Vector3(36.5, 0, -7.5), Math.PI / 2);
        this.spawnProp('tableSmall3.glb',   new THREE.Vector3(36.5, 0, -11));
        this.spawnProp('tableLamp.glb',     new THREE.Vector3(36.5, 0.85, -11));
        // Wall shelf above bookshelves
        this.spawnWallProp('wallShelf2.glb','N', 28, -22, 0, 1.8);
        // Trash bag in SW corner -- W_1 at z~-14, SW corner at z=-21 is safe
        this.spawnProp('trashBag.glb',      new THREE.Vector3(23, 0, -21));

        // ===========================================================
        // ROOM L - FLOODED BASEMENT (debris)
        // Mood: abandoned utility. All junk against walls.
        // bounds x[-10,10]  z[-34,-18]
        // Doors: E_2 (east row 2 -> z~-26), S_2 (south col 2 -> x~2)
        // ===========================================================

        // Ladder against west wall (x=-10). No west door -- full clear
        this.spawnProp('ladder.glb',        new THREE.Vector3(-8.5, 0, -28));
        // Buckets against north wall (z=-34). No north door -- full clear
        this.spawnProp('bucket.glb',        new THREE.Vector3(-6,   0, -32.5));
        this.spawnProp('bucket.glb',        new THREE.Vector3( 6,   0, -32.5));
        // Toilet against east wall (x=10). E_2 at z~-26 (gap z[-28,-24]) -- place at z=-32 (north of door)
        this.spawnProp('toilet.glb',        new THREE.Vector3( 8.5, 0, -32), Math.PI);
        // Radiator against south wall (z=-18). S_2 at x~2 (gap x[0,4]) -- place at x=-6 (west corner)
        this.spawnProp('radiator.glb',      new THREE.Vector3(-6,   0, -19),  0);
        // Trash and bags against west and north walls
        this.spawnProp('trashBin.glb',      new THREE.Vector3( 8.5, 0, -20));
        this.spawnProp('trashBag.glb',      new THREE.Vector3(-8.5, 0, -22));
        this.spawnProp('trashBag.glb',      new THREE.Vector3(-8.5, 0, -30));
        // Breaker box on west wall
        this.spawnWallProp('breakerBox.glb','W', -10, -26, 0, 1.4, 0.2);

        // ===========================================================
        // ROOM M - INNER SANCTUM / GOAL ROOM
        // Mood: best-preserved. Sofa against west wall, desk against north wall.
        // bounds x[98,110]  z[6,30]
        // Doors: W_1 (west row 1 -> z~12), S_1 (south col 1 -> x~102)
        // ===========================================================

        // Sofa against west wall (x=98). W_1 at z~12 (gap z[10,14]) -- sofa at z=20 (south of door)
        this.spawnProp('couchBig.glb',      new THREE.Vector3(99.5, 0, 20),  Math.PI / 2);
        // Coffee table in front of sofa
        this.spawnProp('tableSmall2.glb',   new THREE.Vector3(102, 0, 20));
        this.spawnProp('tableLamp.glb',     new THREE.Vector3(102, 0.7, 20));
        // Desk against north wall (z=6). N wall has no door -- x=104 (centre east section)
        // S_1 at x~102, so desk at x=106 avoids the south door zone
        this.spawnProp('table2.glb',        new THREE.Vector3(106, 0,  7.5));
        this.spawnProp('chair.glb',         new THREE.Vector3(106, 0,  9.5),  Math.PI);
        this.spawnProp('bookStack.glb',     new THREE.Vector3(106, 0,  7));
        // Sideboard against east wall (x=110). No east door -- full clear
        this.spawnProp('sideboard2.glb',    new THREE.Vector3(108.5, 0, 20));
        // Plants in corners -- S_1 at x~102 on south wall
        // SW corner (x=99, z=29) -- S_1 at x~102 so x=99 is safe
        this.spawnProp('plant2.glb',        new THREE.Vector3(99.5, 0, 28.5));
        // NE corner (x=109, z=7) -- all walls clear at NE
        this.spawnProp('plant.glb',         new THREE.Vector3(109, 0, 7.5));
        // Carpet in centre
        this.spawnProp('carpet.glb',        new THREE.Vector3(104, 0.01, 18));
        // Wall deco: regal paintings
        this.spawnWallProp('painting4.glb', 'W',  98, 20, 0, 2.4);
        this.spawnWallProp('mirror2.glb',   'N', 104,  6, 0, 1.9);
        this.spawnWallProp('clock.glb',     'E', 110, 18, 0, 2.4);

        // ===========================================================
        // ROOM N - LIBRARY WING
        // Mood: scholar's paradise. Bookshelves against north and east walls.
        // bounds x[90,106]  z[62,78]
        // Doors: N_2 (north col 2 -> x~98), W_1 (west row 1 -> z~70)
        // ===========================================================

        // Reading desk against west wall (x=90). W_1 at z~70 (gap z[68,72]) -- desk at z=64 (north of door)
        this.spawnProp('table2.glb',        new THREE.Vector3(91.5, 0, 64));
        this.spawnProp('chair.glb',         new THREE.Vector3(93.5, 0, 64),  -Math.PI / 2);
        this.spawnProp('tableLamp.glb',     new THREE.Vector3(91.5, 1.16, 63.5));
        this.spawnProp('bookStack.glb',     new THREE.Vector3(91.5, 0, 65));
        // Bookshelves against east wall (x=106). N_2 at x~98 on north, no east door. Full east wall clear.
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(104.5, 0, 64), -Math.PI / 2);
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(104.5, 0, 72), -Math.PI / 2);
        // Bookshelves against south wall (z=78). No south door -- full clear
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(94, 0, 76.5));
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(91, 0, 76.5));
        // Plant in SW corner -- W_1 at z~70, SW corner at z=77 is safe
        this.spawnProp('plant.glb',         new THREE.Vector3(91, 0, 76.5));
        // Wall deco
        this.spawnWallProp('painting3.glb', 'N',  94, 62, 0, 2.2);
        this.spawnWallProp('clock.glb',     'E', 106, 70, 0, 2.4);

        // ===========================================================
        // HALLWAYS - torches every ~8m
        // ===========================================================
        // H1 (A->B): bounds x[10,26] z[2,6]

        // H2 (A->C): bounds x[2,10] z[10,30]

        // H3 (B->D): bounds x[34,42] z[14,30]

        // H4 (B->E): bounds x[42,54] z[6,10]

        // H7 (C->G): bounds x[-2,6] z[46,66]

        // H16 (G->H): bounds x[10,58] z[70,78] (wide!)

        // H17 (G->I): bounds x[2,10] z[78,102]

        // H20 (I->J): bounds x[14,54] z[102,110]

        // H13 (E->M): bounds x[74,98] z[6,10]

        // H24 (M->N): bounds x[102,110] z[30,62]

        // H25 (H->N): bounds x[70,102] z[70,78]


        // ── Trigger horror (Regista) ──────────────────────────────────
        // J: Antechamber to the lair, cx=58 cz=106 — ultimo jumpscare prima della tana
        this.addTrigger(58, 2, 106, 'ANTECHAMBER_SCARE');

        // ── Spawns ─────────────────────────────────────────────────────
        this.playerSpawn          = new THREE.Vector3( 4, 1.8,  4);
        this.playerSpawnRotationY = -Math.PI / 2;
        this.monsterSpawn         = new THREE.Vector3( 6, 2.454, 102);
        // Key in Room I (Monster Lair) SE corner — open floor, no furniture on top
        this.spawnGoalKey(new THREE.Vector3(12, 1.3, 108));

        // ── Batterie di ricarica torcia (Regista) ─────────────────────
        // 3 batterie su Hard, ben distribuite lungo il percorso: vicino
        // all'ingresso (B), a metà mappa (F) e verso il fondo (G)
        this.spawnBattery(new THREE.Vector3(34, 0, 6),  'batteria_hard_1');
        this.spawnBattery(new THREE.Vector3(68, 0, 52), 'batteria_hard_2');
        this.spawnBattery(new THREE.Vector3(8,  0, 72), 'batteria_hard_3');
    }
}

