import * as THREE from 'three';
import { PlayerController } from './src/core/PlayerController.js';
import { Monster } from './src/entities/Monster.js';
import { MapEasy } from './src/world/maps/MapEasy.js';
import { MapMedium } from './src/world/maps/MapMedium.js';
import { MapHard } from './src/world/maps/MapHard.js';
import { InteriorAssetManager } from './src/world/InteriorAssetManager.js';
import { AudioSystem } from './src/core/AudioSystem.js';
import * as TWEEN from '@tweenjs/tween.js';
import { TweenManager } from './src/animations/TweenManager.js';

// ==========================================
// 1. SETUP DELLA SCENA (WEBGL)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false; // Disabilitato per performance (gioco horror = buio di default)
document.body.appendChild(renderer.domElement);

// Luce ambientale minima — solo per evitare nero assoluto; le lampade al soffitto sono le vere fonti di luce
const ambientLight = new THREE.AmbientLight(0x111122, 0.06);
scene.add(ambientLight);

// Luce direzionale minima — solo per definizione volumetrica di base
const dirLight = new THREE.DirectionalLight(0xffeedd, 0.05);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// ==========================================
// 2. VARIABILI GLOBALI DI STATO
// ==========================================
let currentMap = null;
let player = null;
let mostroMesh = null;
const monster = new Monster();

// ── Batteria torcia (Regista) ─────────────────────────────────────
// Si scarica gradualmente nel tempo fino a un minimo (mai si spegne del
// tutto). Implementata come moltiplicatore applicato SOPRA l'intensità
// che PlayerController calcola ogni frame (incluso il suo sfarfallio casuale)
const TORCH_BATTERY_MIN_PERCENT = 30;  // percentuale minima di luce residua
const TORCH_DRAIN_INTERVAL_SEC  = 1;   // ogni quanti secondi perde l'1%
let torchBatteryPercent = 100;
let _torchDrainTimer = 0;
const _torchBatteryMult = { mult: 1.0 }; // valore animato in tween, applicato ogni frame

// Gestore centralizzato dei tween "cosmetici" (jumpscare, raccolta oggetti, ecc.)
// RESPONSABILE: Federico (Regista) — vedi src/animations/TweenManager.js
// NB: passiamo il canvas (per lo screen-shake CSS), MAI la camera —
// vedi nota in TweenManager.js sul conflitto con PointerLockControls.
const tweenManager = new TweenManager(TWEEN, { scene, canvas: renderer.domElement });

// ==========================================
// 3. AVVIO GIOCO (triggerato dal menu)
// ==========================================
document.addEventListener('startGameEvent', async (e) => {
    const difficulty = e.detail.difficulty;
    window.currentDifficulty = difficulty;

    // Reset batteria torcia per la nuova run
    torchBatteryPercent = 100;
    _torchDrainTimer = 0;
    _torchBatteryMult.mult = 1.0;
    _flickerStepTimer = 0;
    _flickerCurrentMult = 1.0;
    _fearFlickerStepTimer = 0;
    _fearFlickerCurrentMult = 1.0;
    _fearJitterTimer = 0;
    _fearJitterCurrent.x = 0;
    _fearJitterCurrent.y = 0;
    _fearJitterTarget.x = 0;
    _fearJitterTarget.y = 0;

    // Crea la mappa giusta
    if (difficulty === 'easy')        currentMap = new MapEasy(scene);
    else if (difficulty === 'medium') currentMap = new MapMedium(scene);
    else if (difficulty === 'hard')   currentMap = new MapHard(scene);
    else return;

    try {
        // La mappa si occupa di chiamare InteriorAssetManager.preloadAll() internamente
        await Promise.all([
            currentMap.load(),
            AudioSystem.preloadAll()
        ]);

        const collisionBoxes = currentMap.getCollisionBoxes();
        const triggerZones   = currentMap.getTriggerZones();

        // Spawn mostro
        mostroMesh = monster.getMesh();
        const spawnPos = currentMap.getMonsterSpawn();
        mostroMesh.position.copy(spawnPos);
        mostroMesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow    = true;
                child.receiveShadow = true;
            }
        });
        scene.add(mostroMesh);
        monster.initAudio();

        // Posiziona camera e crea controller
        const playerSpawn = currentMap.getPlayerSpawn();
        camera.position.copy(playerSpawn);
        
        if (currentMap.getPlayerRotationY) {
            const rotY = currentMap.getPlayerRotationY();
            camera.rotation.set(0, rotY, 0);
            camera.updateMatrixWorld();
        }

        scene.add(camera);
        camera.add(AudioSystem.listener); // Add listener to camera
        player = new PlayerController(camera, renderer.domElement, collisionBoxes, triggerZones);

        // Start BGM
        AudioSystem.startBGM();

        // Tutto pronto: nascondi loading, mostra istruzioni
        document.dispatchEvent(new Event('assetsLoadedEvent'));

    } catch (err) {
        console.error('[main.js] Errore durante il caricamento della mappa:', err);
        document.getElementById('error-log').innerText += '\nErrore: ' + err.message;
    }
});

