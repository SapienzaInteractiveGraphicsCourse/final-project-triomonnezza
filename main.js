import * as THREE from 'three';
import { PlayerController }      from './src/core/PlayerController.js';
import { Monster }               from './src/entities/Monster.js';
import { MapEasy }               from './src/world/maps/MapEasy.js';
import { MapMedium }             from './src/world/maps/MapMedium.js';
import { MapHard }               from './src/world/maps/MapHard.js';
import { AudioSystem }           from './src/core/AudioSystem.js';
import { DoorController }        from './src/core/DoorController.js';
import { FlashlightController }  from './src/core/FlashlightController.js';
import { TweenManager }          from './src/animations/TweenManager.js';
import { generateBloodSplatter } from './src/ui/BloodSplatter.js';
import { MonsterAI }             from './src/core/MonsterAI.js';
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
// 2. GLOBAL GAME STATE
// ─────────────────────────────────────────────────────────────────────────────
let currentMap  = null;
let player      = null;
let mostroMesh  = null;
let monsterAI   = null;
const monster   = new Monster();

// Cosmetic tween manager (screen shake, item pickup fly-away, etc.)
const tweenManager = new TweenManager(TWEEN, { scene, canvas: renderer.domElement });

// Flashlight controller — player is set after startGameEvent resolves
const flashCtrl = new FlashlightController({ player: null, camera, TWEEN });

