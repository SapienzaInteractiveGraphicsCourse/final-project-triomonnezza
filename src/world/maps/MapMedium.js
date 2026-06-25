import * as THREE from 'three';
import { MapBase } from './MapBase.js';

export class MapMedium extends MapBase {
    load() {
        console.log("Loading Hospital Map Medium...");

        // Griglia 3x2 di stanze per garantire multipli percorsi
        // R00 (0,0) Start
        this.buildHospitalRoom(0, 0, 3, 3, ['E_1', 'S_1']);
        
        // R10 (12,0)
        this.buildHospitalRoom(12, 0, 3, 3, ['W_1', 'E_1', 'S_1']);
        
        // R20 (24,0)
        this.buildHospitalRoom(24, 0, 3, 3, ['W_1', 'S_1']);
        
        // R01 (0,12)
        this.buildHospitalRoom(0, 12, 3, 3, ['N_1', 'E_1']);
        
        // R11 (12,12)
        this.buildHospitalRoom(12, 12, 3, 3, ['N_1', 'W_1', 'E_1']);
        
        // R21 (24,12) Goal
        this.buildHospitalRoom(24, 12, 3, 3, ['N_1', 'W_1']);

        // Più props per rendere la mappa più viva
        this.spawnAsset('table.fbx', new THREE.Vector3(12, 0, 12), 0, true);
        this.spawnAsset('chair.fbx', new THREE.Vector3(10, 0, 12), Math.PI/2, true);
        this.spawnAsset('IV_Bag.fbx', new THREE.Vector3(22, 0, 2), 0, true);
        this.spawnAsset('cabinet_2.fbx', new THREE.Vector3(0, 0, 10), Math.PI, true);
        this.spawnAsset('bed.fbx', new THREE.Vector3(24, 0, -2), -Math.PI/2, true);
        this.spawnAsset('wheel_chair.fbx', new THREE.Vector3(14, 0, 2), Math.PI/3, true);

        // Uscita
        this.spawnAsset('Exit_sign.fbx', new THREE.Vector3(24, 3, 6.2), 0, true); 

        // Start & Trigger
        this.monsterSpawn = new THREE.Vector3(0, 1.5, 0);
        this.addTrigger(24, 2, 12, "GOAL_REACHED");

        document.dispatchEvent(new Event('assetsLoadedEvent'));
    }
}