// ==========================================
// 4. ASCOLTO EVENTI DI GIOCO
// ==========================================
document.addEventListener('uiTargetChanged', (e) => {
    if (e.detail.name) console.log(`[UI]: Mirino su -> ${e.detail.name}`);
});

document.addEventListener('itemRaccolto', (e) => {
    console.log('[GIOCO]: Raccolto chiave!');
    AudioSystem.playSound('pickup');
    // La rimozione dalla scena avviene a fine animazione dentro TweenManager
    // (l'oggetto vola via, ruota e si rimpicciolisce prima di sparire).
    if (currentMap) currentMap._goalKeyGroup = null;
    document.dispatchEvent(new CustomEvent('logMessaggioUI', { detail: { testo: 'Key collected! Return to the golden door.' } }));
    if (e.detail.idChiave === 'chiave_goal') {
        const keyHud = document.getElementById('key-hud');
        if (keyHud) keyHud.style.display = 'flex';
    }
});

document.addEventListener('portaAperta', (e) => {
    const hitMesh = e.detail.object;
    const hinge = hitMesh.parentHinge || hitMesh;

    // Block interaction while the door is still mid-swing
    if (hinge.userData.isAnimating) return;
    // Block closing until the door is fully open
    if (!hinge.userData.isOpen && hinge.userData.isAnimating) return;

    const wasOpen = hinge.userData.isOpen;
    hinge.userData.isOpen     = !wasOpen;
    hinge.userData.isAnimating = true;

    if (wasOpen) {
        // ── CLOSING ─────────────────────────────────────────────────────
        // Restore closed collision box immediately so the player can't
        // slip through while the door is swinging shut.
        if (hinge.userData.collisionBox && hinge.userData.closedBoxMin) {
            hinge.userData.collisionBox.set(
                hinge.userData.closedBoxMin,
                hinge.userData.closedBoxMax
            );
        }
        
        AudioSystem.playPositionalSoundAt('close_door', scene, hinge.position, 10, 1.0);
        
        const targetY = hinge.userData.startRotationY;
        new TWEEN.Tween(hinge.rotation)
            .to({ y: targetY }, 800)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => { hinge.userData.isAnimating = false; })
            .start();
    } else {
        // ── OPENING ─────────────────────────────────────────────────────
        // Clear collision during the swing so the player can walk through.
        if (hinge.userData.collisionBox) {
            hinge.userData.collisionBox.makeEmpty();
        }
        
        AudioSystem.playPositionalSoundAt('open_door', scene, hinge.position, 10, 1.0);

        const targetY = hinge.userData.startRotationY + (Math.PI / 2);
        new TWEEN.Tween(hinge.rotation)
            .to({ y: targetY }, 800)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                // Recompute the box from the hinge's world-space position at 90°
                // so the open door still physically blocks movement.
                hinge.updateMatrixWorld(true);
                hinge.userData.collisionBox.setFromObject(hinge);
                hinge.userData.isAnimating = false;
            })
            .start();
    }
});

document.addEventListener('portaGoalAperta', (e) => {
    if (currentMap && currentMap._goalDoorBox) currentMap._goalDoorBox.makeEmpty();
    const group = e.detail.object.parent || e.detail.object;

    // Lock player movement immediately — prevents walking into void through
    // the now-collision-free gap in the wall during the win animation.
    if (player) player.controls.unlock();

    AudioSystem.playPositionalSoundAt('door_key', scene, group.position, 10, 1.0);

    new TWEEN.Tween(group.scale)
        .to({ x: 0.001, y: 0.001, z: 0.001 }, 600)
        .easing(TWEEN.Easing.Back.In)
        .onComplete(() => { scene.remove(group); setTimeout(showWinScreen, 400); })
        .start();
    document.dispatchEvent(new CustomEvent('logMessaggioUI', { detail: { testo: 'The door opens... You are free!' } }));
});

document.addEventListener('horrorTrigger', (e) => {
    console.warn(`[TRIGGER]: Zona: ${e.detail.eventName}`);
    if (e.detail.eventName === 'GOAL_REACHED') {
        AudioSystem.playSound('puzzle_solved');
        showWinScreen();
    }
});


