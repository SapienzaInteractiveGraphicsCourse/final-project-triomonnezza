/**
 * MonsterAI.js  —  Intelligenza Artificiale del Mostro
 * RESPONSABILE: Alessandro (Ingegnere)
 *
 * Estratto e separato da PlayerController per poter gestire
 * più comportamenti (pattuglia, inseguimento, attacco).
 */

import * as THREE from 'three';

export class MonsterAI {
    /**
     * @param {THREE.Object3D} mostroMesh - The 3D model of the monster
     * @param {THREE.Camera} camera - The player's camera (target)
     * @param {Array} monsterCollisionObjects - Array of Box3 for walls/doors (no furniture)
     * @param {Array} doors - Array of interactive door meshes (so the monster can open them)
     */
    constructor(mostroMesh, camera, monsterCollisionObjects, doors, bigRooms = []) {
        this.mesh = mostroMesh;
        this.camera = camera;
        this.monsterCollisionObjects = monsterCollisionObjects || [];
        this.doors = doors || [];
        this.bigRooms = bigRooms || [];

        // 5. Parametri di Stato dell'Inseguitore (AI del Mostro)
        this.speed = 4.2;            // Velocità lineare del mostro
        this.aggroRadius = 15;       // Raggio del sensore di sbarco (in metri)
        this.attackRadius = 2.5;     // Distanza a cui il mostro scatta e attacca (Regista)
        this.ATTACK_IMPACT_DELAY = 0.46; // secondi tra inizio animazione attacco e "impatto" (Game Over)

        this._aiState = {
            stuckTimer: 0,           // secondi senza spostamento reale
            lastPos: mostroMesh ? mostroMesh.position.clone() : new THREE.Vector3(),
            escapeDir: null,         // vettore di fuga temporaneo
            escapeClock: 0,          // quanto dura la fuga
            steerDir: new THREE.Vector3(), // direzione di steering corrente
            isAttacking: false,      // true durante la sequenza di attacco (Regista)
            attackTimer: 0,          // secondi trascorsi dall'inizio dell'attacco corrente
            attackResolved: false,   // true dopo che 'playerMorto' è già stato dispatchato per questo attacco
            hasNoticedPlayer: false, // true dopo lo "shock" di scoperta iniziale (Regista)
            stuckCheckTimer: 0,      // accumula deltaTime per check periodico
            hasEverSeenPlayer: false, // true se ha mai visto il giocatore
            dynamicTeleportTimer: 0, // timer per il teletrasporto passivo
        };
    }

    /**
     * Set the AI's collision objects (usually updated when a map loads)
     */
    setEnvironment(monsterCollisionObjects, doors, bigRooms = []) {
        this.monsterCollisionObjects = monsterCollisionObjects;
        this.doors = doors;
        this.bigRooms = bigRooms || [];
        if (this.mesh) {
            this._aiState.lastPos.copy(this.mesh.position);
        }
    }

    /**
     * Verifica se non ci sono muri/porte chiuse tra il mostro e il giocatore
     * Usa monsterCollisionObjects (muri/porte, NON l'arredamento).
     */
    _hasLineOfSightToPlayer() {
        if (!this.mesh || !this.camera) return false;

        const from = this.mesh.position.clone();
        from.y += 1.2; // altezza approssimativa "occhi" del mostro

        const to = this.camera.position;
        const toTarget = new THREE.Vector3().subVectors(to, from);
        const dist = toTarget.length();
        if (dist < 0.001) return true;
        const dir = toTarget.clone().normalize();

        const ray = new THREE.Ray(from, dir);
        const hitPoint = new THREE.Vector3();

        for (let i = 0; i < this.monsterCollisionObjects.length; i++) {
            const box = this.monsterCollisionObjects[i];
            if (box.isEmpty()) continue; // porta aperta o ostacolo rimosso: non blocca
            if (ray.intersectBox(box, hitPoint)) {
                const hitDist = from.distanceTo(hitPoint);
                if (hitDist < dist - 0.25) return false; // qualcosa si frappone prima del giocatore
            }
        }
        return true;
    }

    /**
     * Apre automaticamente le porte chiuse vicino al mostro.
     */
    _tryOpenNearbyDoors() {
        if (!this.doors || this.doors.length === 0 || !this.mesh) return;
        const REOPEN_COOLDOWN_MS = 3000;
        const OPEN_RADIUS = 4.5; // Increased from 3.0 to give more margin

        for (const hinge of this.doors) {
            const ud = hinge.userData;
            if (!ud || ud.isOpen || ud.isAnimating) continue;

            const dx = hinge.position.x - this.mesh.position.x;
            const dz = hinge.position.z - this.mesh.position.z;
            if (Math.hypot(dx, dz) > OPEN_RADIUS) continue;

            const closedAt = ud.closedAt || 0;
            if (closedAt !== 0 && (performance.now() - closedAt) < REOPEN_COOLDOWN_MS) continue;

            this._dispatchGlobalEvent('portaAperta', { object: hinge });
        }
    }