// Door controller — wired to scene/audio; fires win sequence on goal door open
const doorCtrl = new DoorController(TWEEN, scene, AudioSystem, (_group) => {
    _beginWinSequence();
});

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
    monster.attack();
    document.dispatchEvent(new CustomEvent('horrorTrigger', { detail: { eventName: 'PLAYER_ATTACKED' } }));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GAME START (triggered by menu)
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('startGameEvent', async (e) => {
    const difficulty = e.detail.difficulty;
    window.currentDifficulty = difficulty;

    flashCtrl.reset();
    bgmStarted = false;

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

// BGM: starts only after pointer lock (so there's no autoplay before user gesture)
let bgmStarted = false;
document.addEventListener('pointerlockchange', () => {
    if (player && player.controls.isLocked && !bgmStarted) {
        AudioSystem.startBGM();
        bgmStarted = true;
    }
});

// Pointer-lock UI sounds
document.addEventListener('pointerlockchange', () => {
    if (!player) return;
    const locked = document.pointerLockElement === document.body
        || document.pointerLockElement?.tagName === 'CANVAS';
    AudioSystem.playSound(locked ? 'close_menu' : 'open_menu');
});

// Item pickup
document.addEventListener('itemRaccolto', (e) => {
    const idChiave = e.detail.idChiave;
    AudioSystem.playSound('pickup');

    if (typeof idChiave === 'string' && idChiave.startsWith('batteria')) {
        console.log(`[GIOCO] Raccolta ${idChiave}!`);
        if (currentMap) currentMap.removeBattery(idChiave);
        flashCtrl.recharge();
        document.dispatchEvent(new CustomEvent('logMessaggioUI', {
            detail: { testo: 'Battery found! Flashlight fully recharged.' }
        }));
        return;
    }

    console.log('[GIOCO] Raccolto chiave!');
    if (currentMap) currentMap._goalKeyGroup = null;
    document.dispatchEvent(new CustomEvent('logMessaggioUI', {
        detail: { testo: 'Key collected! Return to the golden door.' }
    }));
    if (idChiave === 'chiave_goal') {
        const keyHud = document.getElementById('key-hud');
        if (keyHud) keyHud.style.display = 'flex';
    }
});

// Goal-zone reached (legacy trigger path)
document.addEventListener('horrorTrigger', (e) => {
    console.warn(`[TRIGGER] ${e.detail.eventName}`);
    if (e.detail.eventName === 'GOAL_REACHED') showWinScreen();
});

// Monster events
document.addEventListener('mostroNotaGiocatore', () => {
    AudioSystem.playSound('strong_breathing');
    monster.notice();
});
document.addEventListener('mostroAttacca', () => {
    monster.attack();
});

// Death
document.addEventListener('playerMorto', () => {
    AudioSystem.playSound('blood_splash');
    generateBloodSplatter();

    const bloodOverlay = document.getElementById('blood-splatter-overlay');
    if (bloodOverlay) {
        bloodOverlay.style.transition = 'opacity 150ms ease-out';
        bloodOverlay.style.opacity = '1';
    }

    document.dispatchEvent(new CustomEvent('horrorTrigger', { detail: { eventName: 'PLAYER_ATTACKED' } }));

    setTimeout(() => {
        const fadeOverlay = document.getElementById('fade-overlay');
        if (fadeOverlay) {
            fadeOverlay.style.transition = 'opacity 900ms ease-in';
            fadeOverlay.style.backgroundColor = '#000';
            fadeOverlay.style.opacity = '1';
        }
    }, 700);

    setTimeout(showGameOverScreen, 700 + 900);
});

// UI target info
document.addEventListener('uiTargetChanged', (e) => {
    if (e.detail.name) console.log(`[UI] Mirino su -> ${e.detail.name}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. WIN / GAME-OVER SCREENS
// ─────────────────────────────────────────────────────────────────────────────

/** Called by DoorController when the goal door is opened */
function _beginWinSequence() {
    if (player) player.controls.unlock();

    const lightOverlay = document.getElementById('light-burst-overlay');
    if (lightOverlay) {
        lightOverlay.style.transition = 'opacity 500ms ease-out';
        lightOverlay.style.opacity = '1';
        _generateVictorySparkles(lightOverlay);
    }

    document.dispatchEvent(new CustomEvent('logMessaggioUI', {
        detail: { testo: 'The door opens... You are free!' }
    }));

    setTimeout(() => {
        const fadeOverlay = document.getElementById('fade-overlay');
        if (fadeOverlay) {
            fadeOverlay.style.transition = 'opacity 1000ms ease-in';
            fadeOverlay.style.backgroundColor = '#fff8ec';
            fadeOverlay.style.opacity = '1';
        }
    }, 900);

    setTimeout(showWinScreen, 900 + 1000);
}

function showWinScreen() {
    if (player) player.controls.unlock();
    const win = document.getElementById('win-overlay');
    if (win) { win.style.display = 'flex'; void win.offsetWidth; win.style.opacity = '1'; }
}

function showGameOverScreen() {
    if (player) player.controls.unlock();
    const over = document.getElementById('gameover-overlay');
    if (over) { over.style.display = 'flex'; void over.offsetWidth; over.style.opacity = '1'; }
}

function _generateVictorySparkles(container) {
    const count = 14 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
        const el       = document.createElement('div');
        el.className   = 'victory-sparkle';
        const size     = _rnd(0.3, 0.9);
        const startTop = _rnd(60, 95);
        const left     = _rnd(5, 95);
        const dur      = _rnd(2.5, 4.5);

        el.style.cssText = `
            position:absolute; left:${left.toFixed(1)}vw; top:${startTop.toFixed(1)}vh;
            width:${size.toFixed(2)}vw; height:${size.toFixed(2)}vw; border-radius:50%;
            background:radial-gradient(circle,#fff8dc 0%,#ffd700 60%,transparent 100%);
            box-shadow:0 0 6px 2px rgba(255,215,0,0.8); opacity:0;
            transition:top ${dur.toFixed(1)}s ease-out,opacity ${dur.toFixed(1)}s ease-out;
        `;
        container.appendChild(el);

        setTimeout(() => {
            el.style.opacity = _rnd(0.7, 1).toFixed(2);
            el.style.top     = `${_rnd(-10, 20).toFixed(1)}vh`;
        }, _rnd(0, 400));
    }
}

function _rnd(min, max) { return min + Math.random() * (max - min); }

// ─────────────────────────────────────────────────────────────────────────────
// 7. RENDER LOOP
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

            const farEdge    = player.mostroAggroRadius;
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
            monster.update(deltaTime, isMoving);
        }
    }

    if (currentMap && currentMap.update) currentMap.update(deltaTime, camera);

    renderer.render(scene, camera);
}
animate();

// ─────────────────────────────────────────────────────────────────────────────
// 8. MISC WIRING
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Click inside instructions panel → lock pointer
document.getElementById('instructions').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
    if (e.target.closest('.settings')) return;
    if (player) player.controls.lock();
});

// Volume sliders (pause menu)
const musicSlider = document.getElementById('music-volume');
const sfxSlider   = document.getElementById('sfx-volume');
const musicVal    = document.getElementById('music-vol-val');
const sfxVal      = document.getElementById('sfx-vol-val');

if (musicSlider) {
    musicSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        if (musicVal) musicVal.innerText = val + '%';
        AudioSystem.setMusicVolume(val / 100);
    });
}
if (sfxSlider) {
    sfxSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        if (sfxVal) sfxVal.innerText = val + '%';
        AudioSystem.setSfxVolume(val / 100);
    });
}
