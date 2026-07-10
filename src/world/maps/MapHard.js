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

        const allowedAssets = ['box.glb', 'box2.glb', 'ladder.glb', 'shelves.glb', 'bucket.glb', 'broom.glb', 'breakerBox.glb', 'trashBag.glb'];

        const build = (tx, tz, cols, rows, doors, flickers = false, lampColor = 0xff8844, isBigRoom = false) => {
            this.buildRoomByTiles(tx, tz, cols, rows, doors, BK);
            const cx = tx * 4 + cols * 2 - 2;
            const cz = tz * 4 + rows * 2 - 2;
            this.spawnCeilingLamp(cx, cz, 5.5, 0.75, Math.max(cols, rows) * 4.5, lampColor, flickers);
            
            if (isBigRoom) {
                this.autoPopulateBigRoom(tx, tz, cols, rows, doors, allowedAssets);
            }
        };

        // Rooms
        build(0, 0, 3, 3, ['E_1', 'S_1', 'N_0', 'W_1'], false, 0xff8844, true); // A (start)
        build(7, 0, 4, 4, ['W_1', 'S_2', 'E_2', 'N_1'], false, 0xff8844, true); // B
        build(0, 8, 3, 4, ['N_1', 'E_1', 'E_3', 'S_0'], false, 0xff8844, true); // C
        build(7, 8, 3, 5, ['N_2', 'W_1', 'E_4', 'W_3'], false, 0xff8844, true); // D
        build(14, 1, 5, 4, ['W_1', 'S_1', 'S_4', 'E_2'], false, 0xff8844, true); // E
        build(15, 11, 5, 4, ['N_3', 'N_0', 'W_1', 'S_0', 'S_2'], false, 0xff8844, true); // F
        build(-2, 17, 5, 3, ['N_2', 'E_1', 'S_3'], false, 0xff8844, true);      // G
        build(15, 17, 3, 3, ['W_1', 'N_0', 'N_2', 'S_0', 'E_0'], false, 0xff8844, true); // H (Hub)
        build(0, 24, 4, 4, ['N_1', 'E_2'], false, 0xff8844, true);               // I (Monster lair)
        build(14, 25, 3, 3, ['W_1', 'N_1'], false, 0xff8844, true);              // J
        build(6, -8, 4, 3, ['S_2', 'W_1'], false, 0xff8844, true);               // K
        build(-2, -9, 3, 4, ['E_2', 'S_2'], false, 0xff8844, true);              // L
        build(25, 2, 3, 6, ['W_1', 'S_1'], false, 0xff8844, true);               // M (Goal/Sanctum)
        build(24, 16, 4, 4, ['N_2', 'W_1'], false, 0xff8844, true);              // N

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

