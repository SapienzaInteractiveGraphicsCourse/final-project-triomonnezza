import * as THREE from 'three';
import { PlayerController }      from './src/core/PlayerController.js';
import { Monster }               from './src/entities/Monster.js';
import { MonsterAnimator }       from './src/animations/MonsterAnimator.js';
import { MapEasy }               from './src/world/maps/MapEasy.js';
import { MapMedium }             from './src/world/maps/MapMedium.js';
import { MapHard }               from './src/world/maps/MapHard.js';
import { AudioSystem }           from './src/core/AudioSystem.js';
import { DoorController }        from './src/core/DoorController.js';
import { FlashlightController }  from './src/core/FlashlightController.js';
import { TweenManager }          from './src/animations/TweenManager.js';
import { MonsterAI }             from './src/core/MonsterAI.js';
import { GameUIController }      from './src/ui/GameUIController.js';
import * as TWEEN from '@tweenjs/tween.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. THREE.js SCENE SETUP
// ─────────────────────────────────────────────────────────────────────────────
const scene    = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false; // Horror game = dark by default; shadows from SpotLight only
document.body.appendChild(renderer.domElement);

// Minimal ambient fill — real illumination comes from ceiling lamps
scene.add(new THREE.AmbientLight(0x333344, 0.15));
const dirLight = new THREE.DirectionalLight(0xffeedd, 0.05);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// ─────────────────────────────────────────────────────────────────────────────
// 2. GLOBAL GAME STATE & CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────
let currentMap  = null;
let player      = null;
let mostroMesh  = null;
let monsterAI   = null;
const monster   = new Monster();
const monsterAnimator = new MonsterAnimator(monster, TWEEN);

// Cosmetic tween manager (screen shake, item pickup fly-away, etc.)
const tweenManager = new TweenManager(TWEEN, { scene, canvas: renderer.domElement });

// Flashlight controller — player is set after startGameEvent resolves
const flashCtrl = new FlashlightController({ player: null, camera, TWEEN });

// Door controller — wired to scene/audio; fires global 'horrorTrigger' GOAL_REACHED event
const doorCtrl = new DoorController(TWEEN, scene, AudioSystem, (_group) => {
    document.dispatchEvent(new CustomEvent('horrorTrigger', { detail: { eventName: 'GOAL_REACHED' } }));
});

// UI Controller - handles DOM overlays, menus, win/loss sequences
const uiController = new GameUIController(null);

// ─────────────────────────────────────────────────────────────────────────────
// 3. DEBUG GODMODE (press G)
// ─────────────────────────────────────────────────────────────────────────────
window.DEBUG_GODMODE = false;
document.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyG') return;
    window.DEBUG_GODMODE = !window.DEBUG_GODMODE;
    const stato = window.DEBUG_GODMODE ? 'ON (immortale)' : 'OFF';
    console.log(`[DEBUG] Godmode: ${stato}`);
    document.dispatchEvent(new CustomEvent('logMessaggioUI', { detail: { testo: `DEBUG Godmode: ${stato}` } }));
});

