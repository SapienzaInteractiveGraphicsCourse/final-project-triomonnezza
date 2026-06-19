import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class PlayerController {
    constructor(camera, domElement, collisionObjects, triggerZones) {
        this.camera = camera;
        this.domElement = domElement;
        
        // Input esterni passati dall'Artista (Studente B)
        this.collisionObjects = collisionObjects; // Array di THREE.Box3 (muri/ostacoli)
        this.triggerZones = triggerZones;         // Array di oggetti { box: Box3, nome: string, giaAttivato: bool }

        // 1. Setup Controlli Cinematici (Pointer Lock)
        this.controls = new PointerLockControls(this.camera, this.domElement);
        
        // 2. Vettori di Stato del Giocatore
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveSpeed = 45.0; 
        this.friction = 10.0;  
        this.playerSize = new THREE.Vector3(0.8, 2.0, 0.8); // Dimensioni scatola di collisione utente

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
        this.keys = { forward: false, backward: false, left: false, right: false };

        this._initInputListeners();
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
            case 'KeyE':                    this._interact(); break; 
        }
    }

    _onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp':    this.keys.forward = false; break;
            case 'KeyA': case 'ArrowLeft':  this.keys.left = false; break;
            case 'KeyS': case 'ArrowDown':  this.keys.backward = false; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
        }
    }

    // LOOP PRINCIPALE DI AGGIORNAMENTO DINAMICO (Da invocare nel requestAnimationFrame globale)
    update(deltaTime, mostroMesh = null) {
        if (!this.controls.isLocked) return;

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

    // AI DEL MOSTRO: Target Tracking e Pathing Lineare sul piano orizzontale
    _updateMostroAI(mostroMesh, deltaTime) {
        // Calcolo del vettore di errore (Distanza relativa Giocatore - Mostro)
        const targetVector = new THREE.Vector3().subVectors(this.camera.position, mostroMesh.position);
        targetVector.y = 0; // Proiezione vincolata sul piano XZ (Nessun movimento verticale spontaneo)

        const distanzaEuclidea = targetVector.length();

        // Condizione di Inseguimento (Filtro di soglia per l'Aggro)
        if (distanzaEuclidea <= this.mostroAggroRadius &&  distanzaEuclidea > this.mostroDamageRadius) {
            // Allineamento dell'asse di beccheggio del mostro verso il target
            mostroMesh.lookAt(this.camera.position.x, mostroMesh.position.y, this.camera.position.z);
            
            // Calcolo direzione unitaria e attuazione dello spostamento lineare
            targetVector.normalize();
            mostroMesh.position.addScaledVector(targetVector, this.mostroSpeed * deltaTime);
            
            // Notifica al Regista (Studente C) che il mostro sta camminando (può far oscillare le braccia via Tween)
            this._dispatchGlobalEvent('mostroInMovimento', { mostro: mostroMesh, isMoving: true });
        } 
        // Condizione di Impatto (Distanza critica raggiunta)
        else if (distanzaEuclidea <= this.mostroDamageRadius) {
            this.salute = 0;
            this.controls.unlock();
            // Invia il segnale di fine gioco all'Artista (Mostra HUD di morte) e al Regista (Tween Jumpscare)
            this._dispatchGlobalEvent('playerMorto', { mostro: mostroMesh });
        }
    }

    // Interfaccia di comunicazione ad eventi per disaccoppiare il codice
    _dispatchGlobalEvent(eventName, detailData) {
        document.dispatchEvent(new CustomEvent(eventName, { detail: detailData }));
    }
}