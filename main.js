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
// che PlayerController calcola ogni frame (incluso il suo sfarfallio
// casuale) — MAI scrivendo light.intensity direttamente da qui, altrimenti
// i due sistemi si sovrascriverebbero a vicenda in modo imprevedibile
// (stesso tipo di conflitto già visto con la camera).
const TORCH_BATTERY_MIN_PERCENT = 30;  // percentuale minima di luce residua
const TORCH_DRAIN_INTERVAL_SEC  = 1;   // ogni quanti secondi perde l'1% (valore di test scelto dall'utente)
let torchBatteryPercent = 100;
let _torchDrainTimer = 0;
const _torchBatteryMult = { mult: 1.0 }; // valore animato in tween, applicato ogni frame

// Gestore centralizzato dei tween "cosmetici" (jumpscare, raccolta oggetti, ecc.)
// RESPONSABILE: Federico (Regista) — vedi src/animations/TweenManager.js
// NB: passiamo il canvas (per lo screen-shake CSS), MAI la camera —
// vedi nota in TweenManager.js sul conflitto con PointerLockControls.
const tweenManager = new TweenManager(TWEEN, { scene, canvas: renderer.domElement });

// ==========================================
// MODALITÀ TEST ANIMAZIONI MOSTRO (Regista) — SOLO PER SVILUPPO/TESTING
// Premi G per attivarla/disattivarla in qualunque momento durante il gioco.
// Con godmode ON, il mostro continua a vederti/inseguirti/attaccarti (con
// tanto di animazione + jumpscare) ma NON puoi morire — utile per osservare
// con calma camminata/idle/attacco senza dover scappare o morire dopo pochi
// frame. Di default è SEMPRE disattivata (window.DEBUG_GODMODE = false).
// Ricorda di verificare che sia disattivata prima della consegna finale
// (di default lo è: si attiva solo premendo G a mano).
// ==========================================
window.DEBUG_GODMODE = false;
document.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyG') return;
    window.DEBUG_GODMODE = !window.DEBUG_GODMODE;
    const stato = window.DEBUG_GODMODE ? 'ON (immortale)' : 'OFF';
    console.log(`[DEBUG] Godmode: ${stato}`);
    document.dispatchEvent(new CustomEvent('logMessaggioUI', { detail: { testo: `DEBUG Godmode: ${stato}` } }));
});

