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
        if (keyHud) keyHud.style.display = 'block';
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
            <div style="text-align:center;padding:40px;background:#111;
                        border:4px solid #ccaa00;max-width:600px;
                        box-shadow:8px 8px 0 #000">
                <div style="font-size:5rem;margin-bottom:20px;text-shadow:4px 4px 0 #000">&#x1F511;&#x1F6AA;</div>
                <h1 style="font-family:'VT323',monospace;font-size:5rem;color:#ccaa00;margin:0 0 10px;
                           text-shadow:4px 4px 0 #000;text-transform:uppercase;">ESCAPED</h1>
                <p style="font-family:'VT323',monospace;font-size:1.8rem;color:#d9d9d9;margin-bottom:40px;text-transform:uppercase;">
                    You have unlocked the nightmare.
                </p>
                <button onclick="location.href='index.html'"
                    style="padding:16px 40px;background:#222;color:#ccaa00;border:4px solid #ccaa00;
                           font-family:'VT323',monospace;font-size:2rem;cursor:pointer;
                           text-transform:uppercase;box-shadow:4px 4px 0 #000;"
                    onmouseover="this.style.background='#443300';this.style.color='#fff';this.style.transform='translate(-2px,-2px)';this.style.boxShadow='6px 6px 0 #000'"
                    onmouseout="this.style.background='#222';this.style.color='#ccaa00';this.style.transform='translate(0,0)';this.style.boxShadow='4px 4px 0 #000'"
                    onmousedown="this.style.transform='translate(2px,2px)';this.style.boxShadow='0 0 0 #000'">
                    MAIN MENU
                </button>
            </div>`;
        Object.assign(win.style, {
            position: 'fixed', inset: '0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.95)',
            zIndex: '9999'
        });
        document.body.appendChild(win);
    }
    win.style.display = 'flex';
}


document.addEventListener('playerMorto', () => {
    showGameOverScreen();
});

function showGameOverScreen() {
    if (player) player.controls.unlock();
    let over = document.getElementById('gameover-overlay');
    if (!over) {
        over = document.createElement('div');
        over.id = 'gameover-overlay';
        over.innerHTML = `
            <div style="text-align:center;padding:50px 60px;background:#050000;
                        border:4px solid #990000;max-width:600px;
                        box-shadow:8px 8px 0 #000">
                <div style="font-size:6rem;color:#990000;margin-bottom:10px;text-shadow:4px 4px 0 #000">&#x2620;</div>
                <h1 style="font-family:'VT323',monospace;font-size:6rem;color:#d9d9d9;margin:0 0 10px;
                           text-shadow:4px 4px 0 #990000;text-transform:uppercase;">SEI MORTO</h1>
                <p style="font-family:'VT323',monospace;font-size:1.8rem;color:#777;margin-bottom:40px;text-transform:uppercase;">
                    La bestia ha preteso un'altra anima
                </p>
                <div style="display:flex; flex-direction:column; gap:20px; align-items:center;">
                    <button onclick="location.href='?diff=' + (window.currentDifficulty || 'easy')"
                        style="width:300px;padding:16px;background:#111;color:#d9d9d9;border:4px solid #550000;
                               font-family:'VT323',monospace;font-size:2rem;cursor:pointer;
                               text-transform:uppercase;box-shadow:4px 4px 0 #000;"
                        onmouseover="this.style.background='#330000';this.style.borderColor='#990000';this.style.color='#fff';this.style.transform='translate(-2px,-2px)';this.style.boxShadow='6px 6px 0 #000'"
                        onmouseout="this.style.background='#111';this.style.borderColor='#550000';this.style.color='#d9d9d9';this.style.transform='translate(0,0)';this.style.boxShadow='4px 4px 0 #000'"
                        onmousedown="this.style.transform='translate(2px,2px)';this.style.boxShadow='0 0 0 #000'">
                        RIPROVA
                    </button>
                    <button onclick="location.href='index.html'"
                        style="width:300px;padding:16px;background:#111;color:#777;border:4px solid #333;
                               font-family:'VT323',monospace;font-size:2rem;cursor:pointer;
                               text-transform:uppercase;box-shadow:4px 4px 0 #000;"
                        onmouseover="this.style.background='#222';this.style.borderColor='#555';this.style.color='#d9d9d9';this.style.transform='translate(-2px,-2px)';this.style.boxShadow='6px 6px 0 #000'"
                        onmouseout="this.style.background='#111';this.style.borderColor='#333';this.style.color='#777';this.style.transform='translate(0,0)';this.style.boxShadow='4px 4px 0 #000'"
                        onmousedown="this.style.transform='translate(2px,2px)';this.style.boxShadow='0 0 0 #000'">
                        MENU PRINCIPALE
                    </button>
                </div>
            </div>`;
        Object.assign(over.style, {
            position: 'fixed', inset: '0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5,0,0,0.95)',
            zIndex: '9999'
        });
        document.body.appendChild(over);
    }
    over.style.display = 'flex';
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
document.getElementById('instructions').addEventListener('click', () => {
    if (player) player.controls.lock();
});