function showWinScreen() {
    if (player) player.controls.unlock();
    const win = document.getElementById('win-overlay');
    if (win) {
        win.style.display = 'flex';
    }
}


document.addEventListener('playerMorto', () => {
    AudioSystem.playSound('blood_splash');

    // Animazione di attacco del mostro (scatto delle braccia/artigli)
    monster.attack();

    // Jumpscare: flash rosso + scossa di camera, gestiti dal TweenManager
    document.dispatchEvent(new CustomEvent('horrorTrigger', { detail: { eventName: 'PLAYER_ATTACKED' } }));

    // Piccolo ritardo per lasciar vedere l'attacco prima della schermata "YOU DIED"
    setTimeout(showGameOverScreen, 450);
});

document.addEventListener('pointerlockchange', () => {
    if (!player) return;
    const locked = document.pointerLockElement === document.body
                || document.pointerLockElement?.tagName === 'CANVAS';
    if (locked) {
        AudioSystem.playSound('close_menu');
    } else {
        AudioSystem.playSound('open_menu');
    }
});

function showGameOverScreen() {
    if (player) player.controls.unlock();
    const over = document.getElementById('gameover-overlay');
    if (over) {
        over.style.display = 'flex';
    }
}

// ==========================================
// 4b. OSCILLAZIONE DELLA TORCIA BASATA SUI PASSI
// RESPONSABILE: Federico (Regista)
// La torcia (SpotLight + modello FBX) segue già lo sguardo perché è figlia
// della camera (PlayerController.js). Qui aggiungiamo solo un lieve bob/sway
// procedurale in base al movimento del giocatore, senza toccare la logica
// di collisione/input che appartiene a PlayerController.
// ==========================================
let _torchSwayTime = 0;
const _fearJitterCurrent = { x: 0, y: 0 };
const _fearJitterTarget  = { x: 0, y: 0 };
let _fearJitterTimer = 0;

function updateTorchSway(deltaTime, fearFactor = 0) {
    if (!player || !player.flashlight) return;

    const isWalking = player.controls.isLocked &&
        (player.keys.forward || player.keys.backward || player.keys.left || player.keys.right);
    const speedMul = player.isSprinting ? 1.9 : 1.0;

    _torchSwayTime += deltaTime * (isWalking ? 6.5 * speedMul : 1.0);

    // Ampiezze marcate durante il cammino, per un dondolio di mano ben
    // percepibile (non solo un lieve tremolio) — quasi il doppio di prima.
    const bobAmount  = isWalking ? 0.09  : 0.012; // oscillazione verticale (su/giù ad ogni passo)
    const swayAmount = isWalking ? 0.075 : 0.008; // oscillazione laterale (sx/dx ad ogni passo)
    const pushAmount = isWalking ? 0.035 : 0.0;   // leggera spinta avanti ad ogni passo
    const tiltAmount = isWalking ? 0.06  : 0.015; // inclinazione (roll) del modello visivo

    const bobY  = Math.sin(_torchSwayTime * 2) * bobAmount;
    const swayX = Math.cos(_torchSwayTime)     * swayAmount;
    const pushZ = Math.abs(Math.sin(_torchSwayTime * 2)) * pushAmount;

    // ─────────────────────────────────────────────────────────────
    // TREMORE DA PAURA — versione "smussata": invece di saltare a un
    // valore random ogni singolo frame (che a 60fps legge come un glitch),
    // ci si muove morbidamente (lerp) verso un nuovo bersaglio random
    // generato ogni ~90ms. Ampiezza volutamente contenuta: la sensazione
    // di frenesia la dà soprattutto il flicker della LUCE qui sotto
    // (computeFearFlickerMult), non lo scuotimento fisico dell'oggetto.
    // ─────────────────────────────────────────────────────────────
    _fearJitterTimer += deltaTime;
    const fearJitterMaxAmount = fearFactor * fearFactor * 0.035; // molto più contenuto di prima
    if (_fearJitterTimer >= 0.09) {
        _fearJitterTimer = 0;
        _fearJitterTarget.x = (Math.random() - 0.5) * fearJitterMaxAmount;
        _fearJitterTarget.y = (Math.random() - 0.5) * fearJitterMaxAmount;
    }
    const jitterLerp = 1 - Math.pow(0.0001, deltaTime); // smoothing costante nel tempo, non frame-rate dependent
    _fearJitterCurrent.x += (_fearJitterTarget.x - _fearJitterCurrent.x) * jitterLerp;
    _fearJitterCurrent.y += (_fearJitterTarget.y - _fearJitterCurrent.y) * jitterLerp;

    const fearJitterX = _fearJitterCurrent.x;
    const fearJitterY = _fearJitterCurrent.y;

    const totalX = swayX + fearJitterX;
    const totalY = bobY  + fearJitterY;

    // Applica l'offset in modo relativo alla posizione base "di riposo" di
    // ogni oggetto (memorizzata al primo frame utile), così l'effetto resta
    // valido qualunque sia la posizione originale scelta da PlayerController.
    for (const obj of [player.flashlight, player.flashlightModel]) {
        if (!obj) continue;
        if (!obj.userData._swayBase) {
            obj.userData._swayBase = obj.position.clone();
        }
        const base = obj.userData._swayBase;
        obj.position.set(base.x + totalX, base.y + totalY, base.z + pushZ);
    }

    // Leggera rotazione (roll) del solo MODELLO VISIVO della torcia: puramente
    // cosmetica, non tocca la direzione reale del fascio (governata da
    // flashlight.target, animato più sotto), quindi nessun rischio di
    // "sfasare" il cono di luce rispetto a dove il giocatore sta guardando.
    if (player.flashlightModel) {
        if (player.flashlightModel.userData._swayBaseRotZ === undefined) {
            player.flashlightModel.userData._swayBaseRotZ = player.flashlightModel.rotation.z;
        }
        const baseRotZ = player.flashlightModel.userData._swayBaseRotZ;
        player.flashlightModel.rotation.z = baseRotZ + Math.cos(_torchSwayTime) * tiltAmount + fearJitterX * 1.5;
    }

    // Il target della torcia (verso cui punta il fascio) segue con un
    // offset più leggero per non far "impazzire" il cono di luce.
    if (player.flashlight.target) {
        if (!player.flashlight.target.userData._swayBase) {
            player.flashlight.target.userData._swayBase = player.flashlight.target.position.clone();
        }
        const baseT = player.flashlight.target.userData._swayBase;
        player.flashlight.target.position.set(
            baseT.x + fearJitterX * 0.5,
            baseT.y + bobY * 0.4 + fearJitterY * 0.5,
            baseT.z
        );
    }
}

