import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { AudioSystem } from './AudioSystem.js';

export class PlayerController {
    constructor(camera, domElement, collisionObjects, triggerZones) {
        this.camera = camera;
        this.domElement = domElement;

        // Variabili collisione e trigger
        this.collisionObjects = collisionObjects;
        this.triggerZones = triggerZones;

        // 1. Controlli Pointer Lock
        this.controls = new PointerLockControls(this.camera, this.domElement);
        // Altezza occhi e limiti visuale
        this.camera.position.y = 2.5;
        this.controls.minPolarAngle = 0.3;
        this.controls.maxPolarAngle = Math.PI * 0.72;

        // 2. Movimento
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.baseMoveSpeed = 45.0;
        this.sprintMoveSpeed = 85.0;
        this.moveSpeed = this.baseMoveSpeed;
        this.friction = 10.0;
        this.playerSize = new THREE.Vector3(1.5, 1.8, 1.5);

        // Stamina
        this.maxStamina = 4.0;
        this.stamina = this.maxStamina;
        this.staminaRegenRate = this.maxStamina / 2.0;
        this.staminaDrainRate = 1.0;
        this.isSprinting = false;
        this.wasStaminaEmpty = false;

        // 3. Inventario e Salute
        this.salute = 100;
        this.inventario = new Set();

        // 4. Raycaster Interazioni
        this.raycaster = new THREE.Raycaster();
        this.rayDistance = 4.5;
        this.interactiveObject = null;

        // 5. Input Tastiera
        this.keys = { forward: false, backward: false, left: false, right: false, space: false };

        this.flashState = 'OFF_START';
        this.flashTimer = 1.0;

        this._initInputListeners();
        this._initFlashlight();
    }

    _initFlashlight() {
        // Luce torcia
        this.flashlight = new THREE.SpotLight(0xffffff, 150.0);
        this.flashlight.position.set(0.3, -0.3, -0.3);
        this.flashlight.angle = Math.PI / 4;
        this.flashlight.penumbra = 0.5;
        this.flashlight.decay = 2.0;
        this.flashlight.distance = 120;

        // Ombre torcia
        this.flashlight.castShadow = true;
        this.flashlight.shadow.mapSize.width = 1024;
        this.flashlight.shadow.mapSize.height = 1024;
        this.flashlight.shadow.camera.near = 0.5;
        this.flashlight.shadow.camera.far = 120;

        // Target luce
        this.flashlight.target.position.set(0.3, -0.3, -2);

        // Attacca alla telecamera
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);

        // Modello 3D
        const loader = new FBXLoader();
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('./assets/models/flashlight/texture.png');
        texture.colorSpace = THREE.SRGBColorSpace;

        // Luce di supporto torcia
        const weaponLight = new THREE.PointLight(0xffffff, 1.0, 3.0);
        weaponLight.position.set(0.2, 0, -0.2);
        this.camera.add(weaponLight);

