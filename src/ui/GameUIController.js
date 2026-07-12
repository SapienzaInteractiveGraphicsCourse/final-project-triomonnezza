import { AudioSystem } from '../core/AudioSystem.js';
import { generateBloodSplatter } from './BloodSplatter.js';

export class GameUIController {
    constructor(playerController) {
        this.player = playerController;

        // UI Elements
        this.instructions = document.getElementById('instructions');
        this.keyHud = document.getElementById('key-hud');
        this.fadeOverlay = document.getElementById('fade-overlay');
        this.lightBurstOverlay = document.getElementById('light-burst-overlay');
        this.winOverlay = document.getElementById('win-overlay');
        this.gameoverOverlay = document.getElementById('gameover-overlay');
        this.bloodOverlay = document.getElementById('blood-splatter-overlay');
        this.crosshair = document.getElementById('crosshair');
        this.hudMessages = document.getElementById('hud-messages');
        this.staminaBar = document.getElementById('stamina-bar');
        this.torchBatteryHud = document.getElementById('torch-battery-hud');
        this.mainMenu = document.getElementById('main-menu');
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingBarFill = document.getElementById('loading-bar-fill');
        this.loadingText = document.getElementById('loading-text');
        this.interactionPrompt = document.getElementById('interaction-prompt');

        this._msgTimeout = null;
        this._phraseInterval = null;
        this._gameStarted = false;
        this._gameOver = false;

        this.loadingPhrases = [
            "Hiding keys...",
            "Awakening the horror...",
            "Turn off the lights...",
            "Generating corridors...",
            "Don't look behind you...",
            "Preparing jumpscares..."
        ];

        this._initEventListeners();
        this._initVolumeControls();
        this._initMenuButtons();
        this._initAutoStart();
    }