    /**
     * Rete di sicurezza: teletrasporta il mostro a distanza ravvicinata al
     * giocatore quando resta bloccato troppo a lungo.
     */
    _teleportMonsterNearPlayer(minRadius = 6, maxRadius = 10) {
        if (!this.mesh || !this.camera) return;

        const player = this.camera.position;

        // 1. Try to teleport safely into the middle of an adjacent big room
        if (this.bigRooms && this.bigRooms.length > 0) {
            const validRooms = [];
            for (const room of this.bigRooms) {
                const dx = room.cx - player.x;
                const dz = room.cz - player.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                
                // We want an adjacent room: further than minRadius, but not too far
                if (dist > minRadius && dist <= Math.max(maxRadius * 2.5, 30)) {
                    validRooms.push(room);
                }
            }

            if (validRooms.length > 0) {
                const targetRoom = validRooms[Math.floor(Math.random() * validRooms.length)];
                this.mesh.position.set(targetRoom.cx, this.mesh.position.y, targetRoom.cz);
                return;
            } else {
                // Fallback: pick the closest room that is safely away from the player
                let bestRoom = null;
                let bestDist = Infinity;
                for (const room of this.bigRooms) {
                    const dx = room.cx - player.x;
                    const dz = room.cz - player.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist > minRadius && dist < bestDist) {
                        bestDist = dist;
                        bestRoom = room;
                    }
                }
                if (bestRoom) {
                    this.mesh.position.set(bestRoom.cx, this.mesh.position.y, bestRoom.cz);
                    return;
                }
            }
        }

        // 2. Fallback to older geometric logic if no big rooms exist
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        const testSize = new THREE.Vector3(1.5, 2.8, 1.5); // stesso ingombro usato per lo steering

        for (let attempt = 0; attempt < 8; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const candidate = new THREE.Vector3(
                player.x + Math.cos(angle) * radius,
                this.mesh.position.y,
                player.z + Math.sin(angle) * radius
            );
            const box = new THREE.Box3().setFromCenterAndSize(candidate, testSize);
            let blocked = false;
            for (const c of this.monsterCollisionObjects) {
                if (!c.isEmpty() && box.intersectsBox(c)) { blocked = true; break; }
            }
            if (!blocked) {
                this.mesh.position.copy(candidate);
                return;
            }
        }

