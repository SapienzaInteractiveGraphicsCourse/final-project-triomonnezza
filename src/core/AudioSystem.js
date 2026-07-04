import * as THREE from 'three';

class AudioSystemClass {
    constructor() {
        this.listener = new THREE.AudioListener();
        this.audioLoader = new THREE.AudioLoader();
        
        // Cache of decoded audio buffers
        this.buffers = {};

        // Active sound instances (for generic sounds that might need to be stopped)
        this.activeSounds = {};

        // Background music tracks
        this.bgmDoom = null;
        this.bgmAmbience = null;
        this.currentBgm = null;

        // Player loop sounds
        this.mattressStepLoop = null;

        this.isLoaded = false;
    }

    /**
     * Preload all audio assets.
     */
    async preloadAll() {
        if (this.isLoaded) return;

        const files = [
            // UI
            { name: 'close_menu', path: 'assets/sounds/sfx/UI retro PSX/CLOSE MENU.wav' },
            { name: 'open_menu', path: 'assets/sounds/sfx/UI retro PSX/OPEN MENU.wav' },
            
            // Interaction
            { name: 'pickup', path: 'assets/sounds/sfx/Objects & Interaction/PICK UP OBJECT.wav' },
            { name: 'puzzle_solved', path: 'assets/sounds/sfx/Objects & Interaction/PUZZLE SOLVED.wav' },
            
            // Footsteps
            { name: 'mattress_steps', path: 'assets/sounds/sfx/footsteps/mattress steps.wav' },
            { name: 'tunnel_steps', path: 'assets/sounds/sfx/footsteps/tunnel steps.wav' },
            
            // Events / Player / Monster
            { name: 'strong_breathing', path: 'assets/sounds/sfx/Creepy Events Sounds/strong breathe person.wav' },
            { name: 'open_door', path: 'assets/sounds/sfx/Creepy Events Sounds/open door.wav' },
            { name: 'close_door', path: 'assets/sounds/sfx/Creepy Events Sounds/closing wood door.wav' },
            { name: 'door_key', path: 'assets/sounds/sfx/Creepy Events Sounds/door key.wav' },
            { name: 'demon_breathing', path: 'assets/sounds/sfx/Creepy Events Sounds/demon breathing.wav' },
            { name: 'blood_splash', path: 'assets/sounds/sfx/Creepy Events Sounds/blood splash 2.wav' },
            
            // Soundtracks
            { name: 'bgm_doom', path: 'assets/sounds/Soundtracks/7. Awaiting Doom.wav' },
            { name: 'bgm_ambience', path: 'assets/sounds/Soundtracks/AMBIENCE 1.wav' }
        ];

        const total = files.length;
        let loadedCount = 0;

        console.log(`[AudioSystem] Preloading ${total} audio files...`);

        return new Promise((resolve) => {
            const checkDone = () => {
                loadedCount++;
                // Non pubblichiamo eventi di loading qui per non interferire troppo col caricamento globale,
                // Oppure potremmo unire il progresso. Lasciamo per semplicità il caricamento silenzioso 
                // e aspettiamo semplicemente la promise in main.js.
                if (loadedCount >= total) {
                    this.isLoaded = true;
                    console.log('[AudioSystem] All audio preloaded.');
                    this._setupBGM();
                    this._setupLoops();
                    resolve();
                }
            };

            files.forEach(file => {
                this.audioLoader.load(file.path, (buffer) => {
                    this.buffers[file.name] = buffer;
                    checkDone();
                }, undefined, (err) => {
                    console.error(`[AudioSystem] Failed to load audio: ${file.path}`, err);
                    checkDone();
                });
            });
        });
    }

    _setupBGM() {
        if (!this.buffers['bgm_doom'] || !this.buffers['bgm_ambience']) return;

        this.bgmDoom = new THREE.Audio(this.listener);
        this.bgmDoom.setBuffer(this.buffers['bgm_doom']);
        this.bgmDoom.setLoop(true);
        this.bgmDoom.setVolume(0.5);

        this.bgmAmbience = new THREE.Audio(this.listener);
        this.bgmAmbience.setBuffer(this.buffers['bgm_ambience']);
        this.bgmAmbience.setLoop(true);
        this.bgmAmbience.setVolume(0); // starts at 0, crossfade when triggered
    }

