/**
 * AI Mostro
 */

import * as THREE from 'three';

export class MonsterAI {
    /**
     * @param {THREE.Object3D} mostroMesh Modello del mostro
     * @param {THREE.Camera} camera Telecamera (giocatore)
     * @param {Array} monsterCollisionObjects Muri/porte per collisioni
     * @param {Array} doors Porte interattive
     */
    constructor(mostroMesh, camera, monsterCollisionObjects, doors, bigRooms = []) {
        this.mesh = mostroMesh;
        this.camera = camera;
        this.monsterCollisionObjects = monsterCollisionObjects || [];
        this.doors = doors || [];
        this.bigRooms = bigRooms || [];

        // Parametri AI Mostro
        this.speed = 4.2;
        this.aggroRadius = 15;
        this.attackRadius = 2.5;
        this.ATTACK_IMPACT_DELAY = 0.46;

        this._aiState = {
            stuckTimer: 0,
            lastPos: mostroMesh ? mostroMesh.position.clone() : new THREE.Vector3(),
            escapeDir: null,
            escapeClock: 0,
            steerDir: new THREE.Vector3(),
            isAttacking: false,
            attackTimer: 0,
            attackResolved: false,
            hasNoticedPlayer: false,
            stuckCheckTimer: 0,
            hasEverSeenPlayer: false,
            dynamicTeleportTimer: 0,
            radiusStuckTimer: 0,
            radiusStuckCenter: mostroMesh ? mostroMesh.position.clone() : new THREE.Vector3(),
        };
    }

    /**
     * Aggiorna gli oggetti collisione dell'ambiente
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
     * Controlla linea di vista verso il giocatore
     */
    _hasLineOfSightToPlayer() {
        if (!this.mesh || !this.camera) return false;

        const from = this.mesh.position.clone();
        from.y += 1.2; // Altezza occhi mostro

        const to = this.camera.position;
        const toTarget = new THREE.Vector3().subVectors(to, from);
        const dist = toTarget.length();
        if (dist < 0.001) return true;
        const dir = toTarget.clone().normalize();

        const ray = new THREE.Ray(from, dir);
        const hitPoint = new THREE.Vector3();

        for (let i = 0; i < this.monsterCollisionObjects.length; i++) {
            const box = this.monsterCollisionObjects[i];
            if (box.isEmpty()) continue;
            if (ray.intersectBox(box, hitPoint)) {
                const hitDist = from.distanceTo(hitPoint);
                if (hitDist < dist - 0.25) return false;
            }
        }
        return true;
    }

    /**
     * Apre porte vicine
     */
    _tryOpenNearbyDoors() {
        if (!this.doors || this.doors.length === 0 || !this.mesh) return;
        const REOPEN_COOLDOWN_MS = 3000;
        const OPEN_RADIUS = 4.5;

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
     * Teletrasporto d'emergenza vicino al giocatore
     */
    _teleportMonsterNearPlayer(minRadius = 6, maxRadius = 10) {
        if (!this.mesh || !this.camera) return;

        const player = this.camera.position;
        const isPointInRoom = (px, pz, r) => {
            const width = r.cols * 4;
            const depth = r.rows * 4;
            return Math.abs(px - r.cx) <= width / 2 && Math.abs(pz - r.cz) <= depth / 2;
        };

        // 1. Prova a teletrasportare in una stanza grande adiacente
        if (this.bigRooms && this.bigRooms.length > 0) {
            const validRooms = [];
            let bestRoom = null;
            let bestDist = Infinity;
            let furthestRoom = null;
            let maxDist = -1;

            for (const room of this.bigRooms) {
                // Evita la stanza del giocatore
                if (isPointInRoom(player.x, player.z, room)) continue;

                const dx = room.cx - player.x;
                const dz = room.cz - player.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                
                if (dist > minRadius && dist <= Math.max(maxRadius * 2.5, 30)) {
                    validRooms.push(room);
                }
                if (dist > minRadius && dist < bestDist) {
                    bestDist = dist;
                    bestRoom = room;
                }
                if (dist > maxDist) {
                    maxDist = dist;
                    furthestRoom = room;
                }
            }

            if (validRooms.length > 0) {
                const targetRoom = validRooms[Math.floor(Math.random() * validRooms.length)];
                this.mesh.position.set(targetRoom.cx, this.mesh.position.y, targetRoom.cz);
                return;
            } else if (bestRoom) {
                this.mesh.position.set(bestRoom.cx, this.mesh.position.y, bestRoom.cz);
                return;
            } else if (furthestRoom) {
                this.mesh.position.set(furthestRoom.cx, this.mesh.position.y, furthestRoom.cz);
                return;
            }
        }

        // 2. Fallback sulle porte
        if (this.doors && this.doors.length > 0) {
            const validDoors = [];
            let bestDoor = null;
            let bestDist = Infinity;
            let furthestDoor = null;
            let maxDist = -1;

            for (const door of this.doors) {
                const pos = door.position;
                const dx = pos.x - player.x;
                const dz = pos.z - player.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist > minRadius && dist <= maxRadius * 2.5) validDoors.push(door);
                if (dist > minRadius && dist < bestDist) { bestDist = dist; bestDoor = door; }
                if (dist > maxDist) { maxDist = dist; furthestDoor = door; }
            }

            const targetDoor = validDoors.length > 0 ? validDoors[Math.floor(Math.random() * validDoors.length)] : (bestDoor || furthestDoor);
            if (targetDoor) {
                this.mesh.position.set(targetDoor.position.x, this.mesh.position.y, targetDoor.position.z);
                return;
            }
        }

        // 3. Fallback geometrico d'emergenza
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        const testSize = new THREE.Vector3(1.5, 2.8, 1.5);

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

        // Vettore verso giocatore
        const toPlayer = new THREE.Vector3().subVectors(this.camera.position, this.mesh.position);
        toPlayer.y = 0;
        const distanzaEuclidea = toPlayer.length();

        // "Shock" prima individuazione
        if (distanzaEuclidea <= this.aggroRadius) {
            ai.hasEverSeenPlayer = true;
            if (!ai.hasNoticedPlayer) {
                ai.hasNoticedPlayer = true;
                this._dispatchGlobalEvent('mostroNotaGiocatore', { mostro: this.mesh });
            }
        } else {
            ai.hasNoticedPlayer = false;
        }

        // Inseguimento Passivo (Teletrasporto Dinamico)
        // Attivo se fuori dall'aggroRadius
        if (distanzaEuclidea > this.aggroRadius) {
            ai.dynamicTeleportTimer += deltaTime;
            if (ai.dynamicTeleportTimer >= 6.0) {
                ai.dynamicTeleportTimer = 0;
                this._teleportMonsterNearPlayer(12, 20);
                ai.lastPos.copy(this.mesh.position);
                if (ai.radiusStuckCenter) ai.radiusStuckCenter.copy(this.mesh.position);
            }
            return; // Lontano, stop qui
        } else {
            ai.dynamicTeleportTimer = 0;
        }

        // Sequenza di attacco
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

            return; // Nessun movimento durante l'attacco
        }

