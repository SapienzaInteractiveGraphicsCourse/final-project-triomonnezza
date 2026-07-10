import * as THREE from 'three';

class AudioSystemClass {
    constructor() {
        this.listener = new THREE.AudioListener();
        this.audioLoader = new THREE.AudioLoader();

        // Buffer decodificati
        this.buffers = {};

        // Tracce BGM
        this.bgmDoom = null;
        this.bgmAmbience = null;
        this.currentBgm = null;

        // Loop audio giocatore
        this.mattressStepLoop = null;

        // Pool suoni one-shot pre-allocati per evitare lag
        this._oneShotPool = {};

        this.isLoaded = false;

        this.musicVolume = 1.0;
        this.sfxVolume = 1.0;
    }

    /** Precarica audio necessari */
    async preloadAll() {
        if (this.isLoaded) return;

        const files = [
            // UI
            { name: 'close_menu', path: 'assets/sounds/sfx/UI retro PSX/CLOSE MENU.wav' },
            { name: 'open_menu',  path: 'assets/sounds/sfx/UI retro PSX/OPEN MENU.wav' },

            // Interaction
            { name: 'pickup',     path: 'assets/sounds/sfx/Objects & Interaction/PICK UP OBJECT.wav' },

            // Events / Player / Monster
            { name: 'strong_breathing', path: 'assets/sounds/sfx/Creepy Events Sounds/strong breathe person.wav' },
            { name: 'open_door',        path: 'assets/sounds/sfx/Creepy Events Sounds/open door.wav' },
            { name: 'close_door',       path: 'assets/sounds/sfx/Creepy Events Sounds/closing wood door.wav' },
            { name: 'door_key',         path: 'assets/sounds/sfx/Creepy Events Sounds/door key.wav' },
            { name: 'demon_breathing',  path: 'assets/sounds/sfx/Creepy Events Sounds/demon breathing.wav' },
            { name: 'blood_splash',     path: 'assets/sounds/sfx/Creepy Events Sounds/blood splash 2.wav' },

            // Passi
            { name: 'mattress_steps', path: 'assets/sounds/sfx/footsteps/mattress steps.wav' },

            // Colonne sonore
            { name: 'bgm_doom',     path: 'assets/sounds/Soundtracks/7. Awaiting Doom.wav' },
            { name: 'bgm_ambience', path: 'assets/sounds/Soundtracks/AMBIENCE 1.wav' },
        ];

        const total = files.length;
        let loadedCount = 0;

        console.log(`[AudioSystem] Preloading ${total} audio files...`);

        return new Promise((resolve) => {
            const checkDone = () => {
                loadedCount++;
                if (loadedCount >= total) {
                    this.isLoaded = true;
                    console.log('[AudioSystem] All audio preloaded.');
                    this._setupBGM();
                    this._setupLoops();
                    this._setupOneShotPool();
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

    /** Alloca un audio per i suoni one-shot per evitare stuttering */
    _setupOneShotPool() {
        const oneShotNames = ['pickup', 'blood_splash', 'strong_breathing',
                              'door_key', 'open_menu', 'close_menu'];
        for (const name of oneShotNames) {
            if (!this.buffers[name]) continue;
            const snd = new THREE.Audio(this.listener);
            snd.setBuffer(this.buffers[name]);
            this._oneShotPool[name] = snd;
        }
    }

    /** Avvia musica ambientale */
    startBGM() {
        if (this.bgmDoom && !this.bgmDoom.isPlaying) this.bgmDoom.play();
        if (this.bgmAmbience && !this.bgmAmbience.isPlaying) this.bgmAmbience.play();
        this.currentBgm = 'doom';

        if (this.bgmDoom)    this.bgmDoom.setVolume(0.5 * this.musicVolume);
        if (this.bgmAmbience) this.bgmAmbience.setVolume(0);
    }

    stopBGM() {
        if (this.bgmDoom    && this.bgmDoom.isPlaying)    this.bgmDoom.stop();
        if (this.bgmAmbience && this.bgmAmbience.isPlaying) this.bgmAmbience.stop();
    }

    /** Cambia BGM attivamente */
    setBGMState(state) {
        if (this.currentBgm === state) return;
        this.currentBgm = state;
        if (state === 'doom')     this._crossfade(this.bgmAmbience, this.bgmDoom);
        else if (state === 'ambience') this._crossfade(this.bgmDoom, this.bgmAmbience);
    }

    _crossfade(audioOut, audioIn) {
        if (!audioOut || !audioIn) return;

        const fadeDuration = 2000;
        const steps        = 20;
        const stepTime     = fadeDuration / steps;

        const outStartVol  = audioOut.getVolume();
        const inTargetVol  = 0.5 * this.musicVolume;

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            const t = currentStep / steps;
            audioOut.setVolume(outStartVol * (1 - t));
            audioIn.setVolume(inTargetVol * t);
            if (currentStep >= steps) clearInterval(interval);
        }, stepTime);
    }

    /** Riproduce un suono one-shot (usa pool se disponibile) */
    playSound(name, volume = 1.0) {
        // Usa pool pre-allocato per evitare lag
        const pooled = this._oneShotPool[name];
        if (pooled) {
            if (pooled.isPlaying) pooled.stop();
            pooled.setVolume(volume * this.sfxVolume);
            pooled.play();
            return pooled;
        }

        // Fallback per suoni non nel pool
        if (!this.buffers[name]) return null;
        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(this.buffers[name]);
        sound.setVolume(volume * this.sfxVolume);
        sound.play();
        return sound;
    }

    /** Ottieni oggetto PositionalAudio */
    getPositionalSound(name, refDistance = 5, volume = 1.0) {
        if (!this.buffers[name]) return null;
        const sound = new THREE.PositionalAudio(this.listener);
        sound.setBuffer(this.buffers[name]);
        sound.setRefDistance(refDistance);
        sound.setVolume(volume * this.sfxVolume);
        return sound;
    }

    /** Riproduce audio 3D posizionale in un punto */
    playPositionalSoundAt(name, scene, position, refDistance = 5, volume = 1.0) {
        if (!this.buffers[name] || !scene) return null;

        const sound = this.getPositionalSound(name, refDistance, volume);
        const dummy = new THREE.Object3D();
        dummy.position.copy(position);
        dummy.add(sound);
        scene.add(dummy);
        sound.play();

        sound.onEnded = () => {
            scene.remove(dummy);
            sound.disconnect();
        };

        return sound;
    }

    /** Aggiorna volume/velocità passi giocatore */
    updatePlayerFootsteps(isMoving, isSprinting) {
        if (!this.mattressStepLoop) return;
        if (isMoving) {
            this.mattressStepLoop.setVolume(0.15 * this.sfxVolume);
            this.mattressStepLoop.setPlaybackRate(isSprinting ? 1.6 : 1.0);
        } else {
            this.mattressStepLoop.setVolume(0);
        }
    }

    setMusicVolume(vol) {
        this.musicVolume = vol;
        if (this.bgmDoom)    this.bgmDoom.setVolume(0.5 * vol);
        if (this.bgmAmbience) this.bgmAmbience.setVolume(this.currentBgm === 'ambience' ? 0.5 * vol : 0);
    }

    setSfxVolume(vol) {
        this.sfxVolume = vol;
        // I suoni nel pool useranno il nuovo volume al prossimo play()
    }
}

export const AudioSystem = new AudioSystemClass();