document.addEventListener('playerAttaccatoDebug', () => {
    // Stessa animazione/jumpscare della morte vera, ma senza fine partita:
    // permette di osservare l'attacco del mostro ripetutamente.
    monster.attack();
    document.dispatchEvent(new CustomEvent('horrorTrigger', { detail: { eventName: 'PLAYER_ATTACKED' } }));
});

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
    _fearOscTime = 0;

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
    const idChiave = e.detail.idChiave;
    // La rimozione dalla scena avviene a fine animazione dentro TweenManager
    // (l'oggetto vola via, ruota e si rimpicciolisce prima di sparire).

    if (typeof idChiave === 'string' && idChiave.startsWith('batteria')) {
        // ── Batteria di ricarica torcia (Regista) ─────────────────────
        console.log(`[GIOCO]: Raccolta ${idChiave}!`);
        AudioSystem.playSound('pickup');
        if (currentMap) currentMap.removeBattery(idChiave);
        rechargeTorchBattery();
        document.dispatchEvent(new CustomEvent('logMessaggioUI', { detail: { testo: 'Battery found! Flashlight fully recharged.' } }));
        return;
    }

    // ── Chiave normale (comportamento originale) ──────────────────────
    console.log('[GIOCO]: Raccolto chiave!');
    AudioSystem.playSound('pickup');
    if (currentMap) currentMap._goalKeyGroup = null;
    document.dispatchEvent(new CustomEvent('logMessaggioUI', { detail: { testo: 'Key collected! Return to the golden door.' } }));
    if (idChiave === 'chiave_goal') {
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


document.addEventListener('mostroAttacca', () => {
    // Il mostro è abbastanza vicino da colpire (Regista: mostroAttackRadius,
    // "un paio di passi" invece che incollato): parte l'animazione di
    // attacco. Il game over vero e proprio arriva più tardi con 'playerMorto',
    // sincronizzato con il momento di impatto dell'animazione.
    monster.attack();
});

// ==========================================
// MACCHIA DI SANGUE SUGLI OCCHI (Regista)
// Tecnica CSS: blob organico (border-radius irregolare a 8 valori) +
// radial-gradient per l'effetto "bagnato/lucido" + box-shadow multipli per
// le gocce sparse attorno (nessun elemento DOM extra per le gocce — molto
// più leggero ed efficace dei semplici cerchi sfocati del primo tentativo).
// Tutto generato/randomizzato in JS: diverso ad ogni morte.
// ==========================================
function _randRange(min, max) { return min + Math.random() * (max - min); }

const _BLOOD_PALETTE = ['#8a0303', '#800000', '#7a0000', '#920404', '#5c0000', '#4a0000', '#3a0000', '#2a0000'];
function _randomBloodColor() {
    return _BLOOD_PALETTE[Math.floor(Math.random() * _BLOOD_PALETTE.length)];
}

/** 8 valori random per un blob organico stondato (4 angoli x 2 assi) */
function _randomBorderRadius() {
    const r = () => Math.round(_randRange(30, 70));
    return `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;
}

/** Crea un singolo "schizzo" di sangue: blob organico + gocce sparse via box-shadow */
function _makeBloodBlast(topVh, leftVw, sizeVw) {
    const el = document.createElement('div');
    el.className = 'blood-blob';
    el.style.position = 'absolute';
    el.style.top    = `${topVh}vh`;
    el.style.left   = `${leftVw}vw`;
    el.style.width  = `${sizeVw.toFixed(1)}vw`;
    el.style.height = `${(sizeVw * _randRange(0.8, 1.2)).toFixed(1)}vw`;
    el.style.borderRadius = _randomBorderRadius();
    el.style.transform = `rotate(${_randRange(-40, 40).toFixed(0)}deg)`;

    // Sfumatura radiale con punto luce spostato: dà l'effetto "bagnato/lucido"
    const light = _randomBloodColor();
    const mid   = _randomBloodColor();
    const dark  = _randomBloodColor();
    el.style.background = `radial-gradient(circle at ${Math.round(_randRange(25, 45))}% ${Math.round(_randRange(25, 45))}%, ${light} 0%, ${mid} 65%, ${dark} 100%)`;

    // Gocce sparse attorno al blob principale, via box-shadow: tecnica
    // efficiente, nessun elemento DOM aggiuntivo per ogni goccia.
    const dropletCount = 3 + Math.floor(Math.random() * 4);
    const shadows = [];
    for (let i = 0; i < dropletCount; i++) {
        const dx     = _randRange(-9, 9).toFixed(1);
        const dy     = _randRange(-9, 9).toFixed(1);
        const blur   = _randRange(0, 1.5).toFixed(1);
        const spread = -_randRange(1.5, 3.5).toFixed(1);
        shadows.push(`${dx}vw ${dy}vh ${blur}px ${spread}px ${_randomBloodColor()}`);
    }
    el.style.boxShadow = shadows.join(', ');

    return el;
}

function generateBloodSplatter() {
    const container = document.getElementById('blood-splatter-overlay');
    if (!container) return;
    container.innerHTML = ''; // pulisce eventuali macchie di una morte precedente

    // 5 schizzi principali, concentrati verso bordi/angoli — il centro
    // resta più leggibile, come vero sangue schizzato sulla lente/sugli occhi
    const positions = [
        { top: _randRange(2, 20),  left: _randRange(2, 20) },
        { top: _randRange(2, 18),  left: _randRange(78, 96) },
        { top: _randRange(75, 95), left: _randRange(2, 20) },
        { top: _randRange(75, 95), left: _randRange(75, 95) },
        { top: _randRange(80, 96), left: _randRange(38, 58) },
    ];
    for (const pos of positions) {
        const size = _randRange(9, 15); // vw
        container.appendChild(_makeBloodBlast(pos.top, pos.left, size));
    }

    // Qualche goccia isolata più piccola, sparsa verso il centro per
    // "collegare" visivamente gli schizzi principali
    const extraDroplets = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < extraDroplets; i++) {
        const size = _randRange(2, 4.5);
        container.appendChild(_makeBloodBlast(_randRange(15, 80), _randRange(15, 80), size));
    }
}

document.addEventListener('playerMorto', () => {
    AudioSystem.playSound('blood_splash');

    // Macchia di sangue "sugli occhi": blob organici generati al volo,
    // diversi ad ogni morte (compare di scatto al momento del colpo)
    generateBloodSplatter();
    const bloodOverlay = document.getElementById('blood-splatter-overlay');
    if (bloodOverlay) {
        bloodOverlay.style.transition = 'opacity 150ms ease-out';
        bloodOverlay.style.opacity = '1';
    }

    // Jumpscare: flash rosso + scossa di schermo, gestiti dal TweenManager
    document.dispatchEvent(new CustomEvent('horrorTrigger', { detail: { eventName: 'PLAYER_ATTACKED' } }));

    // Dopo un momento (il sangue resta a schermo, la scossa si placa), tutto
    // dissolve lentamente a nero riusando #fade-overlay...
    setTimeout(() => {
        const fadeOverlay = document.getElementById('fade-overlay');
        if (fadeOverlay) {
            fadeOverlay.style.transition = 'opacity 900ms ease-in';
            fadeOverlay.style.backgroundColor = '#000';
            fadeOverlay.style.opacity = '1';
        }
    }, 700);

    // ...e la scritta "YOU DIED" sfuma dentro dal buio (vedi showGameOverScreen),
    // invece di comparire di colpo come prima.
    setTimeout(showGameOverScreen, 700 + 900);
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
        // Forza un reflow prima di attivare la transizione di opacità: senza
        // questo il browser rischia di "fondere" il cambio di display e
        // quello di opacity nello stesso frame, saltando l'animazione.
        void over.offsetWidth;
        over.style.opacity = '1';
    }
}

// ==========================================
// 4b. OSCILLAZIONE DELLA TORCIA — 3 stati di movimento + livello di paura
// RESPONSABILE: Federico (Regista)
// La torcia (SpotLight + modello FBX) segue già lo sguardo perché è figlia
// della camera (PlayerController.js). Qui aggiungiamo un dondolio/oscillazione
// procedurale che varia in ampiezza e velocità a seconda dello stato:
//
//   FERMI    -> oscillazione minima, lenta, sinusoidale (percepibile ma lieve)
//   CAMMINO  -> oscillazione ben visibile, su/giu e sx/dx, come un braccio
//               che accompagna il passo
//   SPRINT   -> oscillazione ancora piu ampia e meno "controllata" (corriamo,
//               non pensiamo a tenerla ferma, basta che illumini davanti)
//   PAURA    -> si SOMMA a uno qualsiasi degli stati sopra un movimento extra,
//               scattoso/irregolare, che cresce quanto piu il mostro e vicino
//               (funziona anche da fermi, non richiede movimento)
//
// In ogni stato il FASCIO (flashlight.target) oscilla piu ampiamente della
// torcia fisica stessa: e il fascio di luce sulle pareti a dover comunicare
// chiaramente il movimento, la torcia trema meno (altrimenti sembra un
// oggetto scollegato dalla mano che lo regge).
// ==========================================
let _torchSwayTime = 0;
let _fearOscTime = 0;

function updateTorchSway(deltaTime, fearFactor = 0) {
    if (!player || !player.flashlight) return;

    const isWalking   = player.controls.isLocked &&
        (player.keys.forward || player.keys.backward || player.keys.left || player.keys.right);
    const isSprinting = isWalking && player.isSprinting;

    // -- 1. Parametri di base per lo stato di movimento corrente ----------
    // timeSpeed  = velocita dell'oscillazione (Hz-ish)
    // bobAmount  = ampiezza verticale (su/giu) della TORCIA
    // swayAmount = ampiezza laterale (sx/dx) della TORCIA
    // pushAmount = leggera spinta avanti ad ogni "passo"
    // tiltAmount = inclinazione (roll) del modello visivo
    // aimMult    = quanto piu ampio oscilla il FASCIO rispetto alla torcia
    let timeSpeed, bobAmount, swayAmount, pushAmount, tiltAmount, aimMult;

    if (isSprinting) {
        // Corsa: molto mossa, poco controllata -- basta che illumini davanti
        timeSpeed  = 11.0;
        bobAmount  = 0.16;  swayAmount = 0.13;
        pushAmount = 0.05;  tiltAmount = 0.11;
        aimMult    = 2.3;
    } else if (isWalking) {
        // Camminata: dondolio ben evidente, come un braccio che accompagna il passo
        timeSpeed  = 6.5;
        bobAmount  = 0.09;  swayAmount = 0.075;
        pushAmount = 0.035; tiltAmount = 0.06;
        aimMult    = 1.8;
    } else {
        // Fermi: oscillazione minima ma percepibile, sinusoidale e lieve
        timeSpeed  = 1.3;
        bobAmount  = 0.018; swayAmount = 0.015;
        pushAmount = 0.0;   tiltAmount = 0.02;
        aimMult    = 1.5;
    }

    _torchSwayTime += deltaTime * timeSpeed;

    const bobY  = Math.sin(_torchSwayTime * 2) * bobAmount;
    const swayX = Math.cos(_torchSwayTime)     * swayAmount;
    const pushZ = Math.abs(Math.sin(_torchSwayTime * 2)) * pushAmount;

    // Il fascio (target) usa una fase leggermente sfasata sull'asse verticale
    // rispetto alla torcia fisica, per un moto naturale (non a specchio),
    // ed e amplificato da aimMult cosi il movimento sulle pareti e ben visibile.
    const aimX = swayX * aimMult;
    const aimY = Math.sin(_torchSwayTime * 2 + 0.5) * bobAmount * aimMult;

    // -----------------------------------------------------------------
    // PAURA -- si somma SOPRA lo stato di movimento corrente (fermi, cammino
    // o sprint) un tremore scattoso e irregolare, che funziona anche da
    // fermi e non richiede movimento. Il tempo scorre sempre e accelera con
    // fearFactor: piu il mostro e vicino, piu i movimenti sono rapidi.
    // Sommiamo due onde a frequenze/fasi diverse -> oscillazione irregolare
    // "a scatti", diversa dalla sinusoide regolare del passo/sprint.
    // -----------------------------------------------------------------
    _fearOscTime += deltaTime * (2.5 + fearFactor * 9);

    const fearAmp = fearFactor * fearFactor; // cresce di piu quando il mostro e VICINO (curva quadratica)

    const oscX = Math.sin(_fearOscTime * 2.2)       * 0.6 + Math.sin(_fearOscTime * 5.3 + 1.7) * 0.4;
    const oscY = Math.cos(_fearOscTime * 1.8 + 0.5) * 0.6 + Math.cos(_fearOscTime * 4.6)        * 0.4;

    const FEAR_AIM_MAX_OFFSET   = 0.5;   // il FASCIO si muove tanto quando la paura e massima
    const FEAR_TORCH_MAX_OFFSET = 0.035; // la TORCIA fisica trema molto meno

    const fearAimX   = oscX * fearAmp * FEAR_AIM_MAX_OFFSET;
    const fearAimY   = oscY * fearAmp * FEAR_AIM_MAX_OFFSET;
    const fearTorchX = oscX * fearAmp * FEAR_TORCH_MAX_OFFSET;
    const fearTorchY = oscY * fearAmp * FEAR_TORCH_MAX_OFFSET;

    const totalX = swayX + fearTorchX;
    const totalY = bobY  + fearTorchY;

    // Applica l'offset in modo relativo alla posizione base "di riposo" di
    // ogni oggetto (memorizzata al primo frame utile), cosi l'effetto resta
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
    // flashlight.target, animato piu sotto), quindi nessun rischio di
    // "sfasare" il cono di luce rispetto a dove il giocatore sta guardando.
    if (player.flashlightModel) {
        if (player.flashlightModel.userData._swayBaseRotZ === undefined) {
            player.flashlightModel.userData._swayBaseRotZ = player.flashlightModel.rotation.z;
        }
        const baseRotZ = player.flashlightModel.userData._swayBaseRotZ;
        player.flashlightModel.rotation.z = baseRotZ + Math.cos(_torchSwayTime) * tiltAmount + fearTorchX * 2.0;
    }

    // Il FASCIO (il target) oscilla piu ampiamente della torcia fisica in
    // ogni stato (fermi/cammino/sprint), e la paura si aggiunge sopra:
    // e questo a comunicare davvero il movimento sulle pareti.
    if (player.flashlight.target) {
        if (!player.flashlight.target.userData._swayBase) {
            player.flashlight.target.userData._swayBase = player.flashlight.target.position.clone();
        }
        const baseT = player.flashlight.target.userData._swayBase;
        player.flashlight.target.position.set(
            baseT.x + aimX + fearAimX,
            baseT.y + aimY + fearAimY,
            baseT.z
        );
    }
}

// ==========================================
// 4c-ter. RICARICA TORCIA — raccolta batteria (Regista)
// Riporta la batteria al 100% e riusa esattamente lo stesso evento/tween
// della dissolvenza di scarica (norm=1 → angle/distance/intensità tornano
// al massimo con la stessa animazione morbida, nessun codice duplicato).
// ==========================================
function rechargeTorchBattery() {
    if (!player || !player.flashlight) return;

    torchBatteryPercent = 100;
    _torchDrainTimer = 0;

    document.dispatchEvent(new CustomEvent('torciaScarica', {
        detail: {
            percent: torchBatteryPercent,
            norm: 1,
            proxy: _torchBatteryMult,
            torcia: player.flashlight,
        }
    }));
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
            const nearEdge = player.mostroAttackRadius || 2.5;
            fearFactor = 1 - Math.min(1, Math.max(0, (distanza - nearEdge) / (farEdge - nearEdge)));
        }

        updateTorchSway(deltaTime, fearFactor);
        updateTorchBattery(deltaTime);

        // Applica il calo batteria SOPRA l'intensità che PlayerController ha
        // appena calcolato per questo frame (base + eventuale sfarfallio).
        // Va fatto qui, dopo player.update(), altrimenti verrebbe sovrascritto.
        // NB: la paura NON tocca l'intensità — muove solo la mira del fascio
        // (vedi updateTorchSway/fearFactor qui sopra).
        if (player.flashlight) {
            const batteryFlickerMult = computeLowBatteryFlickerMult(deltaTime, torchBatteryPercent);
            player.flashlight.intensity *= _torchBatteryMult.mult * batteryFlickerMult;
        }

        const isMoving = player.controls.isLocked
            && distanza <= player.mostroAggroRadius
            && distanza > (player.mostroAttackRadius || 2.5);
            
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