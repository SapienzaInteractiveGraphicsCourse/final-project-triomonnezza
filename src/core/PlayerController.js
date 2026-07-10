import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { AudioSystem } from './AudioSystem.js';

export class PlayerController {
    constructor(camera, domElement, collisionObjects, triggerZones) {
        this.camera = camera;
        this.domElement = domElement;

        // Input esterni passati dall'Artista (Studente B)
        this.collisionObjects = collisionObjects; // Array di THREE.Box3 (muri/ostacoli/arredamento) — usato dal giocatore
        this.triggerZones = triggerZones;         // Array di oggetti { box: Box3, nome: string, giaAttivato: bool }

        // 1. Setup Controlli Cinematici (Pointer Lock)
        this.controls = new PointerLockControls(this.camera, this.domElement);
        // Eye level: 2.5m — comfortably below the 4.5m doors
        this.camera.position.y = 2.5;
        // Clamp vertical look: block looking straight down (hides missing legs)
        // 0.3 rad ≈ 17° from straight up;  Math.PI*0.72 ≈ 40° max below horizon
        this.controls.minPolarAngle = 0.3;
        this.controls.maxPolarAngle = Math.PI * 0.72;

        // 2. Vettori di Stato del Giocatore e Parametri di Movimento
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.baseMoveSpeed = 45.0;  // Velocità di camminata standard
        this.sprintMoveSpeed = 85.0; // Velocità raddoppiata durante lo scatto
        this.moveSpeed = this.baseMoveSpeed;
        this.friction = 10.0;
        this.playerSize = new THREE.Vector3(1.5, 1.8, 1.5); // Collision box (centered at eye level)

        // --- SISTEMA DI STAMINA ---
        this.maxStamina = 4.0;       // Dura 4 secondi di corsa continua
        this.stamina = this.maxStamina;
        this.staminaRegenRate = this.maxStamina / 2.0; // Si ricarica totalmente in 2 secondi (2.0 unità al secondo)
        this.staminaDrainRate = 1.0; // Consuma 1 unità al secondo mentre corre
        this.isSprinting = false;
        this.wasStaminaEmpty = false; // Flag per evitare loop audio
        // ---------------------------

        // 3. Stato di Gioco & Logica di Inventario
        this.salute = 100;
        this.inventario = new Set(); // Gestione matematica degli elementi unici raccolti

        // 4. Sensore Virtuale di Sguardo (Raycaster per Interazioni)
        this.raycaster = new THREE.Raycaster();
        this.rayDistance = 4.5;
        this.interactiveObject = null;

        // 5. Registro Input da tastiera
        this.keys = { forward: false, backward: false, left: false, right: false, space: false };

        this.flashState = 'OFF_START';
        this.flashTimer = 1.0;

        this._initInputListeners();
        this._initFlashlight();
    }

    _initFlashlight() {
        // Luce a cono della torcia (Potenza calibrata per materiali PBR fisicamente corretti)
        this.flashlight = new THREE.SpotLight(0xffffff, 150.0);
        this.flashlight.position.set(0.3, -0.3, -0.3); // In basso a destra
        this.flashlight.angle = Math.PI / 4; // Fascio più largo
        this.flashlight.penumbra = 0.5; // Sfumatura morbida
        this.flashlight.decay = 2.0;
        this.flashlight.distance = 120; // Arriva molto più lontano

        // Abilita le ombre per la torcia
        this.flashlight.castShadow = true;
        this.flashlight.shadow.mapSize.width = 1024;
        this.flashlight.shadow.mapSize.height = 1024;
        this.flashlight.shadow.camera.near = 0.5;
        this.flashlight.shadow.camera.far = 120;

        // Target della luce
        this.flashlight.target.position.set(0.3, -0.3, -2); // Punta sempre dritto davanti alla torcia

        // Attacca tutto alla telecamera in modo che segua lo sguardo del giocatore
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);

        // Caricamento del modello 3D
        const loader = new FBXLoader();
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('./assets/models/flashlight/texture.png');
        texture.colorSpace = THREE.SRGBColorSpace;

        // Luce per illuminare la torcia (non serve più col BasicMaterial ma lo lasciamo)
        const weaponLight = new THREE.PointLight(0xffffff, 1.0, 3.0);
        weaponLight.position.set(0.2, 0, -0.2);
        this.camera.add(weaponLight);

