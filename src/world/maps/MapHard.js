import * as THREE from 'three';
import { MapBase } from './MapBase.js';

export class MapHard extends MapBase {
    load() {
        console.log("Loading Hospital Map Hard...");

        // Griglia 4x3 per un grande labirinto circolare
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 4; c++) {
                const openings = [];
                // Se non siamo sul bordo Nord, connetti a Nord
                if (r > 0) openings.push('N_1');
                // Se non siamo sul bordo Sud, connetti a Sud
                if (r < 2) openings.push('S_1');
                // Se non siamo sul bordo Ovest, connetti a Ovest
                if (c > 0) openings.push('W_1');
                // Se non siamo sul bordo Est, connetti a Est
                if (c < 3) openings.push('E_1');
                
                this.buildHospitalRoom(c * 12, r * 12, 3, 3, openings);
            }
        }

        // Tanti ostacoli (props) per confondere il giocatore e fare atmosfera
        const props = ['bed.fbx', 'wheel_chair.fbx', 'cabinet_3.fbx', 'chair.fbx', 'table.fbx', 'Magazine1.fbx', 'IV_Bag.fbx'];
        for (let i = 0; i < 20; i++) {
            const rProp = props[Math.floor(Math.random() * props.length)];
            const rX = Math.random() * 36;
            const rZ = Math.random() * 24;
            this.spawnAsset(rProp, new THREE.Vector3(rX, 0, rZ), Math.random() * Math.PI, true);
        }

        // Uscita (Ultima stanza in basso a destra 36, 24)
        // La stanza in c=3, r=2 ha centro (36, 24). La porta N è a Z=24-6=18.
        this.spawnAsset('Exit_sign.fbx', new THREE.Vector3(36, 3, 18.2), 0, true); 

        // Start (0,0)
        this.monsterSpawn = new THREE.Vector3(0, 1.5, 0);
        this.addTrigger(36, 2, 24, "GOAL_REACHED");

        document.dispatchEvent(new Event('assetsLoadedEvent'));
    }
}
