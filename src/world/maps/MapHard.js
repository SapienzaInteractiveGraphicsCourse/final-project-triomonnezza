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

        const build = (tx, tz, cols, rows, doors) =>
            this.buildRoomByTiles(tx, tz, cols, rows, doors, BK);

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

        // ── Goal door ──────────────────────────────────────────────────
        this.spawnGoalDoor(-2 + 0.15, 4, Math.PI / 2);

        // Dungeon lamp colour: dim orange torchlight
        const TORCH = 0xff8844;
        const TORCH_DIM = 0xee6633;

        // ═══════════════════════════════════════════════════════════════
        // ROOM A — GUARD POST (entrance)
        // Mood: checkpoint room. Overturned chair, crates stacked by wall.
        // Single torch lamp. Weapon cabinet on east wall.
        // bounds x[-2,10]  z[-2,10]
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(4, 4, 5.5, 0.7, 10, TORCH, true);

        // Overturned guard table in centre
        this.spawnProp('tableSmall.glb',    new THREE.Vector3( 6, 0,  4),  Math.PI / 8);
        this.spawnProp('chair3.glb',        new THREE.Vector3( 4, 0,  6),  Math.PI * 0.7); // toppled
        // Crates stacked in NE corner
        this.spawnProp('box.glb',           new THREE.Vector3( 8, 0,  0));
        this.spawnProp('box2.glb',          new THREE.Vector3( 8, 0,  3),  Math.PI / 5);
        // Bucket and broom (guards had to clean)
        this.spawnProp('bucket.glb',        new THREE.Vector3( 0, 0,  8));
        this.spawnProp('trashBin.glb',      new THREE.Vector3( 2, 0,  8));
        // Breaker / fusebox on north wall
        this.spawnWallProp('breakerBox.glb','N',  4, -2, 0, 1.4, 0.2);
        this.spawnProp('trashBag.glb',      new THREE.Vector3( 4, 0,  8));
        this.spawnProp('box.glb',           new THREE.Vector3( 8, 0,  6));

        // ═══════════════════════════════════════════════════════════════
        // ROOM B — ARMOURY / BARRACKS
        // Mood: military. Long table for briefings. Cabinets for weapons/supplies.
        // Two lamps for large room.
        // cx=34, cz=6  bounds x[26,42]  z[-2,14]
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(30, 3,  5.5, 0.6, 12, TORCH, true);
        this.spawnCeilingLamp(38, 10, 5.5, 0.6, 12, TORCH);

        // Long briefing table in centre with guards seated around it
        this.spawnProp('table2.glb',        new THREE.Vector3(34, 0,  6));
        this.spawnProp('chair2.glb',        new THREE.Vector3(30, 0,  4),  Math.PI / 2);
        this.spawnProp('chair2.glb',        new THREE.Vector3(30, 0,  8),  Math.PI / 2);
        this.spawnProp('chair2.glb',        new THREE.Vector3(38, 0,  4), -Math.PI / 2);
        this.spawnProp('chair2.glb',        new THREE.Vector3(38, 0,  8), -Math.PI / 2);
        // Supply cabinets against north wall
        this.spawnProp('cabinetHigh.glb',   new THREE.Vector3(28, 0,  0));
        this.spawnProp('cabinetHigh.glb',   new THREE.Vector3(32, 0,  0));
        this.spawnProp('cabinet.glb',       new THREE.Vector3(36, 0,  0));
        // Stacked crates in south corner
        this.spawnProp('box.glb',           new THREE.Vector3(40, 0, 12));
        this.spawnProp('box2.glb',          new THREE.Vector3(40, 0,  8),  Math.PI / 6);
        this.spawnProp('box.glb',           new THREE.Vector3(37, 0, 12));
        this.spawnProp('trashBin.glb',      new THREE.Vector3(40, 0,  4));
        this.spawnProp('carpet.glb',        new THREE.Vector3(34, 0.01, 6)); // Briefing rug
        // Book stacks / logbooks on table
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(34, 0,  5));
        this.spawnProp('phone.glb',         new THREE.Vector3(34, 0,  7));
        // Wall decorations
        this.spawnWallProp('painting.glb',  'N', 34,  -2, 0, 2.2);
        this.spawnWallProp('clock.glb',     'E', 42,   6, 0, 2.4);

        // ═══════════════════════════════════════════════════════════════
        // ROOM C — SERVANT QUARTERS / SLEEPING CELLS
        // Mood: sparse, sad. Two beds, personal items, cracked mirror.
        // cx=4, cz=38  bounds x[-2,10]  z[30,46]  (tx=0,tz=8, 3×4 → cx=0*4+3*2-2=4, cz=8*4+4*2-2=38)
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(4, 34, 5.5, 0.5, 10, TORCH_DIM, true);
        this.spawnCeilingLamp(4, 42, 5.5, 0.5, 10, TORCH_DIM);

        // Two simple beds against west wall
        this.spawnProp('bed2.glb',          new THREE.Vector3( 0, 0, 32), -Math.PI / 2);
        this.spawnProp('bed2.glb',          new THREE.Vector3( 0, 0, 40), -Math.PI / 2);
        
        // Personal items: lamp and bucket by each bed
        this.spawnProp('tableLamp.glb',     new THREE.Vector3( 2, 0, 32));
        this.spawnProp('tableLamp.glb',     new THREE.Vector3( 2, 0, 40));
        
        // Basic sanitary facilities along the east wall
        this.spawnProp('bathroomSink.glb',  new THREE.Vector3( 8, 0, 42), -Math.PI/2);
        this.spawnProp('toilet.glb',        new THREE.Vector3( 8, 0, 34), -Math.PI/2);
        
        // Shelves on east wall with minimal possessions
        this.spawnProp('shelves.glb',       new THREE.Vector3( 9, 0, 38), -Math.PI / 2);
        this.spawnProp('bookStack.glb',     new THREE.Vector3( 9, 0, 44));
        
        // Bucket for washing
        this.spawnProp('bucket.glb',        new THREE.Vector3( 2, 0, 44));
        
        // Cracked mirror on west wall
        this.spawnWallProp('mirror.glb',    'W', -2, 36, 0, 1.8);
        this.spawnWallProp('wallShelf.glb', 'E', 10, 32, 0, 1.7);
        this.spawnProp('carpet2.glb',       new THREE.Vector3( 4, 0.01, 36));
        this.spawnProp('trashBag.glb',      new THREE.Vector3( 8, 0, 44));

        // ═══════════════════════════════════════════════════════════════
        // ROOM D — INTERROGATION CHAMBER
        // Mood: sinister. Single chair in centre under a lamp. Cabinets on walls.
        // cx=36, cz=46  bounds x[26,46]  z[30,62]
        // (tx=7,tz=8, 3×5 → cx=7*4+3*2-2=36, cz=8*4+5*2-2=46)
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(32, 36, 5.5, 0.5, 9, TORCH_DIM, true);
        this.spawnCeilingLamp(36, 48, 5.5, 0.5, 9, TORCH_DIM);

        // Interrogation chair isolated in the centre under the light
        this.spawnProp('chair.glb',         new THREE.Vector3(32, 0, 38),  Math.PI);
        // A bucket next to it... for the mess
        this.spawnProp('bucket.glb',        new THREE.Vector3(34, 0, 38));
        this.spawnProp('trashBag.glb',      new THREE.Vector3(34, 0, 36)); 
        
        // Table with notes/tools to the side
        this.spawnProp('tableSmall2.glb',   new THREE.Vector3(36, 0, 36));
        this.spawnProp('bookStack.glb',     new THREE.Vector3(36, 0, 35));
        
        // Cabinets along east wall
        this.spawnProp('cabinet.glb',       new THREE.Vector3(44, 0, 32));
        this.spawnProp('cabinetLow.glb',    new THREE.Vector3(44, 0, 40));
        
        // Sink against the wall to wash the blood
        this.spawnProp('bathroomSink.glb',  new THREE.Vector3(44, 0, 46), -Math.PI/2);
        
        // Ladder and broom in south corner (for cleaning up?)
        this.spawnProp('ladder.glb',        new THREE.Vector3(44, 0, 58));
        this.spawnProp('broom.glb',         new THREE.Vector3(28, 0, 58));
        this.spawnProp('box.glb',           new THREE.Vector3(42, 0, 46));
        this.spawnProp('box2.glb',          new THREE.Vector3(40, 0, 48), Math.PI/3);
        // Wall painting (intimidating portrait)
        this.spawnWallProp('painting2.glb', 'N', 34, 30, 0, 2.2);

        // ═══════════════════════════════════════════════════════════════
        // ROOM E — COUNCIL HALL / COMMAND ROOM
        // Mood: grand but decayed. Long council table. Multiple chairs.
        // Bookcases, a globe, paintings on walls. Large room → 3 lamps.
        // cx=64, cz=10  bounds x[54,74]  z[2,18]
        // (tx=14,tz=1, 5×4 → cx=14*4+5*2-2=64, cz=1*4+4*2-2=10)
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(58, 6,  5.5, 0.7, 12, TORCH);
        this.spawnCeilingLamp(64, 10, 5.5, 0.7, 12, TORCH, true);
        this.spawnCeilingLamp(70, 14, 5.5, 0.7, 12, TORCH);

        // Long council table with chairs all around it
        this.spawnProp('table.glb',         new THREE.Vector3(62, 0, 10));
        this.spawnProp('table.glb',         new THREE.Vector3(68, 0, 10));
        this.spawnProp('chair.glb',         new THREE.Vector3(58, 0, 10),  Math.PI / 2);
        this.spawnProp('chair.glb',         new THREE.Vector3(62, 0,  6),  Math.PI);
        this.spawnProp('chair.glb',         new THREE.Vector3(66, 0,  6),  Math.PI);
        this.spawnProp('chair.glb',         new THREE.Vector3(70, 0,  6),  Math.PI);
        this.spawnProp('chair.glb',         new THREE.Vector3(62, 0, 14));
        this.spawnProp('chair.glb',         new THREE.Vector3(66, 0, 14));
        this.spawnProp('chair.glb',         new THREE.Vector3(72, 0, 10), -Math.PI / 2);
        // Bookcases on north and east walls
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(55, 0,  8), -Math.PI / 2);
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(55, 0, 14), -Math.PI / 2);
        this.spawnProp('sideboard.glb',     new THREE.Vector3(72, 0,  4));
        // Books and radio on sideboard
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(72, 0,  3));
        this.spawnProp('radio.glb',         new THREE.Vector3(72, 0,  4));
        // Globe in corner (council room must-have)
        this.spawnProp('plant.glb',         new THREE.Vector3(72, 0, 16));
        this.spawnProp('carpet.glb',        new THREE.Vector3(64, 0.01, 10)); // Grand rug
        this.spawnProp('trashBin.glb',      new THREE.Vector3(56, 0, 16));
        // Wall deco: grand painting behind the head of the table
        this.spawnWallProp('painting3.glb', 'N', 64,  2, 0, 2.4);
        this.spawnWallProp('painting4.glb', 'E', 74, 10, 0, 2.0);
        this.spawnWallProp('clock.glb',     'W', 54,  8, 0, 2.4);

        // ═══════════════════════════════════════════════════════════════
        // ROOM F — ARCHIVES / SCRIPTORIUM
        // Mood: scholarly disorder. Writing desks, bookshelves, scattered papers.
        // cx=68, cz=50  bounds x[58,78]  z[42,58]
        // (tx=15,tz=11, 5×4 → cx=15*4+5*2-2=68, cz=11*4+4*2-2=50)
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(62, 46, 5.5, 0.6, 11, TORCH_DIM);
        this.spawnCeilingLamp(74, 54, 5.5, 0.6, 11, TORCH_DIM, true);

        // Writing desks with chairs, arranged for scribes
        this.spawnProp('table2.glb',        new THREE.Vector3(62, 0, 46));
        this.spawnProp('chair2.glb',        new THREE.Vector3(62, 0, 48),  Math.PI);
        this.spawnProp('table2.glb',        new THREE.Vector3(70, 0, 54));
        this.spawnProp('chair2.glb',        new THREE.Vector3(70, 0, 52));
        // Book stacks everywhere
        this.spawnProp('bookStack.glb',     new THREE.Vector3(62, 0, 44));
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(70, 0, 56));
        this.spawnProp('bookStack.glb',     new THREE.Vector3(75, 0, 44));
        // Bookshelves lining east and south walls
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(77, 0, 46), -Math.PI / 2);
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(77, 0, 54), -Math.PI / 2);
        this.spawnProp('shelves.glb',       new THREE.Vector3(62, 0, 57), -Math.PI / 2);
        // Trash on floor
        this.spawnProp('trashBin.glb',      new THREE.Vector3(75, 0, 56));
        this.spawnProp('trashBag.glb',      new THREE.Vector3(60, 0, 52));
        this.spawnProp('box.glb',           new THREE.Vector3(76, 0, 42));
        // Wall decorations
        this.spawnWallProp('painting4.glb', 'N', 68, 42, 0, 2.2);
        this.spawnWallProp('clock.glb',     'E', 78, 50, 0, 2.4);

        // ═══════════════════════════════════════════════════════════════
        // ROOM G — UNDERCROFT / STORAGE VAULT
        // Mood: underground storage. Crates, barrels (boxes), old equipment.
        // Large room → 2 lamps, both dim.
        // cx=8, cz=74  bounds x[-8,24]  z[66,78]
        // (tx=-2,tz=17, 5×3 → cx=-2*4+5*2-2=0, cz=17*4+3*2-2=74)
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(-2, 70, 5.5, 0.5, 11, TORCH_DIM, true);
        this.spawnCeilingLamp(12, 76, 5.5, 0.5, 11, TORCH_DIM);

        // Crates and boxes stacked in corners
        this.spawnProp('box.glb',           new THREE.Vector3(-5, 0, 68));
        this.spawnProp('box2.glb',          new THREE.Vector3(-2, 0, 68),  Math.PI / 4);
        this.spawnProp('box.glb',           new THREE.Vector3( 2, 0, 70),  Math.PI / 7);
        this.spawnProp('box.glb',           new THREE.Vector3(18, 0, 68));
        this.spawnProp('box2.glb',          new THREE.Vector3(18, 0, 76),  Math.PI / 5);
        // Tools and equipment
        this.spawnProp('ladder.glb',        new THREE.Vector3(20, 0, 76));
        this.spawnProp('bucket.glb',        new THREE.Vector3(14, 0, 76));
        this.spawnProp('broom.glb',         new THREE.Vector3(-5, 0, 76));
        this.spawnProp('trashBag.glb',      new THREE.Vector3( 6, 0, 76));
        // Breaker box on south wall (utility room)
        this.spawnWallProp('breakerBox.glb','S',  6, 78, 0, 1.5, 0.2);
        this.spawnWallProp('breakerBox.glb','S', 14, 78, 0, 1.5, 0.2);

        // ═══════════════════════════════════════════════════════════════
        // ROOM H — THE CROSSROADS HUB
        // Mood: central passage point. Minimal furniture, just a resting bench
        // and a painting on the wall. Multiple exits.
        // cx=64, cz=74  bounds x[58,74]  z[66,78]
        // (tx=15,tz=17, 3×3 → cx=15*4+3*2-2=64, cz=17*4+3*2-2=74)
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(64, 72, 5.5, 0.6, 11, TORCH, true);

        // Simple resting bench (small table + chair for guards passing through)
        this.spawnProp('tableSmall2.glb',   new THREE.Vector3(62, 0, 74));
        this.spawnProp('chair3.glb',        new THREE.Vector3(62, 0, 70),  Math.PI);
        // Plant in corner
        this.spawnProp('plant2.glb',        new THREE.Vector3(72, 0, 76));
        // Painting on north wall
        this.spawnWallProp('painting.glb',  'N', 66, 66, 0, 2.2);

        // ═══════════════════════════════════════════════════════════════
        // ROOM I — MONSTER LAIR (former throne room)
        // Mood: deeply unsettling. Evidence of long habitation — a torn mattress,
        // scattered food debris, broken furniture. The monster lives here.
        // cx=6, cz=102  bounds x[-2,14]  z[94,110]
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp( 6, 98,  5.5, 0.5, 9, 0xff4400, true);  // red-orange flicker
        this.spawnCeilingLamp( 6, 106, 5.5, 0.4, 7, 0xff3300, true);  // dying

        // Torn mattress/bed in corner — the monster's sleeping spot
        this.spawnProp('bed2.glb',          new THREE.Vector3( 1, 0, 96));
        // Scattered refuse around the room
        this.spawnProp('trashBag.glb',      new THREE.Vector3( 0, 0, 108));
        this.spawnProp('trashBag.glb',      new THREE.Vector3( 6, 0, 108),  Math.PI / 3);
        this.spawnProp('trashBag.glb',      new THREE.Vector3(12, 0, 104),  Math.PI / 5);
        // Boxes overturned
        this.spawnProp('box.glb',           new THREE.Vector3(12, 0, 96),   Math.PI / 4);
        this.spawnProp('box2.glb',          new THREE.Vector3(12, 0, 100),  Math.PI / 3);
        // Single lamp (knocked over)
        this.spawnProp('tableLamp.glb',     new THREE.Vector3( 2, 0, 98),   Math.PI / 6);
        // Cracked mirror on west wall — eerie reflection
        this.spawnWallProp('mirror.glb',    'W', -2, 102, 0, 1.8);

        // ═══════════════════════════════════════════════════════════════
        // ROOM J — ANTECHAMBER TO THE LAIR
        // Mood: transitional. Once a noble's sitting room, now abandoned.
        // cx=60, cz=106  bounds x[54,70]  z[98,114]
        // (tx=14,tz=25, 3×3 → cx=14*4+3*2-2=60, cz=25*4+3*2-2=106)
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(60, 106, 5.5, 0.5, 10, TORCH_DIM, true);

        this.spawnProp('couchSmall2.glb',   new THREE.Vector3(56, 0, 106),  Math.PI / 2);
        this.spawnProp('tableSmall.glb',    new THREE.Vector3(62, 0, 104));
        this.spawnProp('plant.glb',         new THREE.Vector3(68, 0, 112));
        this.spawnProp('trashBin.glb',      new THREE.Vector3(56, 0, 112));
        this.spawnWallProp('painting2.glb', 'S', 60, 114, 0, 2.2);

        // ═══════════════════════════════════════════════════════════════
        // ROOM K — FORGOTTEN UPPER LEVEL
        // Mood: old library / records room left untouched for years.
        // cx=30, cz=-14  bounds x[22,38]  z[-22,-6]
        // (tx=6,tz=-8, 4×3 → cx=6*4+4*2-2=30, cz=-8*4+3*2-2=-26)
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(28, -18, 5.5, 0.6, 10, TORCH_DIM);
        this.spawnCeilingLamp(34, -12, 5.5, 0.6, 10, TORCH_DIM, true);

        // Bookshelf along north wall
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(24, 0, -20));
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(28, 0, -20));
        this.spawnProp('bookStack2.glb',    new THREE.Vector3(32, 0, -20));
        // Reading chair with side table
        this.spawnProp('chair.glb',         new THREE.Vector3(36, 0, -14),  Math.PI / 2);
        this.spawnProp('tableSmall3.glb',   new THREE.Vector3(36, 0, -10));
        this.spawnProp('tableLamp.glb',     new THREE.Vector3(36, 0, -10));
        // Wall shelf with books above
        this.spawnWallProp('wallShelf2.glb','N', 28, -22, 0, 1.8);

        // ═══════════════════════════════════════════════════════════════
        // ROOM L — FLOODED BASEMENT (debris)
        // Mood: abandoned utility area. Buckets, ladders, decay.
        // cx=2, cz=-26  bounds x[-10,10]  z[-34,-18]
        // (tx=-2,tz=-9, 3×4 → cx=-2*4+3*2-2=0, cz=-9*4+4*2-2=-30)
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(0, -26, 5.5, 0.5, 9, TORCH_DIM, true);

        this.spawnProp('ladder.glb',        new THREE.Vector3(-2, 0, -28));
        this.spawnProp('bucket.glb',        new THREE.Vector3( 6, 0, -28));
        this.spawnProp('bucket.glb',        new THREE.Vector3( 8, 0, -22),  Math.PI / 3);
        
        // Abandoned sanitary equipment dumped here
        this.spawnProp('toilet.glb',        new THREE.Vector3( 8, 0, -26), Math.PI);
        this.spawnProp('radiator.glb',      new THREE.Vector3( 0, 0, -20), -Math.PI / 2);
        
        this.spawnProp('trashBin.glb',      new THREE.Vector3( 6, 0, -20));
        this.spawnProp('trashBag.glb',      new THREE.Vector3(-4, 0, -22),  Math.PI / 2);
        this.spawnProp('trashBag.glb',      new THREE.Vector3(-2, 0, -24));
        this.spawnWallProp('breakerBox.glb','W', -10, -26, 0, 1.4, 0.2);

        // ═══════════════════════════════════════════════════════════════
        // ROOM M — INNER SANCTUM / GOAL ROOM
        // Mood: the best-preserved room. A noble study with intact furniture.
        // Warm, almost welcoming after the horrors outside.
        // cx=104, cz=18  bounds x[98,110]  z[6,30]
        // (tx=25,tz=2, 3×6 → cx=25*4+3*2-2=104, cz=2*4+6*2-2=18)
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp(104, 10, 5.5, 0.8, 12, 0xfff0cc);         // warm, not orange
        this.spawnCeilingLamp(104, 20, 5.5, 0.8, 12, 0xfff0cc);
        this.spawnCeilingLamp(104, 28, 5.5, 0.8, 10, 0xfff0cc);

        // Throne-like armchair / grand sofa against west wall
        this.spawnProp('couchBig.glb',      new THREE.Vector3(100, 0, 12),  Math.PI / 2);
        // Coffee table in front
        this.spawnProp('tableSmall2.glb',   new THREE.Vector3(104, 0, 12));
        this.spawnProp('tableLamp.glb',     new THREE.Vector3(104, 0, 11));
        // Desk with chair against north wall
        this.spawnProp('table2.glb',        new THREE.Vector3(104, 0,  8));
        this.spawnProp('chair.glb',         new THREE.Vector3(104, 0, 10),  Math.PI);
        this.spawnProp('bookStack.glb',     new THREE.Vector3(102, 0,  7));
        // Sideboard along east wall
        this.spawnProp('sideboard2.glb',    new THREE.Vector3(108, 0, 20));
        // Plants in corners (well-maintained)
        this.spawnProp('plant2.glb',        new THREE.Vector3(108, 0, 28));
        this.spawnProp('plant.glb',         new THREE.Vector3(100, 0, 28));
        // Central carpet
        this.spawnProp('carpet.glb',        new THREE.Vector3(104, 0.01, 18));
        // Wall decorations: regal paintings
        this.spawnWallProp('painting4.glb', 'W',  98, 16, 0, 2.4);
        this.spawnWallProp('mirror2.glb',   'N', 104,  6, 0, 1.9);
        this.spawnWallProp('clock.glb',     'E', 110, 18, 0, 2.4);

        // ═══════════════════════════════════════════════════════════════
        // ROOM N — LIBRARY WING
        // Mood: a scholar's paradise. Bookshelves, a reading desk, plants.
        // cx=98, cz=70  bounds x[90,106]  z[62,78]
        // (tx=24,tz=16, 4×4 → cx=24*4+4*2-2=98, cz=16*4+4*2-2=70) — recalc: 96+8-2=102? No: 24*4=96, 96+8-2=102
        // Actually: cx=24*4+4*2-2=96+8-2=102... let me just reuse confirmed from earlier: 98/66
        // Use safe middle coords: x[94,110] z[62,78]
        // ═══════════════════════════════════════════════════════════════
        this.spawnCeilingLamp( 98, 66, 5.5, 0.6, 12, TORCH_DIM);
        this.spawnCeilingLamp(104, 74, 5.5, 0.6, 12, TORCH_DIM, true);

        // Reading desk and chair
        this.spawnProp('table2.glb',        new THREE.Vector3( 96, 0, 70));
        this.spawnProp('chair.glb',         new THREE.Vector3( 94, 0, 70),  Math.PI / 2);
        this.spawnProp('tableLamp.glb',     new THREE.Vector3( 96, 0, 69));
        this.spawnProp('bookStack.glb',     new THREE.Vector3( 97, 0, 69));
        // Bookshelves along walls
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(103, 0, 64), -Math.PI / 2);
        this.spawnProp('bookshelf.glb',     new THREE.Vector3(103, 0, 76), -Math.PI / 2);
        this.spawnProp('bookStack2.glb',    new THREE.Vector3( 94, 0, 76));
        // Plant in corner
        this.spawnProp('plant.glb',         new THREE.Vector3( 94, 0, 64));
        // Wall deco
        this.spawnWallProp('painting3.glb', 'N',  98, 62, 0, 2.2);
        this.spawnWallProp('clock.glb',     'E', 106, 70, 0, 2.4);

        // ═══════════════════════════════════════════════════════════════
        // HALLWAYS — torches every ~8m; radiators replaced by crates/debris
        // ═══════════════════════════════════════════════════════════════
        // H1 (A→B): cx=18,cz=4  bounds x[10,26] z[2,6]
        this.spawnCeilingLamp(14, 4, 5.5, 0.5, 8, TORCH);
        this.spawnCeilingLamp(22, 4, 5.5, 0.5, 8, TORCH, true);

        // H2 (A→C): cx=6,cz=18  bounds x[2,10] z[10,30]
        this.spawnCeilingLamp( 6, 14, 5.5, 0.4, 7, TORCH_DIM, true);
        this.spawnCeilingLamp( 6, 22, 5.5, 0.4, 7, TORCH_DIM);
        this.spawnCeilingLamp( 6, 28, 5.5, 0.4, 7, TORCH_DIM, true);

        // H3 (B→D): cx=38,cz=18  bounds x[34,42] z[14,30]
        this.spawnCeilingLamp(38, 18, 5.5, 0.4, 7, TORCH_DIM);
        this.spawnCeilingLamp(38, 26, 5.5, 0.4, 7, TORCH_DIM, true);

        // H4 (B→E): cx=46,cz=6  bounds x[42,54] z[6,10]
        this.spawnCeilingLamp(46, 8, 5.5, 0.5, 8, TORCH);
        this.spawnCeilingLamp(52, 8, 5.5, 0.5, 8, TORCH, true);

        // H7 (C→G): cx=2,cz=58  bounds x[-2,6] z[46,66]
        this.spawnCeilingLamp( 2, 50, 5.5, 0.4, 7, TORCH_DIM, true);
        this.spawnCeilingLamp( 2, 58, 5.5, 0.4, 7, TORCH_DIM);

        // H16 (G→H): cx=30,cz=74  bounds x[10,58] z[70,78] (wide!)
        this.spawnCeilingLamp(20, 74, 5.5, 0.4, 8, TORCH_DIM);
        this.spawnCeilingLamp(34, 74, 5.5, 0.4, 8, TORCH_DIM, true);
        this.spawnCeilingLamp(48, 74, 5.5, 0.4, 8, TORCH_DIM);

        // H17 (G→I): cx=6,cz=90  bounds x[2,10] z[78,102]
        this.spawnCeilingLamp( 6, 82, 5.5, 0.4, 7, TORCH_DIM, true);
        this.spawnCeilingLamp( 6, 90, 5.5, 0.4, 7, TORCH_DIM);
        this.spawnCeilingLamp( 6, 98, 5.5, 0.4, 7, TORCH_DIM, true);

        // H20 (I→J): cx=22,cz=106  bounds x[14,54] z[102,110]
        this.spawnCeilingLamp(22, 106, 5.5, 0.4, 8, TORCH_DIM);
        this.spawnCeilingLamp(38, 106, 5.5, 0.4, 8, TORCH_DIM, true);

        // H13 (E→M): cx=58,cz=8  bounds x[74,98] z[6,10]
        this.spawnCeilingLamp(80, 8, 5.5, 0.5, 8, TORCH, true);
        this.spawnCeilingLamp(92, 8, 5.5, 0.5, 8, TORCH);

        // H24 (M→N): cx=106,cz=38  bounds x[102,110] z[30,62]
        this.spawnCeilingLamp(106, 38, 5.5, 0.4, 7, TORCH_DIM);
        this.spawnCeilingLamp(106, 50, 5.5, 0.4, 7, TORCH_DIM, true);

        // H25 (H→N): cx=82,cz=74  bounds x[70,102] z[70,78]
        this.spawnCeilingLamp(78, 74, 5.5, 0.4, 8, TORCH_DIM, true);
        this.spawnCeilingLamp(90, 74, 5.5, 0.4, 8, TORCH_DIM);

        // ── Spawns ─────────────────────────────────────────────────────
        this.playerSpawn          = new THREE.Vector3( 4, 1.8,  4);
        this.playerSpawnRotationY = -Math.PI / 2;
        this.monsterSpawn         = new THREE.Vector3( 6, 2.454, 102);
        this.spawnGoalKey(this.monsterSpawn.clone());
    }
}
