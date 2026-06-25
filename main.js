import * as THREE from 'three';
import { PlayerController } from './src/core/PlayerController.js';
import { Monster } from './src/entities/Monster.js';
import { MapEasy } from './src/world/maps/MapEasy.js';
import { MapMedium } from './src/world/maps/MapMedium.js';
import { MapHard } from './src/world/maps/MapHard.js';
import { MapBase } from './src/world/maps/MapBase.js';
import { MapTest } from './src/world/maps/MapTest.js';
import { MapHospitalTest } from './src/world/maps/MapHospitalTest.js';
import { HospitalAssetManager } from './src/world/HospitalAssetManager.js';

// Avvia il caricamento in background fin da subito
const globalAssetsPromise = HospitalAssetManager.preloadAll();

// ==========================================
// 1. SETUP DELLA SCENA MINIMALE (WEBGL)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // Grigio scuro horror

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Luce ambientale minima (adattata per materiali PBR GLTF)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.15); // Aumentato per rendere visibile il PBR
scene.add(ambientLight);

// Variabili globali per mappa e player
let currentMap = null;
let player = null;
let mostroMesh = null;
const monster = new Monster();

// ==========================================
// 2. INIZIALIZZAZIONE GIOCO (Richiamata dal menu)
// ==========================================
document.addEventListener('startGameEvent', async (e) => {
    const difficulty = e.detail.difficulty;
    
    // Pulisci vecchie mesh se presenti (per restart futuro)
    if (currentMap) {
        // ... in futuro gestione pulizia scena
    }

    if (difficulty === 'easy') currentMap = new MapEasy(scene);
    else if (difficulty === 'medium') currentMap = new MapMedium(scene);
    else if (difficulty === 'hard') currentMap = new MapHard(scene);
    else if (difficulty === 'test') currentMap = new MapTest(scene);
    else if (difficulty === 'hospital_test') currentMap = new MapHospitalTest(scene);

    // Aspetta il completamento del caricamento FBX globale (se ha già finito in background, passa istantaneamente)
    await globalAssetsPromise;
    
    // Notifica la UI che gli asset sono stati caricati e il gioco può essere sbloccato
    document.dispatchEvent(new Event('assetsLoadedEvent'));

    currentMap.load();
    const collisionBoxes = currentMap.getCollisionBoxes();
    const triggerZones = currentMap.getTriggerZones();

    // Spawn mostro
    mostroMesh = monster.getMesh();
    const spawnPos = currentMap.getMonsterSpawn();
    mostroMesh.position.copy(spawnPos); 
    mostroMesh.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    scene.add(mostroMesh);

    // Controller
    camera.position.set(0, 1.8, 0); 
    scene.add(camera);
    player = new PlayerController(camera, renderer.domElement, collisionBoxes, triggerZones);

    // Click su instructions avvia il gioco effettivo sbloccando il puntatore
    document.getElementById('instructions').addEventListener('click', () => {
        if (player) player.controls.lock();
    });
});

// ==========================================
// 5. ASCOLTO DEGLI EVENTI (Test disaccoppiamento C)
// ==========================================
// Qui verifichi che i tuoi segnali (dispatchEvent) vengano lanciati correttamente!
document.addEventListener('uiTargetChanged', (e) => {
    if (e.detail.name) console.log(`[UI INTERFACCIA]: Mirino su -> ${e.detail.name}`);
});

document.addEventListener('itemRaccolto', (e) => {
    console.log(`[LOG GIOCO]: Hai raccolto l'oggetto: ${e.detail.object.name}. Lo rimuovo dalla scena.`);
    scene.remove(e.detail.object); // Simula l'azione visiva
});

document.addEventListener('portaAperta', (e) => {
    console.log(`[TWEEN SUCCESS]: La porta ${e.detail.object.name} è aperta! (Qui interverrà lo studente C)`);
});

document.addEventListener('horrorTrigger', (e) => {
    console.warn(`[TRIGGER ATTIVATO]: Calpestata zona: ${e.detail.eventName}! Far spawnare rumori/mostri.`);
});

document.addEventListener('playerMorto', () => {
    alert("GAME OVER: You have been defeated!");
    window.location.reload();
});

// ==========================================
// 6. LOOP DI ANIMAZIONE E RENDERING
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    if (player && mostroMesh) {
        // Aggiorna il controller passando il mostro
        player.update(deltaTime, mostroMesh);
        
        // Determina se il mostro è in movimento
        const targetVector = new THREE.Vector3().subVectors(camera.position, mostroMesh.position);
        targetVector.y = 0;
        const distanza = targetVector.length();
        const isMoving = player.controls.isLocked && distanza <= player.mostroAggroRadius && distanza > player.mostroDamageRadius;
        
        monster.update(deltaTime, isMoving);
    }
    
    if (currentMap && currentMap.update) {
        currentMap.update(deltaTime);
    }
    
    renderer.render(scene, camera);
}
animate();

// Gestione ridimensionamento finestra browser
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// (Listener spostato dentro startGameEvent per evitare errori se player non è pronto)