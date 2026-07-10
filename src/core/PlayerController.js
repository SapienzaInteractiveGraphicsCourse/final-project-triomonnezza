import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { AudioSystem } from './AudioSystem.js';

export class PlayerController {
    constructor(camera, domElement, collisionObjects, triggerZones, monsterCollisionObjects = null, doors = []) {
        this.camera = camera;
        this.domElement = domElement;

        // Input esterni passati dall'Artista (Studente B)
        this.collisionObjects = collisionObjects; // Array di THREE.Box3 (muri/ostacoli/arredamento) — usato dal giocatore
        // Il mostro usa un set ridotto (solo muri/porte, niente arredamento):
        // la sua AI di steering non fa vero pathfinding, solo ray-probing, e
        // si incastrava tra i mobili delle stanze. Fallback al set completo
        // se non passato (retro-compatibilità).
        this.monsterCollisionObjects = monsterCollisionObjects || collisionObjects;
        // Porte con anta interattiva (non la porta del goal): il mostro può
        // aprirle da solo se bloccato, ma solo se chiuse da più di 3s dal
        // giocatore (o mai toccate) — vedi _tryOpenNearbyDoors().
        this.doors = doors;
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

        // 5. Parametri di Stato dell'Inseguitore (AI del Mostro)
        this.mostroSpeed = 4.2;      // Velocità lineare del mostro
        this.mostroAggroRadius = 15; // Raggio del sensore di sbarco (in metri)
        this.mostroDamageRadius = 1.2;// Distanza di "impatto" grezza (non più usata per il trigger, vedi mostroAttackRadius)
        this.mostroAttackRadius = 2.5; // Distanza a cui il mostro scatta e attacca (Regista) — "un paio di passi", non più incollato
        this.ATTACK_IMPACT_DELAY = 0.46; // secondi tra inizio animazione attacco e "impatto" (Game Over) — sincronizzato con Monster.js:attack()

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
        // Invece di un rollback tutto-o-niente per asse, cerchiamo con una
        // ricerca binaria la frazione massima del movimento del frame che è
        // libera da collisioni, così il giocatore scivola fino quasi a
        // toccare la superficie invece di essere "risucchiato" indietro di
        // uno step intero (percepibile soprattutto durante lo scatto, dove
        // un frame può coprire più di un'unità).
        const desiredPosition = this.camera.position.clone();

        if (this._checkCollisions(desiredPosition)) {
            const directFraction = this._findSafeFraction(oldPosition, desiredPosition);
            this.camera.position.lerpVectors(oldPosition, desiredPosition, directFraction);

            if (directFraction < 0.02) {
                // Il percorso diretto è bloccato quasi subito (es. muro/mobile
                // preso di petto o in un angolo) — prova a scivolare lungo un
                // solo asse per volta, anche qui con la stessa ricerca binaria.
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

        if (mostroMesh) {
            this._updateMostroAI(mostroMesh, deltaTime); // Aggiornamento Target Tracking (AI)
        }
    }

    // Costruisce l'AABB del giocatore che copre dal pavimento alla testa.
    // NB: camera.position è all'altezza degli occhi (2.5), quindi un box
    // centrato lì (come prima) galleggia tra y≈1.6 e y≈3.4 e non tocca mai
    // il pavimento — i mobili (tavoli, sedie, comodini, ~1-1.8 unità) restano
    // sempre sotto e non generano mai collisione. Il box va quindi ancorato
    // al pavimento (y≈0.05) fino a poco sopra gli occhi, mantenendo la stessa
    // impronta orizzontale (playerSize.x/z).
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
    // Accetta una posizione esplicita (default: quella attuale della camera)
    // così da poter testare posizioni ipotetiche senza doverci spostare —
    // usato dalla ricerca binaria in _findSafeFraction().
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
    // che è libera da collisioni. Usata per far scivolare il giocatore fino
    // quasi a toccare una superficie invece di annullare l'intero spostamento
    // del frame quando quest'ultimo risulta bloccato — con moveSpeed alti
    // (scatto: 85/s) un singolo frame può coprire >1 unità, quindi un
    // rollback "tutto o niente" si sentiva come uno scatto indietro brusco.
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

        // L'Artista passerà le Mesh interattive reali. Qui simuliamo l'intersezione sul sotto-albero 3D
        // Per semplicità usiamo un array di mesh interattive ricavate dagli oggetti di collisione o passate ad hoc
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
                    // Permette a oggetti con tipo:'chiave' di sovrascrivere il testo
                    // di default (es. le batterie, che riusano lo stesso sistema
                    // ma non sono "Golden Key") — comportamento esistente invariato
                    // se ud.nome non è impostato.
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

    // ─── COSTANTI AI ────────────────────────────────────────────────────────────
    //  RAY_COUNT   : numero di raggi a ventaglio davanti al mostro
    //  RAY_LEN     : lunghezza di ogni raggio (quanto "vede avanti")
    //  STEER_ANGLE : ampiezza massima del ventaglio (radianti)
    //  STUCK_TIME  : secondi immobili prima della mossa di fuga
    // ────────────────────────────────────────────────────────────────────────────

    // AI DEL MOSTRO: Ray-Steering con escape da angoli
    /**
     * Verifica se non ci sono muri/porte chiuse tra il mostro e il giocatore
     * (Regista): il mostro non deve poter "vedere"/colpire attraverso una
     * porta chiusa solo perché sei abbastanza vicino in linea d'aria.
     * Usa monsterCollisionObjects (muri/porte, NON l'arredamento) — coerente
     * col fatto che il mostro attraversa fisicamente le decorazioni, quindi
     * non ha senso che gli blocchino la vista/l'attacco.
     * Quando una porta si apre il suo box viene "svuotato" (vedi main.js),
     * quindi smette automaticamente di bloccare la vista senza bisogno di
     * nessuna sincronizzazione aggiuntiva qui.
     */
    _hasLineOfSightToPlayer(mostroMesh) {
        const from = mostroMesh.position.clone();
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
     * Apre automaticamente le porte chiuse vicino al mostro. Prima di questa
     * fix il mostro non aveva NESSUN modo di aprire una porta — restava
     * bloccato indefinitamente contro qualunque porta chiusa che intralciasse
     * l'unico percorso verso il giocatore. Riusa lo stesso evento
     * 'portaAperta' che main.js già gestisce per il tasto E del giocatore
     * (stessa animazione/suono), quindi non serve duplicare la logica del
     * cigolio/collisione.
     *
     * Regola dei 3 secondi: se il GIOCATORE ha chiuso quella porta (hinge.
     * userData.closedAt impostato in main.js, solo nel ramo di chiusura —
     * il mostro stesso non chiude mai le porte), il mostro può riaprirla solo
     * a partire da 3s dopo — dà al giocatore un attimo di respiro reale dopo
     * essersela chiusa alle spalle, invece di vederla riaprirsi all'istante.
     * Porte mai toccate dal giocatore (closedAt assente) si aprono subito.
     */
    _tryOpenNearbyDoors(mostroMesh) {
        if (!this.doors || this.doors.length === 0) return;
        const REOPEN_COOLDOWN_MS = 3000;
        const OPEN_RADIUS = 3.0; // abbastanza da raggiungere una porta a cavallo del vano da 2.4m

        for (const hinge of this.doors) {
            const ud = hinge.userData;
            if (!ud || ud.isOpen || ud.isAnimating) continue;

            const dx = hinge.position.x - mostroMesh.position.x;
            const dz = hinge.position.z - mostroMesh.position.z;
            if (Math.hypot(dx, dz) > OPEN_RADIUS) continue;

            const closedAt = ud.closedAt || 0;
            if (closedAt !== 0 && (performance.now() - closedAt) < REOPEN_COOLDOWN_MS) continue;

            this._dispatchGlobalEvent('portaAperta', { object: hinge });
        }
    }

    /**
     * Rete di sicurezza: teletrasporta il mostro a distanza ravvicinata (ma
     * non addosso) al giocatore quando resta bloccato troppo a lungo — vedi
     * la soglia dei 4s in _updateMostroAI. Prova alcune posizioni casuali
     * attorno al giocatore verificando che non cadano dentro un muro/porta
     * chiusa (monsterCollisionObjects), con un fallback non validato se
     * proprio non trova nulla di libero entro il numero di tentativi.
     */
    _teleportMonsterNearPlayer(mostroMesh) {
        const player = this.camera.position;
        const radius = 6 + Math.random() * 4; // 6-10 unità: vicino ma non addosso
        const testSize = new THREE.Vector3(1.5, 2.8, 1.5); // stesso ingombro usato per lo steering

        for (let attempt = 0; attempt < 8; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const candidate = new THREE.Vector3(
                player.x + Math.cos(angle) * radius,
                mostroMesh.position.y,
                player.z + Math.sin(angle) * radius
            );
            const box = new THREE.Box3().setFromCenterAndSize(candidate, testSize);
            let blocked = false;
            for (const c of this.monsterCollisionObjects) {
                if (!c.isEmpty() && box.intersectsBox(c)) { blocked = true; break; }
            }
            if (!blocked) {
                mostroMesh.position.copy(candidate);
                return;
            }
        }

        // Fallback: nessuna posizione libera trovata, piazzalo comunque vicino
        const angle = Math.random() * Math.PI * 2;
        mostroMesh.position.set(
            player.x + Math.cos(angle) * radius,
            mostroMesh.position.y,
            player.z + Math.sin(angle) * radius
        );
    }

    _updateMostroAI(mostroMesh, deltaTime) {
        // Stato persistente inizializzato pigro (sopravvive ai frame)
        if (this._aiState === undefined) {
            this._aiState = {
                stuckTimer: 0,           // secondi senza spostamento reale
                lastPos: mostroMesh.position.clone(),
                escapeDir: null,         // vettore di fuga temporaneo
                escapeClock: 0,          // quanto dura la fuga
                steerDir: new THREE.Vector3(), // direzione di steering corrente
                isAttacking: false,      // true durante la sequenza di attacco (Regista)
                attackTimer: 0,          // secondi trascorsi dall'inizio dell'attacco corrente
                attackResolved: false,   // true dopo che 'playerMorto' è già stato dispatchato per questo attacco
                hasNoticedPlayer: false, // true dopo lo "shock" di scoperta iniziale (Regista)
            };
        }
        const ai = this._aiState;

        // ── Vettore verso il giocatore ────────────────────────────────────────
        const toPlayer = new THREE.Vector3().subVectors(this.camera.position, mostroMesh.position);
        toPlayer.y = 0;
        const distanzaEuclidea = toPlayer.length();

        // ── "Shock" alla prima individuazione (Regista) ────────────────────────
        // Rileva il MOMENTO in cui il mostro entra nel raggio di aggro (non ogni
        // frame in cui ci resta): dà un colpo di scena preciso invece di
        // un'escalation anonima. Si "dimentica" se il giocatore esce dal raggio,
        // così può "notare" di nuovo in un secondo momento.
        if (distanzaEuclidea <= this.mostroAggroRadius) {
            if (!ai.hasNoticedPlayer) {
                ai.hasNoticedPlayer = true;
                this._dispatchGlobalEvent('mostroNotaGiocatore', { mostro: mostroMesh });
            }
        } else {
            ai.hasNoticedPlayer = false;
        }

        // ── Sequenza di attacco (Regista) ─────────────────────────────────────
        // Il mostro non colpisce più "incollato" al giocatore: scatta in avanti
        // quando sei a un paio di passi (mostroAttackRadius), così l'animazione
        // di attacco si vede per bene invece di risolversi a distanza zero.
        // Il game over vero e proprio ('playerMorto') arriva più tardi,
        // sincronizzato con il momento di "impatto" dell'animazione
        // (ATTACK_IMPACT_DELAY), non nell'istante in cui scatta l'attacco.
        if (!ai.isAttacking && distanzaEuclidea <= this.mostroAttackRadius) {
            // Non attacca (né gioca l'animazione) se una porta chiusa o un
            // muro si frappone: eri abbastanza vicino solo in linea d'aria.
            if (this._hasLineOfSightToPlayer(mostroMesh)) {
                ai.isAttacking = true;
                ai.attackTimer = 0;
                ai.attackResolved = false;
                mostroMesh.lookAt(this.camera.position.x, mostroMesh.position.y, this.camera.position.z);

                if (window.DEBUG_GODMODE) {
                    // Modalità test (vedi main.js, tasto G): stessa animazione,
                    // ma niente game over — permette di osservarla ripetutamente.
                    this._dispatchGlobalEvent('playerAttaccatoDebug', { mostro: mostroMesh });
                } else {
                    // NB: NON chiamiamo this.controls.unlock() qui. Farlo
                    // rilascia subito il pointer-lock, e la UI (index.html)
                    // interpreta qualunque pointer-unlock come "torna al menu/
                    // pausa" mostrando l'overlay delle istruzioni — sembrava una
                    // pausa automatica, e cliccando per "riprendere" prima che
                    // l'attacco si risolvesse (460ms dopo) si moriva comunque,
                    // dando l'impressione di una morte a tradimento. La morte è
                    // già garantita dal timer qui sotto (ai.attackResolved),
                    // quindi non serve bloccare i controlli in anticipo:
                    // showGameOverScreen() fa già l'unlock al momento giusto,
                    // quando la schermata di game over appare davvero.
                    this._dispatchGlobalEvent('mostroAttacca', { mostro: mostroMesh });
                }
            }
        }

        if (ai.isAttacking) {
            ai.attackTimer += deltaTime;

            if (!window.DEBUG_GODMODE && !ai.attackResolved && ai.attackTimer >= this.ATTACK_IMPACT_DELAY) {
                ai.attackResolved = true;
                this.salute = 0;
                this._dispatchGlobalEvent('playerMorto', { mostro: mostroMesh });
            }

            // In godmode, dopo animazione + una pausa, permette un nuovo
            // attacco se il giocatore è ancora nel raggio.
            if (window.DEBUG_GODMODE && ai.attackTimer >= this.ATTACK_IMPACT_DELAY + 1.4) {
                ai.isAttacking = false;
            }

            return; // durante l'attacco il mostro resta fermo, niente steering
        }

        // ── Condizione di Inseguimento ────────────────────────────────────────
        if (distanzaEuclidea > this.mostroAggroRadius) return;

        mostroMesh.lookAt(this.camera.position.x, mostroMesh.position.y, this.camera.position.z);

        // NB (Regista): l'ingombro qui è più largo del semplice corpo "rigido"
        // del mostro apposta — le braccia/gambe animate (camminata, idle)
        // oscillano oltre il centro del modello, e un margine troppo stretto
        // le faceva sporgere visibilmente attraverso muri/porte vicine.
        // ATTENZIONE: non alzare oltre ~1.6-1.7. Il vano porta è largo 2.4,
        // ma quando il mostro deve attraversarlo IN DIAGONALE (es. stanze a
        // L con due porte ad angolo) lo spazio effettivo richiesto cresce
        // con l'angolo — con gli angoli di sterzata usati qui (fino a ~46°)
        // un ingombro di 2.0 rende IMPOSSIBILE ogni direzione del ventaglio,
        // incastrando il mostro alla porta invece di fargli attraversare.
        // 1.5 è il compromesso sicuro: molto meglio di 1.2 per il clipping,
        // ma resta sotto la soglia critica per gli attraversamenti in diagonale.
        const monsterSize = new THREE.Vector3(1.5, 2.8, 1.5);
        const RAY_LEN = 2.5;  // distanza di "vista" davanti al mostro
        const STEER_ANGLES = [-0.8, -0.4, 0, 0.4, 0.8]; // ventaglio di 5 raggi (rad)
        const baseDir = toPlayer.clone().normalize();

        // ── Ray-casting a ventaglio ───────────────────────────────────────────
        // Per ogni angolo del ventaglio controlla se la direzione è libera.
        // Associa un punteggio: 0 = ostruito, (1 - |angolo|/max) = libero e vicino al target.
        let bestScore = -1;
        let bestDir = baseDir.clone();

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
            for (let i = 0; i < this.monsterCollisionObjects.length; i++) {
                if (probeBox.intersectsBox(this.monsterCollisionObjects[i])) {
                    ostruito = true;
                    break;
                }
            }

            if (!ostruito) {
                // Punteggio: privilegia il raggio più allineato con il giocatore
                const score = 1.0 - Math.abs(angle) / (Math.PI * 0.5);
                if (score > bestScore) {
                    bestScore = score;
                    bestDir = rayDir;
                }
            }
        }

        // ── Prova ad aprire porte vicine chiuse (vedi _tryOpenNearbyDoors) ────
        // Fatto qui, prima del controllo "bloccato da troppo tempo", così una
        // porta che si stava già aprendo ha la possibilità di liberare il
        // varco prima che scatti il teletrasporto di emergenza qui sotto.
        this._tryOpenNearbyDoors(mostroMesh);

        // ── Fuga da angolo: se bloccato da >STUCK_TIME secondi ───────────────
        const movedDist = mostroMesh.position.distanceTo(ai.lastPos);
        ai.lastPos.copy(mostroMesh.position);

        if (movedDist < 0.01) {
            ai.stuckTimer += deltaTime;
        } else {
            ai.stuckTimer = 0;
            ai.escapeDir = null;
            ai.escapeClock = 0;
        }

        // ── Teletrasporto di emergenza: bloccato da troppo tempo (>4s) ────────
        // Nonostante il passaggio attraverso l'arredamento e l'apertura delle
        // porte, il mostro può comunque restare incastrato (es. porta ancora
        // in animazione, geometria imprevista). Come ultima rete di sicurezza,
        // dopo 4s fermo si teletrasporta a distanza ravvicinata dal giocatore
        // per poter riprendere l'inseguimento invece di restare bloccato per
        // il resto della partita.
        if (ai.stuckTimer > 4.0) {
            this._teleportMonsterNearPlayer(mostroMesh);
            ai.stuckTimer = 0;
            ai.escapeDir = null;
            ai.escapeClock = 0;
            ai.lastPos.copy(mostroMesh.position);
            return;
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
                ai.escapeDir = null;
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
        for (let i = 0; i < this.monsterCollisionObjects.length; i++) {
            if (boxX.intersectsBox(this.monsterCollisionObjects[i])) { collideX = true; break; }
        }
        if (!collideX) mostroMesh.position.x = futurePosX.x;

        const futurePosZ = mostroMesh.position.clone();
        futurePosZ.z += moveStep.z;
        const boxZ = new THREE.Box3().setFromCenterAndSize(futurePosZ, monsterSize);
        let collideZ = false;
        for (let i = 0; i < this.monsterCollisionObjects.length; i++) {
            if (boxZ.intersectsBox(this.monsterCollisionObjects[i])) { collideZ = true; break; }
        }
        if (!collideZ) mostroMesh.position.z = futurePosZ.z;

        this._dispatchGlobalEvent('mostroInMovimento', { mostro: mostroMesh, isMoving: true });
    }

    // Interfaccia di comunicazione ad eventi per disaccoppiare il codice
    _dispatchGlobalEvent(eventName, detailData) {
        document.dispatchEvent(new CustomEvent(eventName, { detail: detailData }));
    }
}