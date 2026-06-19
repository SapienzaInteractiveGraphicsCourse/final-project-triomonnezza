/**
 * MonsterAI.js  —  Intelligenza Artificiale del Mostro
 * RESPONSABILE: Alessandro (Ingegnere)
 *
 * Estratto e separato da PlayerController per poter gestire
 * più comportamenti (pattuglia, inseguimento, attacco).
 *
 * TODO Alessandro: sposta/raffina la logica _updateMostroAI da PlayerController qui.
 */

import * as THREE from 'three';

export class MonsterAI {
    constructor(monsterMesh) {
        this.mesh         = monsterMesh;
        this.aggroRadius  = 15;
        this.damageRadius = 1.2;
        this.speed        = 4.2;
    }

    update(deltaTime, playerPosition) {
        // TODO Alessandro: logica di inseguimento (spostata da PlayerController)
    }
}