// ==========================================
// 4c-bis. FLICKER DA PAURA (Regista)
// Quando il mostro è vicino, la LUCE diventa nervosa/instabile — è questo,
// più che lo scuotimento fisico, a comunicare la frenesia. Stesso schema
// del flicker da batteria scarica: frequenza e profondità crescono con
// fearFactor. Si combina moltiplicativamente con quello della batteria.
// ==========================================
let _fearFlickerStepTimer = 0;
let _fearFlickerCurrentMult = 1.0;

function computeFearFlickerMult(deltaTime, fearFactor) {
    if (fearFactor <= 0.02) {
        _fearFlickerCurrentMult = 1.0;
        return 1.0;
    }

    const flickerFreqHz = 2 + fearFactor * 16;   // fino a ~18 scatti al secondo quando è vicinissimo
    const flickerDepth  = 0.1 + fearFactor * 0.55; // fino a un calo drastico

    _fearFlickerStepTimer += deltaTime;
    const stepDuration = 1 / flickerFreqHz;
    if (_fearFlickerStepTimer >= stepDuration) {
        _fearFlickerStepTimer = 0;
        _fearFlickerCurrentMult = Math.random() < 0.55 ? (1 - flickerDepth) : 1.0;
    }
    return _fearFlickerCurrentMult;
}

// ==========================================
// 4d. SFARFALLIO INTENSO SOTTO IL 40% DI BATTERIA (Regista)
// Effetto continuo (non un tween "a scatti"): sotto la soglia, la luce
// scatta rapidamente tra piena intensità e un valore ridotto, con
// frequenza e profondità che crescono man mano che la batteria si
// avvicina al minimo. Applicato come ULTERIORE moltiplicatore, nello
// stesso punto sicuro (dopo player.update()) usato per la dissolvenza
// della batteria — mai in conflitto con lo sfarfallio di PlayerController.
// ==========================================
const TORCH_FLICKER_THRESHOLD_PERCENT = 40;
let _flickerStepTimer = 0;
let _flickerCurrentMult = 1.0;