        loader.load('./assets/models/flashlight/flashlight.fbx', (object) => {
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    // Per il DEBUG usiamo un MeshBasicMaterial.
                    // Questo ignora completamente le luci e mostra i colori puri della texture.
                    child.material = new THREE.MeshBasicMaterial({
                        map: texture,
                        color: 0xffffff
                    });
                }
            });

            // Scaliamo il modello in modo molto più aggressivo
            object.scale.set(0.0003, 0.0003, 0.0003);

            // Posiziona il modello 3D in basso a destra
            object.position.set(0.3, -0.4, -0.5);

            // Ruotiamo la torcia. Se punta di lato, la giriamo sull'asse Y.
            // Azzero le altre rotazioni per evitare che punti in alto o in basso.
            object.rotation.set(0, -Math.PI / 2, 0);

            this.camera.add(object);
            this.flashlightModel = object;
        }, undefined, (error) => {
            console.error("Errore caricamento FBX torcia:", error);
        });
    }

    // Inizializzazione dei sistemi di cattura degli input (Discreti e Continui)
    _initInputListeners() {
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));

        // Attivazione del PointerLock tramite click sulla viewport
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
            case 'Space': this.keys.space = true; break; // Barra Spaziatrice per correre
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


    // LOOP PRINCIPALE DI AGGIORNAMENTO DINAMICO (Da invocare nel requestAnimationFrame globale)
    update(deltaTime) {
        if (!this.controls.isLocked) return;

        // --- GESTIONE TORCIA (Flickering) ---
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

        // --- GESTIONE DEI VALORI DELLA STAMINA E VELOCITÀ ---
        const staMuovendo = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;

        if (this.keys.space && staMuovendo && this.stamina > 0) {
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
            // Ricarica solo se non si sta scattando
            if (this.stamina < this.maxStamina) {
                this.stamina += this.staminaRegenRate * deltaTime; // Ricarica rapida (in 2 secondi)
                if (this.stamina > 0.5) { // Reset flag when regenerated slightly
                    this.wasStaminaEmpty = false;
                }
                if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
            }
        }

        // Update footsteps audio
        AudioSystem.updatePlayerFootsteps(staMuovendo, this.isSprinting);

        // Invia l'evento UI della percentuale di stamina rimasta (0-100)
        const percentualeStamina = (this.stamina / this.maxStamina) * 100;
        this._dispatchGlobalEvent('staminaChanged', { percentuale: percentualeStamina });
        // -----------------------------------------------------


        // 1. Modello di Attrito (Decelerazione esponenziale fittizia)
        this.velocity.x -= this.velocity.x * this.friction * deltaTime;
        this.velocity.z -= this.velocity.z * this.friction * deltaTime;

        // 2. Elaborazione Vettore Direzione
        this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
        this.direction.x = Number(this.keys.right) - Number(this.keys.left);
        this.direction.normalize(); // Normalizzazione del vettore per mantenere velocità isotropa nelle diagonali

        // 3. Trasformazione Forze in Velocità Lineare Locale
        if (this.keys.forward || this.keys.backward) this.velocity.z -= this.direction.z * this.moveSpeed * deltaTime;
        if (this.keys.left || this.keys.right) this.velocity.x -= this.direction.x * this.moveSpeed * deltaTime;

        // 4. Salvataggio Stato Precedente per Rollback per asse (sliding collision)
        const oldPosition = this.camera.position.clone();

        // 5. Attuazione del movimento nello spazio locale della telecamera
        this.controls.moveRight(-this.velocity.x * deltaTime);
        this.controls.moveForward(-this.velocity.z * deltaTime);

        // 6. Risoluzione collisioni con scivolamento fluido (sliding wall collision)
        const desiredPosition = this.camera.position.clone();

        if (this._checkCollisions(desiredPosition)) {
            const directFraction = this._findSafeFraction(oldPosition, desiredPosition);
            this.camera.position.lerpVectors(oldPosition, desiredPosition, directFraction);

            if (directFraction < 0.02) {
                // Il percorso diretto è bloccato quasi subito
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

        // Lock Y to eye-level to prevent vertical drift from numerical imprecision
        this.camera.position.y = oldPosition.y;

        // 7. Esecuzione dei Sottosistemi Ausiliari
        this._updateRaycast();                     // Aggiornamento Sensore Ottico Virtuale
        this._checkTriggerZones();                 // Scansione Sensori di Presenza (Trigger)
    }

    // Costruisce l'AABB del giocatore che copre dal pavimento alla testa.
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

    // Rilevamento Intersezioni Assiali Box-to-Box (AABB Collision System).
    _checkCollisions(pos = this.camera.position) {
        const playerBox = this._getPlayerBox(pos);

        for (let i = 0; i < this.collisionObjects.length; i++) {
            if (playerBox.intersectsBox(this.collisionObjects[i])) {
                return true;
            }
        }
        return false;
    }

    // Ricerca binaria della frazione massima (0..1) del segmento fromPos→toPos
    // che è libera da collisioni.
    _findSafeFraction(fromPos, toPos, iterations = 6) {
        if (!this._checkCollisions(toPos)) return 1;
        if (this._checkCollisions(fromPos)) return 0; // già in collisione: non avanzare oltre
        let lo = 0, hi = 1;
        const testPos = new THREE.Vector3();
        for (let i = 0; i < iterations; i++) {
            const mid = (lo + hi) / 2;
            testPos.lerpVectors(fromPos, toPos, mid);
            if (this._checkCollisions(testPos)) hi = mid; else lo = mid;
        }
        return lo;
    }

    // Sensore Visivo: Proiezione del raggio centrale (Raycasting)
    _updateRaycast() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // L'Artista passerà le Mesh interattive reali.
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

    // Scansione geometrica dei Sensori ad Area (Trigger di Spavento/Logica)
    _checkTriggerZones() {
        if (!this.triggerZones) return;

        const playerBox = this._getPlayerBox();

        for (let i = 0; i < this.triggerZones.length; i++) {
            const zone = this.triggerZones[i];
            if (playerBox.intersectsBox(zone.box) && !zone.giaAttivato) {
                zone.giaAttivato = true; // Flag di Lock out per evitare attivazioni multiple asincrone

                // Distribuzione dell'evento al Regista (Studente C) per i Tween cinematici
                this._dispatchGlobalEvent('horrorTrigger', { eventName: zone.nome });
            }
        }
    }

    // Attuatore Logico d'Interazione (Tasto E)
    _interact() {
        if (!this.interactiveObject) return;

        const objData = this.interactiveObject.userData;

        // Sotto-logica 1: Raccolta Oggetti (Chiavi/Item)
        if (objData.tipo === 'chiave') {
            this.inventario.add(objData.idChiave);
            console.log(`Inventario Aggiornato: Raccolta ${objData.idChiave}`);

            // Passa il gruppo padre per rimuovere l'intero oggetto dalla scena
            const toRemove = this.interactiveObject.parent || this.interactiveObject;
            this._dispatchGlobalEvent('itemRaccolto', { object: toRemove, idChiave: objData.idChiave });
            this.interactiveObject = null;
            return;
        }

        // Sotto-logica 2: Porta del Goal (richiede chiave dorata)
        if (objData.tipo === 'porta_goal') {
            if (!this.inventario.has('chiave_goal')) {
                this._dispatchGlobalEvent('logMessaggioUI', { testo: 'The exit door is locked. Find the Golden Key!' });
                return;
            }
            this._dispatchGlobalEvent('portaGoalAperta', { object: this.interactiveObject });
            this.interactiveObject = null;
            return;
        }

        // Sotto-logica 3: Controllo Accessi (Porte normali bloccate)
        if (objData.tipo === 'porta') {
            if (objData.richiedeChiave && !this.inventario.has(objData.idChiave)) {
                this._dispatchGlobalEvent('logMessaggioUI', { testo: "The door is locked from the inside. You need a key." });
                return;
            }

            // Se sbloccata o libera, lancia l'evento di sblocco
            this._dispatchGlobalEvent('portaAperta', { object: this.interactiveObject });
        }
    }

    // Interfaccia di comunicazione ad eventi per disaccoppiare il codice
    _dispatchGlobalEvent(eventName, detailData) {
        document.dispatchEvent(new CustomEvent(eventName, { detail: detailData }));
    }
}