import * as THREE from 'three';
import { PlayerController } from './src/core/PlayerController.js';
import { Monster } from './src/entities/Monster.js';
import { MapEasy } from './src/world/maps/MapEasy.js';
import { MapMedium } from './src/world/maps/MapMedium.js';
import { MapHard } from './src/world/maps/MapHard.js';
import { InteriorAssetManager } from './src/world/InteriorAssetManager.js';

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
    console.log(`[GIOCO]: Raccolto: ${e.detail.object.name}`);
    scene.remove(e.detail.object);
});

document.addEventListener('portaAperta', (e) => {
    console.log(`[TWEEN]: Porta ${e.detail.object.name} aperta!`);
});

document.addEventListener('horrorTrigger', (e) => {
    console.warn(`[TRIGGER]: Zona: ${e.detail.eventName}`);
});

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