function computeLowBatteryFlickerMult(deltaTime, percent) {
    if (percent > TORCH_FLICKER_THRESHOLD_PERCENT) {
        _flickerCurrentMult = 1.0;
        return 1.0;
    }

    // severity: 0 appena sotto soglia (40%) → 1 al minimo (30%)
    const severity = Math.min(1, Math.max(0,
        (TORCH_FLICKER_THRESHOLD_PERCENT - percent) / (TORCH_FLICKER_THRESHOLD_PERCENT - TORCH_BATTERY_MIN_PERCENT)
    ));

    const flickerFreqHz = 3 + severity * 15;   // da ~3 a ~18 scatti al secondo
    const flickerDepth  = 0.3 + severity * 0.6; // da un calo lieve a un calo drastico

    _flickerStepTimer += deltaTime;
    const stepDuration = 1 / flickerFreqHz;
    if (_flickerStepTimer >= stepDuration) {
        _flickerStepTimer = 0;
        _flickerCurrentMult = Math.random() < 0.5 ? (1 - flickerDepth) : 1.0;
    }

    return _flickerCurrentMult;
}

// ==========================================
// 4c. BATTERIA TORCIA — si scarica nel tempo (Regista)
// Timer indipendente da PlayerController: decrementa la percentuale a step
// di 1%, poi notifica il TweenManager che anima morbidamente il nuovo
// livello di luce (invece di un salto secco).
// ==========================================
function updateTorchBattery(deltaTime) {
    if (!player || torchBatteryPercent <= TORCH_BATTERY_MIN_PERCENT) return;

    _torchDrainTimer += deltaTime;
    if (_torchDrainTimer >= TORCH_DRAIN_INTERVAL_SEC) {
        _torchDrainTimer = 0;
        torchBatteryPercent = Math.max(TORCH_BATTERY_MIN_PERCENT, torchBatteryPercent - 1);

        // norm: 1 = batteria piena, 0 = al minimo (usato per restringere fascio/portata)
        const norm = (torchBatteryPercent - TORCH_BATTERY_MIN_PERCENT) / (100 - TORCH_BATTERY_MIN_PERCENT);

        document.dispatchEvent(new CustomEvent('torciaScarica', {
            detail: {
                percent: torchBatteryPercent,
                norm,
                proxy: _torchBatteryMult,
                torcia: player.flashlight, // angle/distance: sicuri da animare in diretta (PlayerController non li tocca mai)
            }
        }));
    }
}

// ==========================================
// 5. LOOP DI RENDERING
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    // Clamp deltaTime to 100 ms max — large spikes (tab switch, lag) would cause
    // the player and monster to take huge movement steps that bypass collision
    // detection, resulting in teleportation outside the map.
    const deltaTime = Math.min(clock.getDelta(), 0.1);

    if (player && mostroMesh) {
        player.update(deltaTime, mostroMesh);

        // Distanza dal mostro e "fattore paura" calcolati subito, così sia il
        // dondolio della torcia sia il flicker della luce (più sotto) sia
        // BGM/AI possono usarli.
        const targetVector = new THREE.Vector3().subVectors(camera.position, mostroMesh.position);
        targetVector.y = 0;
        const distanza = targetVector.length();

        let fearFactor = 0;
        if (player.mostroAggroRadius) {
            const farEdge  = player.mostroAggroRadius;
            const nearEdge = player.mostroDamageRadius || 1.2;
            fearFactor = 1 - Math.min(1, Math.max(0, (distanza - nearEdge) / (farEdge - nearEdge)));
        }

        updateTorchSway(deltaTime, fearFactor);
        updateTorchBattery(deltaTime);

        // Applica il calo batteria SOPRA l'intensità che PlayerController ha
        // appena calcolato per questo frame (base + eventuale sfarfallio).
        // Va fatto qui, dopo player.update(), altrimenti verrebbe sovrascritto.
        if (player.flashlight) {
            const batteryFlickerMult = computeLowBatteryFlickerMult(deltaTime, torchBatteryPercent);
            const fearFlickerMult    = computeFearFlickerMult(deltaTime, fearFactor);
            player.flashlight.intensity *= _torchBatteryMult.mult * batteryFlickerMult * fearFlickerMult;
        }

        const isMoving = player.controls.isLocked
            && distanza <= player.mostroAggroRadius
            && distanza > player.mostroDamageRadius;
            
        // Manage BGM state based on distance
        if (distanza <= player.mostroAggroRadius) {
            AudioSystem.setBGMState('ambience');
        } else {
            AudioSystem.setBGMState('doom');
        }

        monster.update(deltaTime, isMoving);
    }

    if (currentMap && currentMap.update) {
        currentMap.update(deltaTime, camera);
    }

    renderer.render(scene, camera);
}
animate();

// Gestione resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Click su instructions → sblocca puntatore (registrato una sola volta)
document.getElementById('instructions').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (player) player.controls.lock();
});