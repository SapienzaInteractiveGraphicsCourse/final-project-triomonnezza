import * as THREE from 'three';
import { MapBase } from './MapBase.js';

export class MapEasy extends MapBase {
    load() {
        console.log("Loading Hospital Map Easy...");

        // Room 1 (Start) - Alto Sinistra (Nord-Ovest)
        // Connette a Est e a Sud
        this.buildHospitalRoom(0, 0, 3, 3, ['E_1', 'S_1']);
        
        // Room 2 - Alto Destra (Nord-Est)
        // Connette a Ovest (verso R1) e a Sud (verso R3)
        this.buildHospitalRoom(12, 0, 3, 3, ['W_1', 'S_1']);
        
        // Room 3 (Goal) - Basso Destra (Sud-Est)
        // Connette a Nord (verso R2) e a Ovest (verso R4)
        this.buildHospitalRoom(12, 12, 3, 3, ['N_1', 'W_1']);
        
        // Room 4 - Basso Sinistra (Sud-Ovest)
        // Connette a Nord (verso R1) e a Est (verso R3)
        this.buildHospitalRoom(0, 12, 3, 3, ['N_1', 'E_1']);

        // Aggiungiamo le porte (le porte si aprono interagendo, usiamo prop o le lasciamo aperte per ora)
        // Inseriamo un paio di props sparsi
        this.spawnAsset('bed.fbx', new THREE.Vector3(-2, 0, -2), 0, true);
        this.spawnAsset('wheel_chair.fbx', new THREE.Vector3(2, 0, 2), Math.PI / 4, true);
        this.spawnAsset('cabinet_1.fbx', new THREE.Vector3(14, 0, -2), -Math.PI / 2, true);
        
        // Inseriamo l'Exit Sign sopra la porta della Goal Room
        this.spawnAsset('Exit_sign.fbx', new THREE.Vector3(12, 3, 6.2), 0, true); // Sopra l'ingresso N della R3

        // Impostiamo lo spawn del giocatore (Centro della R1)
        this.monsterSpawn = new THREE.Vector3(0, 1.5, 0);

        // Impostiamo il trigger per la vittoria nella Room 3
        this.addTrigger(12, 2, 12, "GOAL_REACHED");

        // Finta promessa o evento, in questo caso l'AssetManager ha già caricato tutto prima di chiamare load()
        document.dispatchEvent(new Event('assetsLoadedEvent'));
    }
}
