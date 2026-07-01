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

// ==========================================
// 3. AVVIO GIOCO (triggerato dal menu)
// ==========================================
document.addEventListener('startGameEvent', async (e) => {
    const difficulty = e.detail.difficulty;
    window.currentDifficulty = difficulty;

    // Crea la mappa giusta
    if (difficulty === 'easy')        currentMap = new MapEasy(scene);
    else if (difficulty === 'medium') currentMap = new MapMedium(scene);
    else if (difficulty === 'hard')   currentMap = new MapHard(scene);
    else return;

    try {
        // La mappa si occupa di chiamare InteriorAssetManager.preloadAll() internamente
        await currentMap.load();

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
    const win = document.getElementById('win-overlay');
    if (win) {
        win.style.display = 'flex';
    }
}


document.addEventListener('playerMorto', () => {
    showGameOverScreen();
});

function showGameOverScreen() {
    if (player) player.controls.unlock();
    const over = document.getElementById('gameover-overlay');
    if (over) {
        over.style.display = 'flex';
    }
}

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
document.getElementById('instructions').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (player) player.controls.lock();
});