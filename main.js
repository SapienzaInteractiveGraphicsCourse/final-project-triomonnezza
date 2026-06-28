import * as THREE from 'three';
import { PlayerController } from './src/core/PlayerController.js';
import { Monster } from './src/entities/Monster.js';
import { MapEasy } from './src/world/maps/MapEasy.js';
import { MapMedium } from './src/world/maps/MapMedium.js';
import { MapHard } from './src/world/maps/MapHard.js';
import { InteriorAssetManager } from './src/world/InteriorAssetManager.js';
import * as TWEEN from '@tweenjs/tween.js';

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

// Luce ambientale abbassata per atmosfera più cupa
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

// Luce direzionale per dare profondità 3D (abbassata)
const dirLight = new THREE.DirectionalLight(0xffeedd, 0.2);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// ==========================================
// 2. VARIABILI GLOBALI DI STATO
// ==========================================
let currentMap = null;
let player = null;
let mostroMesh = null;
const monster = new Monster();

// ==========================================
// 3. AVVIO GIOCO (triggerato dal menu)
// ==========================================
document.addEventListener('startGameEvent', async (e) => {
    const difficulty = e.detail.difficulty;

    // Crea la mappa giusta
    if (difficulty === 'easy')        currentMap = new MapEasy(scene);
    else if (difficulty === 'medium') currentMap = new MapMedium(scene);
    else if (difficulty === 'hard')   currentMap = new MapHard(scene);
    else return;

    try {
        // Aspetta che tutti gli FBX/GLB siano caricati (con aggiornamento della loading bar)
        await Promise.all([
            InteriorAssetManager.preloadAll(),  // geometry + props GLB
        ]);

        // Carica la mappa (spawna asset già in memoria → sincrono)
        currentMap.load();

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

        // Posiziona camera e crea controller
        const playerSpawn = currentMap.getPlayerSpawn();
        camera.position.copy(playerSpawn);
        
        if (currentMap.getPlayerRotationY) {
            const rotY = currentMap.getPlayerRotationY();
            camera.rotation.set(0, rotY, 0);
            camera.updateMatrixWorld();
        }

        scene.add(camera);
        player = new PlayerController(camera, renderer.domElement, collisionBoxes, triggerZones);

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
    scene.remove(e.detail.object);
    if (currentMap) currentMap._goalKeyGroup = null;
    showHudMessage('Chiave raccolta! Torna alla porta dorata.');
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
        const targetY = hinge.userData.startRotationY;
        new TWEEN.Tween(hinge.rotation)
            .to({ y: targetY }, 800)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => { hinge.userData.isAnimating = false; })
            .start();
        document.dispatchEvent(new CustomEvent('logMessaggioUI', { detail: { testo: 'Door Closed' } }));
    } else {
        // ── OPENING ─────────────────────────────────────────────────────
        // Clear collision during the swing so the player can walk through.
        if (hinge.userData.collisionBox) {
            hinge.userData.collisionBox.makeEmpty();
        }
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
        document.dispatchEvent(new CustomEvent('logMessaggioUI', { detail: { testo: 'Door Opened' } }));
    }
});

document.addEventListener('portaGoalAperta', (e) => {
    if (currentMap && currentMap._goalDoorBox) currentMap._goalDoorBox.makeEmpty();
    const group = e.detail.object.parent || e.detail.object;
    new TWEEN.Tween(group.scale)
        .to({ x: 0.001, y: 0.001, z: 0.001 }, 600)
        .easing(TWEEN.Easing.Back.In)
        .onComplete(() => { scene.remove(group); setTimeout(showWinScreen, 400); })
        .start();
    showHudMessage('La porta si apre... Sei libero!');
});

document.addEventListener('logMessaggioUI', (e) => {
    showHudMessage(e.detail.testo);
});

document.addEventListener('horrorTrigger', (e) => {
    console.warn(`[TRIGGER]: Zona: ${e.detail.eventName}`);
    if (e.detail.eventName === 'GOAL_REACHED') showWinScreen();
});

function showHudMessage(text) {
    let hud = document.getElementById('hud-message');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'hud-message';
        Object.assign(hud.style, {
            position: 'fixed', bottom: '80px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.78)', color: '#FFD700',
            padding: '10px 24px', borderRadius: '8px',
            fontFamily: 'monospace', fontSize: '16px',
            border: '1px solid rgba(255,215,0,0.5)',
            pointerEvents: 'none', zIndex: '999',
            opacity: '0', transition: 'opacity 0.3s',
        });
        document.body.appendChild(hud);
    }
    hud.textContent = text;
    hud.style.opacity = '1';
    clearTimeout(hud._timeout);
    hud._timeout = setTimeout(() => { hud.style.opacity = '0'; }, 3500);
}

function showWinScreen() {
    if (player) player.controls.unlock();
    let win = document.getElementById('win-overlay');
    if (!win) {
        win = document.createElement('div');
        win.id = 'win-overlay';
        win.innerHTML = `
            <div style="text-align:center;padding:40px;background:rgba(0,0,0,0.85);
                        border:2px solid #FFD700;border-radius:16px;max-width:500px">
                <div style="font-size:3.5rem;margin-bottom:12px">&#x1F511;&#x1F6AA;</div>
                <h1 style="font-size:2.4rem;color:#FFD700;margin:0 0 8px">SEI SCAPPATO!</h1>
                <p style="font-size:1rem;color:#ccc;margin-bottom:28px">
                    Hai trovato la chiave dorata e aperto la porta dell'uscita.
                </p>
                <button onclick="location.reload()"
                    style="padding:12px 36px;background:#FFD700;color:#111;border:none;
                           border-radius:8px;font-size:1rem;cursor:pointer;
                           font-weight:bold;letter-spacing:1px">
                    GIOCA ANCORA
                </button>
            </div>`;
        Object.assign(win.style, {
            position: 'fixed', inset: '0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at center,rgba(26,10,0,0.6),rgba(0,0,0,0.95))',
            fontFamily: "'Segoe UI',sans-serif", zIndex: '9999',
        });
        document.body.appendChild(win);
    }
    win.style.display = 'flex';
}


document.addEventListener('playerMorto', () => {
    alert('GAME OVER: You have been defeated!');
    window.location.reload();
});

// ==========================================
// 5. LOOP DI RENDERING
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    const deltaTime = clock.getDelta();

    if (player && mostroMesh) {
        player.update(deltaTime, mostroMesh);

        const targetVector = new THREE.Vector3().subVectors(camera.position, mostroMesh.position);
        targetVector.y = 0;
        const distanza = targetVector.length();
        const isMoving = player.controls.isLocked
            && distanza <= player.mostroAggroRadius
            && distanza > player.mostroDamageRadius;

        monster.update(deltaTime, isMoving);
    }

    if (currentMap && currentMap.update) {
        currentMap.update(deltaTime);
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
document.getElementById('instructions').addEventListener('click', () => {
    if (player) player.controls.lock();
});