    _initMenuButtons() {
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const diff = e.currentTarget.getAttribute('data-diff');
                if (!diff) return; // Ignore restart/main menu buttons

                if (this.mainMenu) this.mainMenu.style.display = 'none';
                if (this.loadingScreen) this.loadingScreen.style.display = 'flex';
                if (this.loadingBarFill) this.loadingBarFill.style.width = '0%';

                let phraseIndex = 0;
                if (this.loadingText) this.loadingText.innerText = this.loadingPhrases[0];
                
                clearInterval(this._phraseInterval);
                this._phraseInterval = setInterval(() => {
                    phraseIndex = (phraseIndex + 1) % this.loadingPhrases.length;
                    if (this.loadingText) this.loadingText.innerText = this.loadingPhrases[phraseIndex];
                }, 1800);

                try {
                    document.dispatchEvent(new CustomEvent('startGameEvent', { detail: { difficulty: diff } }));
                } catch (err) {
                    const errorLog = document.getElementById('error-log');
                    if (errorLog) errorLog.innerText += '\nError: ' + err.message;
                    console.error(err);
                }
            });
        });
    }

    _initAutoStart() {
        window.addEventListener('load', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const autoDiff = urlParams.get('diff');
            if (autoDiff) {
                const btn = document.querySelector(`.diff-btn[data-diff="${autoDiff}"]`);
                if (btn) btn.click();
            }
        });
    }

    _initEventListeners() {
        // Loading Progress
        document.addEventListener('assetProgressEvent', (e) => {
            if (this.loadingBarFill) this.loadingBarFill.style.width = e.detail.progress + '%';
        });

        // Assets Loaded
        document.addEventListener('assetsLoadedEvent', () => {
            clearInterval(this._phraseInterval);
            if (this.loadingScreen) this.loadingScreen.style.display = 'none';
            if (this.instructions) this.instructions.style.display = 'flex';
            this._gameStarted = true;
        });

        // Pointerlock change (Pause/Instructions)
        document.addEventListener('pointerlockchange', () => {
            if (!this._gameStarted || this._gameOver) return;
            const locked = !!document.pointerLockElement;
            if (this.instructions) {
                this.instructions.style.display = locked ? 'none' : 'flex';
            }
            // Start BGM on first interaction
            if (locked && !window._bgmStarted) {
                window._bgmStarted = true;
                AudioSystem.startBGM();
                AudioSystem.setBGMState('ambience');
            }
        });

        // Click on instructions to lock pointer
        if (this.instructions) {
            this.instructions.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
                if (e.target.closest('.settings')) return;
                if (this.player) this.player.controls.lock();
            });
        }

        // Stamina
        document.addEventListener('staminaChanged', (e) => {
            const pct = e.detail.percentuale;
            if (this.staminaBar) {
                this.staminaBar.style.width = pct + '%';
                if (pct <= 20) {
                    this.staminaBar.style.backgroundColor = 'var(--stamina-empty)';
                } else {
                    this.staminaBar.style.backgroundColor = 'var(--stamina-full)';
                }
            }
        });

        // Flashlight Battery
        document.addEventListener('torciaScarica', (e) => {
            const pct = e.detail.percent;
            if (pct === undefined || !this.torchBatteryHud) return;
            this.torchBatteryHud.textContent = `🔦 ${pct}%`;
            this.torchBatteryHud.classList.toggle('low', pct <= 40);
        });

        document.addEventListener('startGameEvent', () => {
            if (this.torchBatteryHud) {
                this.torchBatteryHud.textContent = '🔦 100%';
                this.torchBatteryHud.classList.remove('low');
            }
        });

        // Target changed (crosshair & prompt)
        document.addEventListener('uiTargetChanged', (e) => {
            const name = e.detail.name;
            if (this.crosshair) {
                this.crosshair.classList.toggle('active', !!name);
            }
            if (this.interactionPrompt) {
                if (name) {
                    this.interactionPrompt.innerText = '[E] ' + name;
                    this.interactionPrompt.classList.add('show');
                } else {
                    this.interactionPrompt.classList.remove('show');
                }
            }
        });

        // Item picked up
        document.addEventListener('itemRaccolto', (e) => {
            const idChiave = e.detail.idChiave;
            
            if (idChiave === 'batteria') {
                this.showMessage('Battery found! Flashlight fully recharged.');
                return;
            }

            this.showMessage('Key collected! Return to the golden door.');
            if (idChiave === 'chiave_goal' && this.keyHud) {
                this.keyHud.style.display = 'flex';
            }
        });

        // Show generic UI message
        document.addEventListener('logMessaggioUI', (e) => {
            this.showMessage(e.detail.testo);
        });

        // Win Sequence
        document.addEventListener('horrorTrigger', (e) => {
            if (e.detail.eventName === 'GOAL_REACHED') {
                this._beginWinSequence();
            }
        });

        // Player Died Sequence
        document.addEventListener('playerMorto', () => {
            this._beginDeathSequence();
        });
    }

    _initVolumeControls() {
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
    }

    showMessage(text, durationMs = 3000) {
        if (!this.hudMessages) return;
        this.hudMessages.innerText = text;
        this.hudMessages.classList.add('show');

        clearTimeout(this._msgTimeout);
        this._msgTimeout = setTimeout(() => {
            this.hudMessages.classList.remove('show');
        }, durationMs);
    }

    _beginWinSequence() {
        this._gameOver = true;
        if (this.player) this.player.controls.unlock();

        if (this.lightBurstOverlay) {
            this.lightBurstOverlay.style.transition = 'opacity 500ms ease-out';
            this.lightBurstOverlay.style.opacity = '1';
            this._generateVictorySparkles(this.lightBurstOverlay);
        }

        this.showMessage('The door opens... You are free!');

        setTimeout(() => {
            if (this.fadeOverlay) {
                this.fadeOverlay.style.transition = 'opacity 1000ms ease-in';
                this.fadeOverlay.style.backgroundColor = '#fff8ec';
                this.fadeOverlay.style.opacity = '1';
            }
        }, 900);

        setTimeout(() => {
            if (this.winOverlay) {
                this.winOverlay.style.display = 'flex';
                void this.winOverlay.offsetWidth;
                this.winOverlay.style.opacity = '1';
            }
        }, 1900);
    }

    _beginDeathSequence() {
        this._gameOver = true;
        if (this.player) this.player.controls.unlock();
        AudioSystem.playSound('blood_splash');
        generateBloodSplatter();

        if (this.bloodOverlay) {
            this.bloodOverlay.style.transition = 'opacity 150ms ease-out';
            this.bloodOverlay.style.opacity = '1';
        }

        document.dispatchEvent(new CustomEvent('horrorTrigger', { detail: { eventName: 'PLAYER_ATTACKED' } }));

        setTimeout(() => {
            if (this.fadeOverlay) {
                this.fadeOverlay.style.transition = 'opacity 900ms ease-in';
                this.fadeOverlay.style.backgroundColor = '#000';
                this.fadeOverlay.style.opacity = '1';
            }
        }, 700);

        setTimeout(() => {
            if (this.gameoverOverlay) {
                this.gameoverOverlay.style.display = 'flex';
                void this.gameoverOverlay.offsetWidth;
                this.gameoverOverlay.style.opacity = '1';
            }
        }, 1600);
    }

    _generateVictorySparkles(container) {
        const count = 14 + Math.floor(Math.random() * 8);
        for (let i = 0; i < count; i++) {
            const el       = document.createElement('div');
            el.className   = 'victory-sparkle';
            const size     = this._rnd(0.3, 0.9);
            const startTop = this._rnd(60, 95);
            const left     = this._rnd(5, 95);
            const dur      = this._rnd(2.5, 4.5);

            el.style.cssText = `
                position:absolute; left:${left.toFixed(1)}vw; top:${startTop.toFixed(1)}vh;
                width:${size.toFixed(2)}vw; height:${size.toFixed(2)}vw; border-radius:50%;
                background:radial-gradient(circle,#fff8dc 0%,#ffd700 60%,transparent 100%);
                box-shadow:0 0 6px 2px rgba(255,215,0,0.8); opacity:0;
                transition:top ${dur.toFixed(1)}s ease-out,opacity ${dur.toFixed(1)}s ease-out;
            `;
            container.appendChild(el);

            setTimeout(() => {
                el.style.opacity = this._rnd(0.7, 1).toFixed(2);
                el.style.top     = `${this._rnd(-10, 20).toFixed(1)}vh`;
            }, this._rnd(0, 400));
        }
    }

    _rnd(min, max) { return min + Math.random() * (max - min); }
}