        loader.load('./assets/models/flashlight/flashlight.fbx', (object) => {
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    // Debug materiale per colori puri
                    child.material = new THREE.MeshBasicMaterial({
                        map: texture,
                        color: 0xffffff
                    });
                }
            });

            // Scala modello
            object.scale.set(0.0003, 0.0003, 0.0003);

            // Posizione modello
            object.position.set(0.3, -0.4, -0.5);

            // Rotazione torcia
            object.rotation.set(0, -Math.PI / 2, 0);

            this.camera.add(object);
            this.flashlightModel = object;
        }, undefined, (error) => {
            console.error("Errore caricamento FBX torcia:", error);
        });
    }

    // Listener input
    _initInputListeners() {
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));

        // Click attiva PointerLock
        this.domElement.addEventListener('click', () => {
            if (!this.controls.isLocked) this.controls.lock();
        });
    }

    _onKeyDown(event) {
        if (!this.controls.isLocked) return;
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
            case 'Space': this.keys.space = true; break; // Scatto
            case 'KeyE': this._interact(); break;
        }
    }

    _onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
            case 'Space': this.keys.space = false; break;
        }
    }


    // LOOP PRINCIPALE
    update(deltaTime) {
        if (!this.controls.isLocked) return;

        // --- GESTIONE TORCIA ---
        this.flashTimer -= deltaTime;
        if (this.flashState === 'OFF_START') {
            this.flashlight.intensity = 0;
            if (this.flashTimer <= 0) {
                this.flashState = 'START_FLICKER';
                this.flashTimer = 2.0;
            }
        } else if (this.flashState === 'START_FLICKER') {
            this.flashlight.intensity = Math.random() > 0.5 ? 150 : 0;
            if (this.flashTimer <= 0) {
                this.flashState = 'ON';
                this.flashTimer = 10.0 + Math.random() * 5.0;
                this.flashlight.intensity = 150;
            }
        } else if (this.flashState === 'ON') {
            this.flashlight.intensity = 150;
            if (this.flashTimer <= 0) {
                this.flashState = 'FLICKER';
                this.flashTimer = 1.0 + Math.random() * 1.0;
            }
        } else if (this.flashState === 'FLICKER') {
            this.flashlight.intensity = Math.random() > 0.3 ? 150 : 0;
            if (this.flashTimer <= 0) {
                this.flashState = 'ON';
                this.flashTimer = 10.0 + Math.random() * 10.0;
                this.flashlight.intensity = 150;
            }
        }

        // --- STAMINA E VELOCITÀ ---
        const staMuovendo = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;

        if (this.keys.space && staMuovendo && this.stamina > 0 && !this.wasStaminaEmpty) {
            this.isSprinting = true;
            this.moveSpeed = this.sprintMoveSpeed;
            this.stamina -= this.staminaDrainRate * deltaTime; // Consumo
            if (this.stamina <= 0) {
                this.stamina = 0;
                if (!this.wasStaminaEmpty) {
                    this.wasStaminaEmpty = true;
                    AudioSystem.playSound('strong_breathing');
                }
            }
        } else {
            this.isSprinting = false;
            this.moveSpeed = this.baseMoveSpeed;
            // Ricarica solo se non in scatto
            if (this.stamina < this.maxStamina) {
                this.stamina += this.staminaRegenRate * deltaTime;
                if (this.stamina >= this.maxStamina) { // Reset flag when regenerated fully
                    this.wasStaminaEmpty = false;
                }
                if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
            }
        }

        // Aggiorna audio passi
        AudioSystem.updatePlayerFootsteps(staMuovendo, this.isSprinting);

        // Evento UI percentuale stamina
        const percentualeStamina = (this.stamina / this.maxStamina) * 100;
        this._dispatchGlobalEvent('staminaChanged', { percentuale: percentualeStamina });


        // 1. Attrito
        this.velocity.x -= this.velocity.x * this.friction * deltaTime;
        this.velocity.z -= this.velocity.z * this.friction * deltaTime;

        // 2. Direzione
        this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
        this.direction.x = Number(this.keys.right) - Number(this.keys.left);
        this.direction.normalize();

        // 3. Velocità lineare locale
        if (this.keys.forward || this.keys.backward) this.velocity.z -= this.direction.z * this.moveSpeed * deltaTime;
        if (this.keys.left || this.keys.right) this.velocity.x -= this.direction.x * this.moveSpeed * deltaTime;

        // 4. Salva posizione precedente
        const oldPosition = this.camera.position.clone();

        // 5. Applica movimento
        this.controls.moveRight(-this.velocity.x * deltaTime);
        this.controls.moveForward(-this.velocity.z * deltaTime);

        // 6. Risoluzione collisioni (Sliding)
        const desiredPosition = this.camera.position.clone();

        if (this._checkCollisions(desiredPosition)) {
            const directFraction = this._findSafeFraction(oldPosition, desiredPosition);
            this.camera.position.lerpVectors(oldPosition, desiredPosition, directFraction);

            if (directFraction < 0.02) {
                // Percorso diretto bloccato
                const xOnly = new THREE.Vector3(desiredPosition.x, oldPosition.y, oldPosition.z);
                const xFraction = this._findSafeFraction(oldPosition, xOnly);
                const zOnly = new THREE.Vector3(oldPosition.x, oldPosition.y, desiredPosition.z);
                const zFraction = this._findSafeFraction(oldPosition, zOnly);

                if (xFraction >= zFraction && xFraction > 0.02) {
                    this.camera.position.lerpVectors(oldPosition, xOnly, xFraction);
                    this.velocity.z *= 0.15; // smorza invece di azzerare di scatto
                } else if (zFraction > 0.02) {
                    this.camera.position.lerpVectors(oldPosition, zOnly, zFraction);
                    this.velocity.x *= 0.15;
                } else {
                    this.camera.position.copy(oldPosition);
                    this.velocity.x *= 0.15;
                    this.velocity.z *= 0.15;
                }
            }
        }

        // Blocca Y all'altezza degli occhi
        this.camera.position.y = oldPosition.y;

        // 7. Sottosistemi
        this._updateRaycast();
        this._checkTriggerZones();
    }

    // Costruisce AABB del giocatore
    _getPlayerBox(pos = this.camera.position) {
        const halfX = this.playerSize.x / 2;
        const halfZ = this.playerSize.z / 2;
        const feetY = 0.05;
        const headY = pos.y + 0.15;
        return new THREE.Box3(
            new THREE.Vector3(pos.x - halfX, feetY, pos.z - halfZ),
            new THREE.Vector3(pos.x + halfX, headY, pos.z + halfZ)
        );
    }

    // Rilevamento collisioni AABB
    _checkCollisions(pos = this.camera.position) {
        const playerBox = this._getPlayerBox(pos);

        for (let i = 0; i < this.collisionObjects.length; i++) {
            if (playerBox.intersectsBox(this.collisionObjects[i])) {
                return true;
            }
        }
        return false;
    }

    // Ricerca binaria per frazione libera da collisioni
    _findSafeFraction(fromPos, toPos, iterations = 6) {
        if (!this._checkCollisions(toPos)) return 1;
        if (this._checkCollisions(fromPos)) return 0;
        let lo = 0, hi = 1;
        const testPos = new THREE.Vector3();
        for (let i = 0; i < iterations; i++) {
            const mid = (lo + hi) / 2;
            testPos.lerpVectors(fromPos, toPos, mid);
            if (this._checkCollisions(testPos)) hi = mid; else lo = mid;
        }
        return lo;
    }

    // Raycast per interazioni
    _updateRaycast() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const intersects = this.raycaster.intersectObjects(this.camera.parent ? this.camera.parent.children : [], true);

        if (intersects.length > 0 && intersects[0].distance <= this.rayDistance) {
            const hitObject = intersects[0].object;

            if (hitObject.userData && hitObject.userData.isInteractive) {
                let targetName = 'Interact';
                const ud = hitObject.userData;
                if (ud.tipo === 'porta') {
                    const hinge = hitObject.parentHinge;
                    if (hinge && hinge.userData.isOpen) {
                        targetName = 'Close Door';
                    } else {
                        targetName = 'Open Door';
                    }
                } else if (ud.tipo === 'chiave') {
                    targetName = ud.nome || 'Pick Up Golden Key';
                } else if (ud.tipo === 'porta_goal') {
                    targetName = 'Open Gate';
                } else if (ud.nome) {
                    targetName = ud.nome;
                } else if (hitObject.name && !hitObject.name.match(/^(Cube|Object|Mesh|Material)/i)) {
                    targetName = hitObject.name;
                }

                if (this.interactiveObject !== hitObject || this._lastTargetName !== targetName) {
                    this.interactiveObject = hitObject;
                    this._lastTargetName = targetName;
                    this._dispatchGlobalEvent('uiTargetChanged', { name: targetName });
                }
                return;
            }
        }

        if (this.interactiveObject) {
            this.interactiveObject = null;
            this._dispatchGlobalEvent('uiTargetChanged', { name: null });
        }
    }

    // Controlla zone trigger (spavento/logica)
    _checkTriggerZones() {
        if (!this.triggerZones) return;

        const playerBox = this._getPlayerBox();

        for (let i = 0; i < this.triggerZones.length; i++) {
            const zone = this.triggerZones[i];
            if (playerBox.intersectsBox(zone.box) && !zone.giaAttivato) {
                zone.giaAttivato = true;
                
                this._dispatchGlobalEvent('horrorTrigger', { eventName: zone.nome });
            }
        }
    }

    // Interagisce con oggetto puntato
    _interact() {
        if (!this.interactiveObject) return;

        const objData = this.interactiveObject.userData;

        // Raccolta Oggetti
        if (objData.tipo === 'chiave') {
            this.inventario.add(objData.idChiave);
            console.log(`Inventario Aggiornato: Raccolta ${objData.idChiave}`);

            const toRemove = this.interactiveObject.parent || this.interactiveObject;
            this._dispatchGlobalEvent('itemRaccolto', { object: toRemove, idChiave: objData.idChiave });
            this.interactiveObject = null;
            return;
        }

        // Porta del Goal (richiede chiave dorata)
        if (objData.tipo === 'porta_goal') {
            if (!this.inventario.has('chiave_goal')) {
                this._dispatchGlobalEvent('logMessaggioUI', { testo: 'The exit door is locked. Find the Golden Key!' });
                return;
            }
            this._dispatchGlobalEvent('portaGoalAperta', { object: this.interactiveObject });
            this.interactiveObject = null;
            return;
        }

        // Porte normali (possono richiedere chiave)
        if (objData.tipo === 'porta') {
            if (objData.richiedeChiave && !this.inventario.has(objData.idChiave)) {
                this._dispatchGlobalEvent('logMessaggioUI', { testo: "The door is locked from the inside. You need a key." });
                return;
            }

            this._dispatchGlobalEvent('portaAperta', { object: this.interactiveObject });
        }
    }

    // Dispatch eventi globali
    _dispatchGlobalEvent(eventName, detailData) {
        document.dispatchEvent(new CustomEvent(eventName, { detail: detailData }));
    }
}