    _setupLoops() {
        if (!this.buffers['mattress_steps']) return;
        this.mattressStepLoop = new THREE.Audio(this.listener);
        this.mattressStepLoop.setBuffer(this.buffers['mattress_steps']);
        this.mattressStepLoop.setLoop(true);
        this.mattressStepLoop.setVolume(0);
        this.mattressStepLoop.play();
    }

    /**
     * Start the main ambient music.
     */
    startBGM() {
        if (this.bgmDoom && !this.bgmDoom.isPlaying) {
            this.bgmDoom.play();
        }
        if (this.bgmAmbience && !this.bgmAmbience.isPlaying) {
            this.bgmAmbience.play();
        }
        this.currentBgm = 'doom';
        
        // Assicurati che i volumi siano corretti
        if (this.bgmDoom) this.bgmDoom.setVolume(0.5);
        if (this.bgmAmbience) this.bgmAmbience.setVolume(0);
    }

    stopBGM() {
        if (this.bgmDoom && this.bgmDoom.isPlaying) this.bgmDoom.stop();
        if (this.bgmAmbience && this.bgmAmbience.isPlaying) this.bgmAmbience.stop();
    }

    /**
     * Switch BGM dynamically.
     * @param {string} state 'doom' or 'ambience'
     */
    setBGMState(state) {
        if (this.currentBgm === state) return;
        this.currentBgm = state;

        if (state === 'doom') {
            this._crossfade(this.bgmAmbience, this.bgmDoom);
        } else if (state === 'ambience') {
            this._crossfade(this.bgmDoom, this.bgmAmbience);
        }
    }

    _crossfade(audioOut, audioIn) {
        if (!audioOut || !audioIn) return;
        
        const fadeDuration = 2000;
        const steps = 20;
        const stepTime = fadeDuration / steps;
        
        const outStartVol = audioOut.getVolume();
        const inStartVol = audioIn.getVolume();
        
        const outTargetVol = 0;
        const inTargetVol = 0.5;

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            const t = currentStep / steps;
            
            audioOut.setVolume(outStartVol * (1 - t));
            audioIn.setVolume(inStartVol + (inTargetVol - inStartVol) * t);
            
            if (currentStep >= steps) {
                clearInterval(interval);
            }
        }, stepTime);
    }

    /**
     * Play a generic 2D UI/Event sound once.
     * @param {string} name name of the loaded buffer
     * @param {number} volume volume from 0.0 to 1.0
     */
    playSound(name, volume = 1.0) {
        if (!this.buffers[name]) return null;

        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(this.buffers[name]);
        sound.setVolume(volume);
        sound.play();
        return sound;
    }

    /**
     * Helper to get a PositionalAudio object.
     * @param {string} name 
     * @param {number} refDistance
     * @param {number} volume
     */
    getPositionalSound(name, refDistance = 5, volume = 1.0) {
        if (!this.buffers[name]) return null;

        const sound = new THREE.PositionalAudio(this.listener);
        sound.setBuffer(this.buffers[name]);
        sound.setRefDistance(refDistance);
        sound.setVolume(volume);
        return sound;
    }

    /**
     * Play a 3D Positional Audio once at a specific world position.
     * Needs the scene to add a temporary object.
     * @param {string} name 
     * @param {THREE.Scene} scene 
     * @param {THREE.Vector3} position 
     * @param {number} refDistance
     * @param {number} volume
     */
    playPositionalSoundAt(name, scene, position, refDistance = 5, volume = 1.0) {
        if (!this.buffers[name] || !scene) return null;

        const sound = this.getPositionalSound(name, refDistance, volume);
        
        const dummy = new THREE.Object3D();
        dummy.position.copy(position);
        dummy.add(sound);
        scene.add(dummy);
        
        sound.play();

        // Cleanup after playing
        sound.onEnded = () => {
            scene.remove(dummy);
            sound.disconnect();
        };

        return sound;
    }

    /**
     * Set the state of the player footsteps.
     * @param {boolean} isMoving 
     * @param {boolean} isSprinting 
     */
    updatePlayerFootsteps(isMoving, isSprinting) {
        if (!this.mattressStepLoop) return;

        if (isMoving) {
            this.mattressStepLoop.setVolume(0.15); // lower volume
            this.mattressStepLoop.setPlaybackRate(isSprinting ? 1.6 : 1.0);
        } else {
            this.mattressStepLoop.setVolume(0);
        }
    }
}

export const AudioSystem = new AudioSystemClass();