        // Blocco Globale (fermo nello stesso raggio per 6s)
        if (!ai.radiusStuckCenter) ai.radiusStuckCenter = this.mesh.position.clone();

        const hasLOS = this._hasLineOfSightToPlayer();

        // Se in visuale, nessun teletrasporto temporizzato
        if (hasLOS) {
            ai.radiusStuckTimer = 0;
            ai.radiusStuckCenter.copy(this.mesh.position);
        } else {
            ai.radiusStuckTimer += deltaTime;
            if (ai.radiusStuckTimer >= 6.0) {
                const distFromCenter = this.mesh.position.distanceTo(ai.radiusStuckCenter);
                if (distFromCenter < 3.5) {
                    ai.radiusStuckTimer = 0;
                    this._teleportMonsterNearPlayer(12, 20);
                    
                    ai.lastPos.copy(this.mesh.position);
                    ai.radiusStuckCenter.copy(this.mesh.position);
                    ai.stuckTimer = 0;
                    ai.escapeDir = null;
                    ai.escapeClock = 0;
                    return;
                }
                // Aggiorna centro
                ai.radiusStuckCenter.copy(this.mesh.position);
                ai.radiusStuckTimer = 0;
            }
        }

        this.mesh.lookAt(this.camera.position.x, this.mesh.position.y, this.camera.position.z);

        const monsterSize = new THREE.Vector3(1.5, 2.8, 1.5);
        const RAY_LEN = 2.5;
        const STEER_ANGLES = [-0.8, -0.4, 0, 0.4, 0.8]; // 5 raggi (rad)
        const baseDir = toPlayer.clone().normalize();

        // Ray-casting a ventaglio
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

        // Apre porte vicine chiuse
        this._tryOpenNearbyDoors();

        // Fuga da angolo se bloccato
        ai.stuckCheckTimer += deltaTime;
        if (ai.stuckCheckTimer >= 0.5) {
            const movedDist = this.mesh.position.distanceTo(ai.lastPos);
            ai.lastPos.copy(this.mesh.position);

            // Meno di 0.3 unità in 0.5s = bloccato
            if (movedDist < 0.3) {
                ai.stuckTimer += ai.stuckCheckTimer;
            } else {
                ai.stuckTimer = 0;
                ai.escapeDir = null;
                ai.escapeClock = 0;
            }
            ai.stuckCheckTimer = 0;
        }

        // Teletrasporto emergenza
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
                ai.escapeClock = 0.6;
            }
            if (ai.escapeClock > 0) {
                ai.escapeClock -= deltaTime;
                bestDir = ai.escapeDir;
            } else {
                ai.stuckTimer = 0;
                ai.escapeDir = null;
            }
        }

        // Smooth steering
        ai.steerDir.lerp(bestDir, Math.min(1, deltaTime * 8));
        ai.steerDir.y = 0;
        if (ai.steerDir.lengthSq() < 0.0001) ai.steerDir.copy(bestDir);
        ai.steerDir.normalize();

        const moveStep = ai.steerDir.clone().multiplyScalar(this.speed * deltaTime);

        // Collisione sliding separata X e Z
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