document.addEventListener('playerAttaccatoDebug', () => {
    monsterAnimator.attack();
    document.dispatchEvent(new CustomEvent('horrorTrigger', { detail: { eventName: 'PLAYER_ATTACKED' } }));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GAME START (triggered by menu)
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('startGameEvent', async (e) => {
    const difficulty = e.detail.difficulty;
    window.currentDifficulty = difficulty;

    flashCtrl.reset();
    window._bgmStarted = false;

    if      (difficulty === 'easy')   currentMap = new MapEasy(scene);
    else if (difficulty === 'medium') currentMap = new MapMedium(scene);
    else if (difficulty === 'hard')   currentMap = new MapHard(scene);
    else return;

    try {
        await Promise.all([currentMap.load(), AudioSystem.preloadAll()]);

        const collisionBoxes = currentMap.getCollisionBoxes();
        const triggerZones   = currentMap.getTriggerZones();

        // Spawn monster
        mostroMesh = monster.getMesh();
        mostroMesh.position.copy(currentMap.getMonsterSpawn());
        mostroMesh.traverse((child) => {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
        scene.add(mostroMesh);
        monster.initAudio();

        // Position camera + create player
        camera.position.copy(currentMap.getPlayerSpawn());
        if (currentMap.getPlayerRotationY) {
            camera.rotation.set(0, currentMap.getPlayerRotationY(), 0);
            camera.updateMatrixWorld();
        }
        scene.add(camera);
        camera.add(AudioSystem.listener);

        player = new PlayerController(camera, renderer.domElement, collisionBoxes, triggerZones);
        flashCtrl.setPlayer(player);
        uiController.player = player;

        monsterAI = new MonsterAI(mostroMesh, camera, currentMap.getMonsterCollisionBoxes(), currentMap.getDoors());

        document.dispatchEvent(new Event('assetsLoadedEvent'));

    } catch (err) {
        console.error('[main.js] Map load error:', err);
        document.getElementById('error-log').innerText += '\nErrore: ' + err.message;
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GAME EVENTS
// ─────────────────────────────────────────────────────────────────────────────

// Pointer-lock UI sounds
document.addEventListener('pointerlockchange', () => {
    if (!player) return;
    const locked = document.pointerLockElement === document.body
        || document.pointerLockElement?.tagName === 'CANVAS';
    AudioSystem.playSound(locked ? 'close_menu' : 'open_menu');
});

// Item pickup sounds (UI logic is handled in GameUIController)
document.addEventListener('itemRaccolto', (e) => {
    const idChiave = e.detail.idChiave;
    AudioSystem.playSound('pickup');
    
    if (typeof idChiave === 'string' && idChiave.startsWith('batteria')) {
        if (currentMap) currentMap.removeBattery(idChiave);
        flashCtrl.recharge();
    } else {
        if (currentMap) currentMap._goalKeyGroup = null;
    }
});

// Monster events
document.addEventListener('mostroNotaGiocatore', () => {
    AudioSystem.playSound('strong_breathing');
    monsterAnimator.notice();
});
document.addEventListener('mostroAttacca', () => {
    monsterAnimator.attack();
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. RENDER LOOP
// ─────────────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();

    // Clamp deltaTime: tab-switch / lag spikes would cause tunnelling through walls
    const deltaTime = Math.min(clock.getDelta(), 0.1);

    if (player && mostroMesh) {
        player.update(deltaTime, mostroMesh);

        if (player.controls.isLocked) {
            // Distance/fear shared by flashlight + BGM + monster AI
            const toMonster = new THREE.Vector3()
                .subVectors(camera.position, mostroMesh.position);
            toMonster.y = 0;
            const distanza   = toMonster.length();

            const farEdge    = monsterAI ? monsterAI.aggroRadius : 15;
            const nearEdge   = player.mostroAttackRadius || 2.5;
            const fearFactor = 1 - Math.min(1, Math.max(0, (distanza - nearEdge) / (farEdge - nearEdge)));

            // Flashlight: sway, drain, flicker, FOV (all in one call)
            flashCtrl.update(deltaTime, fearFactor);

            // BGM crossfade based on monster proximity
            AudioSystem.setBGMState(distanza <= farEdge ? 'ambience' : 'doom');

            // Monster AI logic (movement, raycasting, doors, attack triggers)
            if (monsterAI) {
                monsterAI.update(deltaTime);
            }

            // Monster animation
            const isMoving = player.controls.isLocked
                && distanza <= farEdge
                && distanza > nearEdge;
            monsterAnimator.update(deltaTime, isMoving);
        }
    }

    if (currentMap && currentMap.update) currentMap.update(deltaTime, camera);

    renderer.render(scene, camera);
}
animate();

// ─────────────────────────────────────────────────────────────────────────────
// 7. MISC WIRING
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
