import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class PlayerController {
    constructor(camera, domElement, collisionObjects, triggerZones) {
        this.camera = camera;
        this.domElement = domElement;
        
        // Input esterni passati dall'Artista (Studente B)
        this.collisionObjects = collisionObjects; // Array di THREE.Box3 (muri/ostacoli)
        this.triggerZones = triggerZones;         // Array di oggetti { box: Box3, nome: string, giaAttivato: bool }

        // 1. Setup Controlli Cinematici (Pointer Lock)
        this.controls = new PointerLockControls(this.camera, this.domElement);
        // Ripristina l'altezza della telecamera perché PointerLockControls la resetta a y=0
        this.camera.position.set(0, 1.8, 0);
        
        // 2. Vettori di Stato del Giocatore e Parametri di Movimento
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.baseMoveSpeed = 45.0;  // Velocità di camminata standard
        this.sprintMoveSpeed = 85.0; // Velocità raddoppiata durante lo scatto
        this.moveSpeed = this.baseMoveSpeed; 
        this.friction = 10.0;  
        this.playerSize = new THREE.Vector3(0.8, 2.0, 0.8); // Dimensioni scatola di collisione utente

        // --- SISTEMA DI STAMINA ---
        this.maxStamina = 4.0;       // Dura 4 secondi di corsa continua
        this.stamina = this.maxStamina;
        this.staminaRegenRate = this.maxStamina / 2.0; // Si ricarica totalmente in 2 secondi (2.0 unità al secondo)
        this.staminaDrainRate = 1.0; // Consuma 1 unità al secondo mentre corre
        this.isSprinting = false;
        // ---------------------------

        // 3. Stato di Gioco & Logica di Inventario
        this.salute = 100;
        this.inventario = new Set(); // Gestione matematica degli elementi unici raccolti

        // 4. Sensore Virtuale di Sguardo (Raycaster per Interazioni)
        this.raycaster = new THREE.Raycaster();
        this.rayDistance = 2.5; 
        this.interactiveObject = null; 

        // 5. Parametri di Stato dell'Inseguitore (AI del Mostro)
        this.mostroSpeed = 4.2;      // Velocità lineare del mostro
        this.mostroAggroRadius = 15; // Raggio del sensore di sbarco (in metri)
        this.mostroDamageRadius = 1.2;// Distanza di attacco (Game Over)

        // 6. Registro Input da tastiera
        this.keys = { forward: false, backward: false, left: false, right: false, space: false };

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
            object.rotation.set(0, Math.PI / 2, 0);

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
            case 'KeyW': case 'ArrowUp':    this.keys.forward = true; break;
            case 'KeyA': case 'ArrowLeft':  this.keys.left = true; break;
            case 'KeyS': case 'ArrowDown':  this.keys.backward = true; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
            case 'Space':                   this.keys.space = true; break; // Barra Spaziatrice per correre
            case 'KeyE':                    this._interact(); break; 
        }
    }

    _onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp':    this.keys.forward = false; break;
            case 'KeyA': case 'ArrowLeft':  this.keys.left = false; break;
            case 'KeyS': case 'ArrowDown':  this.keys.backward = false; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
            case 'Space':                   this.keys.space = false; break;
        }
    }


    // LOOP PRINCIPALE DI AGGIORNAMENTO DINAMICO (Da invocare nel requestAnimationFrame globale)
    update(deltaTime, mostroMesh = null) {
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
            if (this.stamina < 0) this.stamina = 0;
        } else {
            this.isSprinting = false;
            this.moveSpeed = this.baseMoveSpeed;
            // Ricarica solo se non si sta scattando
            if (this.stamina < this.maxStamina) {
                this.stamina += this.staminaRegenRate * deltaTime; // Ricarica rapida (in 2 secondi)
                if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
            }
        }

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

        // 4. Salvataggio Stato Precedente per Rollback in caso di collisione (AABB Boundary Check)
        const oldPosition = this.camera.position.clone();

        // 5. Attuazione del movimento nello spazio locale della telecamera
        this.controls.moveRight(-this.velocity.x * deltaTime);
        this.controls.moveForward(-this.velocity.z * deltaTime);

        // 6. Verifica Collisioni con l'Ambiente dell'Artista
        if (this._checkCollisions()) {
            this.camera.position.copy(oldPosition); // Ripristino coordinate (Annullamento cinematica)
            this.velocity.set(0, 0, 0);             // Smorzamento istantaneo energia cinetica
        }

        // 7. Esecuzione dei Sottosistemi Ausiliari
        this._updateRaycast();                     // Aggiornamento Sensore Ottico Virtuale
        this._checkTriggerZones();                 // Scansione Sensori di Presenza (Trigger)
        
        if (mostroMesh) {
            this._updateMostroAI(mostroMesh, deltaTime); // Aggiornamento Target Tracking (AI)
        }
    }

    // Rilevamento Intersezioni Assiali Box-to-Box (AABB Collision System)
    _checkCollisions() {
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            this.camera.position,
            this.playerSize
        );

        for (let i = 0; i < this.collisionObjects.length; i++) {
            if (playerBox.intersectsBox(this.collisionObjects[i])) {
                return true; 
            }
        }
        return false;
    }

    // Sensore Visivo: Proiezione del raggio centrale (Raycasting)
    _updateRaycast() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        // L'Artista passerà le Mesh interattive reali. Qui simuliamo l'intersezione sul sotto-albero 3D
        // Per semplicità usiamo un array di mesh interattive ricavate dagli oggetti di collisione o passate ad hoc
        const intersects = this.raycaster.intersectObjects(this.camera.parent ? this.camera.parent.children : [], true);

        if (intersects.length > 0 && intersects[0].distance <= this.rayDistance) {
            const hitObject = intersects[0].object;

            if (hitObject.userData && hitObject.userData.isInteractive) {
                if (this.interactiveObject !== hitObject) {
                    this.interactiveObject = hitObject;
                    // Evento UI per l'Artista (es. mostra il mirino "Raccogli/Apri")
                    this._dispatchGlobalEvent('uiTargetChanged', { name: this.interactiveObject.name });
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

        const playerBox = new THREE.Box3().setFromCenterAndSize(
            this.camera.position,
            this.playerSize
        );

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
            
            // Notifica la scomparsa dell'oggetto (L'Artista lo rimuove dalla scena, il Regista fa un Tween di raccolta)
            this._dispatchGlobalEvent('itemRaccolto', { object: this.interactiveObject });
            this.interactiveObject = null;
            return;
        }

        // Sotto-logica 2: Controllo Accessi (Porte Bloccate)
        if (objData.tipo === 'porta') {
            if (objData.richiedeChiave && !this.inventario.has(objData.idChiave)) {
                this._dispatchGlobalEvent('logMessaggioUI', { testo: "La porta è serrata dall'interno. Serve una chiave." });
                return;
            }

            // Se sbloccata o libera, lancia l'evento di sblocco. Il Regista (Studente C) eseguirà il Tween sulla mesh
            this._dispatchGlobalEvent('portaAperta', { object: this.interactiveObject });
        }
    }

    // ─── COSTANTI AI ────────────────────────────────────────────────────────────
    //  RAY_COUNT   : numero di raggi a ventaglio davanti al mostro
    //  RAY_LEN     : lunghezza di ogni raggio (quanto "vede avanti")
    //  STEER_ANGLE : ampiezza massima del ventaglio (radianti)
    //  STUCK_TIME  : secondi immobili prima della mossa di fuga
    // ────────────────────────────────────────────────────────────────────────────

    // AI DEL MOSTRO: Ray-Steering con escape da angoli
    _updateMostroAI(mostroMesh, deltaTime) {
        // Stato persistente inizializzato pigro (sopravvive ai frame)
        if (this._aiState === undefined) {
            this._aiState = {
                stuckTimer: 0,           // secondi senza spostamento reale
                lastPos: mostroMesh.position.clone(),
                escapeDir: null,         // vettore di fuga temporaneo
                escapeClock: 0,          // quanto dura la fuga
                steerDir: new THREE.Vector3(), // direzione di steering corrente
            };
        }
        const ai = this._aiState;

        // ── Vettore verso il giocatore ────────────────────────────────────────
        const toPlayer = new THREE.Vector3().subVectors(this.camera.position, mostroMesh.position);
        toPlayer.y = 0;
        const distanzaEuclidea = toPlayer.length();

        // ── Condizione di Impatto ─────────────────────────────────────────────
        if (distanzaEuclidea <= this.mostroDamageRadius) {
            this.salute = 0;
            this.controls.unlock();
            this._dispatchGlobalEvent('playerMorto', { mostro: mostroMesh });
            return;
        }

        // ── Condizione di Inseguimento ────────────────────────────────────────
        if (distanzaEuclidea > this.mostroAggroRadius) return;

        mostroMesh.lookAt(this.camera.position.x, mostroMesh.position.y, this.camera.position.z);

        const monsterSize  = new THREE.Vector3(1.2, 2.8, 1.2);
        const RAY_LEN      = 2.5;  // distanza di "vista" davanti al mostro
        const STEER_ANGLES = [-0.8, -0.4, 0, 0.4, 0.8]; // ventaglio di 5 raggi (rad)
        const baseDir      = toPlayer.clone().normalize();

        // ── Ray-casting a ventaglio ───────────────────────────────────────────
        // Per ogni angolo del ventaglio controlla se la direzione è libera.
        // Associa un punteggio: 0 = ostruito, (1 - |angolo|/max) = libero e vicino al target.
        let bestScore = -1;
        let bestDir   = baseDir.clone();

        for (const angle of STEER_ANGLES) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            // Rotazione 2D attorno all'asse Y
            const rayDir = new THREE.Vector3(
                baseDir.x * cos - baseDir.z * sin,
                0,
                baseDir.x * sin + baseDir.z * cos
            ).normalize();

            // Prova la posizione in cima al raggio
            const probePos = mostroMesh.position.clone().addScaledVector(rayDir, RAY_LEN);
            const probeBox = new THREE.Box3().setFromCenterAndSize(probePos, monsterSize);

            let ostruito = false;
            for (let i = 0; i < this.collisionObjects.length; i++) {
                if (probeBox.intersectsBox(this.collisionObjects[i])) {
                    ostruito = true;
                    break;
                }
            }

            if (!ostruito) {
                // Punteggio: privilegia il raggio più allineato con il giocatore
                const score = 1.0 - Math.abs(angle) / (Math.PI * 0.5);
                if (score > bestScore) {
                    bestScore = score;
                    bestDir   = rayDir;
                }
            }
        }

        // ── Fuga da angolo: se bloccato da >STUCK_TIME secondi ───────────────
        const movedDist = mostroMesh.position.distanceTo(ai.lastPos);
        ai.lastPos.copy(mostroMesh.position);

        if (movedDist < 0.01) {
            ai.stuckTimer += deltaTime;
        } else {
            ai.stuckTimer = 0;
            ai.escapeDir  = null;
            ai.escapeClock = 0;
        }

        if (ai.stuckTimer > 1.5) {
            // Genera una direzione di fuga perpendicolare al giocatore
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
                ai.escapeDir  = null;
            }
        }

        // ── Smooth steering: interpola gradualmente verso bestDir ─────────────
        ai.steerDir.lerp(bestDir, Math.min(1, deltaTime * 8));
        ai.steerDir.y = 0;
        if (ai.steerDir.lengthSq() < 0.0001) ai.steerDir.copy(bestDir);
        ai.steerDir.normalize();

        const moveStep = ai.steerDir.clone().multiplyScalar(this.mostroSpeed * deltaTime);

        // ── Collisione sliding separata per X e Z ─────────────────────────────
        const futurePosX = mostroMesh.position.clone();
        futurePosX.x += moveStep.x;
        const boxX = new THREE.Box3().setFromCenterAndSize(futurePosX, monsterSize);
        let collideX = false;
        for (let i = 0; i < this.collisionObjects.length; i++) {
            if (boxX.intersectsBox(this.collisionObjects[i])) { collideX = true; break; }
        }
        if (!collideX) mostroMesh.position.x = futurePosX.x;

        const futurePosZ = mostroMesh.position.clone();
        futurePosZ.z += moveStep.z;
        const boxZ = new THREE.Box3().setFromCenterAndSize(futurePosZ, monsterSize);
        let collideZ = false;
        for (let i = 0; i < this.collisionObjects.length; i++) {
            if (boxZ.intersectsBox(this.collisionObjects[i])) { collideZ = true; break; }
        }
        if (!collideZ) mostroMesh.position.z = futurePosZ.z;

        this._dispatchGlobalEvent('mostroInMovimento', { mostro: mostroMesh, isMoving: true });
    }

    // Interfaccia di comunicazione ad eventi per disaccoppiare il codice
    _dispatchGlobalEvent(eventName, detailData) {
        document.dispatchEvent(new CustomEvent(eventName, { detail: detailData }));
    }
}