        // Extrema ratio: place nearby anyway
        const angle = Math.random() * Math.PI * 2;
        this.mesh.position.set(
            player.x + Math.cos(angle) * radius,
            this.mesh.position.y,
            player.z + Math.sin(angle) * radius
        );
    }

    update(deltaTime) {
        if (!this.mesh || !this.camera) return;

        const ai = this._aiState;

        // ── Vettore verso il giocatore ────────────────────────────────────────
        const toPlayer = new THREE.Vector3().subVectors(this.camera.position, this.mesh.position);
        toPlayer.y = 0;
        const distanzaEuclidea = toPlayer.length();

        // ── "Shock" alla prima individuazione (Regista) ────────────────────────
        if (distanzaEuclidea <= this.aggroRadius) {
            ai.hasEverSeenPlayer = true;
            if (!ai.hasNoticedPlayer) {
                ai.hasNoticedPlayer = true;
                this._dispatchGlobalEvent('mostroNotaGiocatore', { mostro: this.mesh });
            }
        } else {
            ai.hasNoticedPlayer = false;
        }

        // ── Inseguimento Passivo (Teletrasporto Dinamico) ─────────────────────
        if (!ai.hasEverSeenPlayer) {
            ai.dynamicTeleportTimer += deltaTime;
            if (ai.dynamicTeleportTimer >= 5.0) {
                ai.dynamicTeleportTimer = 0;
                // Teletrasporta il mostro in una "stanza adiacente" (12-20 unità)
                this._teleportMonsterNearPlayer(12, 20);
                ai.lastPos.copy(this.mesh.position);
            }
        }

        // ── Sequenza di attacco (Regista) ─────────────────────────────────────
        if (!ai.isAttacking && distanzaEuclidea <= this.attackRadius) {
            if (this._hasLineOfSightToPlayer()) {
                ai.isAttacking = true;
                ai.attackTimer = 0;
                ai.attackResolved = false;
                this.mesh.lookAt(this.camera.position.x, this.mesh.position.y, this.camera.position.z);

                if (window.DEBUG_GODMODE) {
                    this._dispatchGlobalEvent('playerAttaccatoDebug', { mostro: this.mesh });
                } else {
                    this._dispatchGlobalEvent('mostroAttacca', { mostro: this.mesh });
                }
            }
        }

        if (ai.isAttacking) {
            ai.attackTimer += deltaTime;

            if (!window.DEBUG_GODMODE && !ai.attackResolved && ai.attackTimer >= this.ATTACK_IMPACT_DELAY) {
                ai.attackResolved = true;
                this._dispatchGlobalEvent('playerMorto', { mostro: this.mesh });
            }

            if (window.DEBUG_GODMODE && ai.attackTimer >= this.ATTACK_IMPACT_DELAY + 1.4) {
                ai.isAttacking = false;
            }

            return; // durante l'attacco il mostro resta fermo, niente steering
        }

        // ── Condizione di Inseguimento ────────────────────────────────────────
        if (distanzaEuclidea > this.aggroRadius) return;

        this.mesh.lookAt(this.camera.position.x, this.mesh.position.y, this.camera.position.z);

        const monsterSize = new THREE.Vector3(1.5, 2.8, 1.5);
        const RAY_LEN = 2.5;  // distanza di "vista" davanti al mostro
        const STEER_ANGLES = [-0.8, -0.4, 0, 0.4, 0.8]; // ventaglio di 5 raggi (rad)
        const baseDir = toPlayer.clone().normalize();

        // ── Ray-casting a ventaglio ───────────────────────────────────────────
        let bestScore = -1;
        let bestDir = baseDir.clone();

        for (const angle of STEER_ANGLES) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const rayDir = new THREE.Vector3(
                baseDir.x * cos - baseDir.z * sin,
                0,
                baseDir.x * sin + baseDir.z * cos
            ).normalize();

            const probePos = this.mesh.position.clone().addScaledVector(rayDir, RAY_LEN);
            const probeBox = new THREE.Box3().setFromCenterAndSize(probePos, monsterSize);

            let ostruito = false;
            for (let i = 0; i < this.monsterCollisionObjects.length; i++) {
                if (probeBox.intersectsBox(this.monsterCollisionObjects[i])) {
                    ostruito = true;
                    break;
                }
            }

            if (!ostruito) {
                const score = 1.0 - Math.abs(angle) / (Math.PI * 0.5);
                if (score > bestScore) {
                    bestScore = score;
                    bestDir = rayDir;
                }
            }
        }

        // ── Prova ad aprire porte vicine chiuse ────────────────────────────────
        this._tryOpenNearbyDoors();

        // ── Fuga da angolo: se bloccato da troppo ─────────────────────────────
        ai.stuckCheckTimer += deltaTime;
        if (ai.stuckCheckTimer >= 0.5) {
            const movedDist = this.mesh.position.distanceTo(ai.lastPos);
            ai.lastPos.copy(this.mesh.position);

            // Se in 0.5 secondi si è mosso di meno di 0.3 unità, è bloccato
            if (movedDist < 0.3) {
                ai.stuckTimer += ai.stuckCheckTimer;
            } else {
                ai.stuckTimer = 0;
                ai.escapeDir = null;
                ai.escapeClock = 0;
            }
            ai.stuckCheckTimer = 0;
        }

        // ── Teletrasporto di emergenza ────────────────────────────────────────
        if (ai.stuckTimer > 4.0) {
            this._teleportMonsterNearPlayer();
            ai.stuckTimer = 0;
            ai.escapeDir = null;
            ai.escapeClock = 0;
            ai.lastPos.copy(this.mesh.position);
            return;
        }

        if (ai.stuckTimer > 1.5) {
            if (!ai.escapeDir) {
                ai.escapeDir = new THREE.Vector3(
                    -baseDir.z + (Math.random() - 0.5) * 0.6,
                    0,
                    baseDir.x + (Math.random() - 0.5) * 0.6
                ).normalize();
                ai.escapeClock = 0.6; // dura 0.6 s
            }
            if (ai.escapeClock > 0) {
                ai.escapeClock -= deltaTime;
                bestDir = ai.escapeDir;
            } else {
                ai.stuckTimer = 0;
                ai.escapeDir = null;
            }
        }

        // ── Smooth steering ───────────────────────────────────────────────────
        ai.steerDir.lerp(bestDir, Math.min(1, deltaTime * 8));
        ai.steerDir.y = 0;
        if (ai.steerDir.lengthSq() < 0.0001) ai.steerDir.copy(bestDir);
        ai.steerDir.normalize();

        const moveStep = ai.steerDir.clone().multiplyScalar(this.speed * deltaTime);

        // ── Collisione sliding separata per X e Z ─────────────────────────────
        const futurePosX = this.mesh.position.clone();
        futurePosX.x += moveStep.x;
        const boxX = new THREE.Box3().setFromCenterAndSize(futurePosX, monsterSize);
        let collideX = false;
        for (let i = 0; i < this.monsterCollisionObjects.length; i++) {
            if (boxX.intersectsBox(this.monsterCollisionObjects[i])) { collideX = true; break; }
        }
        if (!collideX) this.mesh.position.x = futurePosX.x;

        const futurePosZ = this.mesh.position.clone();
        futurePosZ.z += moveStep.z;
        const boxZ = new THREE.Box3().setFromCenterAndSize(futurePosZ, monsterSize);
        let collideZ = false;
        for (let i = 0; i < this.monsterCollisionObjects.length; i++) {
            if (boxZ.intersectsBox(this.monsterCollisionObjects[i])) { collideZ = true; break; }
        }
        if (!collideZ) this.mesh.position.z = futurePosZ.z;

        this._dispatchGlobalEvent('mostroInMovimento', { mostro: this.mesh, isMoving: true });
    }

    _dispatchGlobalEvent(eventName, detailData) {
        document.dispatchEvent(new CustomEvent(eventName, { detail: detailData }));
    }
}
