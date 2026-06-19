/**
 * MenuManager.js  —  Menu Principale & Schermate
 * RESPONSABILE: Davide (Artista)
 *
 * Gestisce le schermate NON di gameplay:
 *   - Menu principale (titolo, Start, Credits)
 *   - Schermata di selezione mappa
 *   - Schermata di pausa (ESC)
 *   - Schermata di istruzioni/tutorial
 *
 * UTILIZZO:
 *   const menu = new MenuManager(onStartCallback);
 *   menu.showMainMenu();
 *   menu.showPause();
 *   menu.hidePause();
 *
 * Il callback `onStart` viene chiamato quando il giocatore preme "Inizia",
 * passando il numero della mappa scelta: onStart(mapNumber)
 *
 * DIPENDENZE DOM (tutte definite in index.html da Davide):
 *   #main-menu, #map-select, #pause-menu, #instructions-screen
 */

export class MenuManager {
    /**
     * @param {Function} onStartCallback - fn(mapNumber: number) chiamata all'avvio
     */
    constructor(onStartCallback) {
        this.onStart = onStartCallback;

        // Recupera elementi dal DOM
        this.mainMenu      = document.getElementById('main-menu');
        this.mapSelect     = document.getElementById('map-select');
        this.pauseMenu     = document.getElementById('pause-menu');
        this.instructions  = document.getElementById('instructions-screen');

        this._initButtons();
        this._initPauseListener();
    }

    _initButtons() {
        // TODO Davide: collega i pulsanti del tuo HTML
        // Esempio:
        //   document.getElementById('btn-start')?.addEventListener('click', () => this.showMapSelect());
        //   document.getElementById('btn-map1')?.addEventListener('click', () => this._startGame(1));
        //   document.getElementById('btn-map2')?.addEventListener('click', () => this._startGame(2));
        //   document.getElementById('btn-resume')?.addEventListener('click', () => this.hidePause());

        console.warn('[MenuManager] _initButtons() → TODO: collegare i pulsanti HTML');
    }

    /** Mostra il menu principale e nasconde tutto il resto */
    showMainMenu() {
        this._hideAll();
        if (this.mainMenu) this.mainMenu.style.display = 'flex';
    }

    /** Mostra la schermata di selezione mappa */
    showMapSelect() {
        this._hideAll();
        if (this.mapSelect) this.mapSelect.style.display = 'flex';
    }

    /** Mostra il menu di pausa (chiamato da main.js all'ESC) */
    showPause() {
        if (this.pauseMenu) this.pauseMenu.style.display = 'flex';
    }

    /** Nasconde il menu di pausa */
    hidePause() {
        if (this.pauseMenu) this.pauseMenu.style.display = 'none';
    }

    /** Mostra la schermata click-to-play (PointerLock) */
    showInstructions() {
        if (this.instructions) this.instructions.style.display = 'flex';
    }

    /** Nasconde la schermata click-to-play */
    hideInstructions() {
        if (this.instructions) this.instructions.style.display = 'none';
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNO
    // ─────────────────────────────────────────────────────────

    /** Avvia la partita sulla mappa specificata */
    _startGame(mapNumber) {
        this._hideAll();
        this.showInstructions(); // mostra il click-to-play prima del PointerLock
        if (typeof this.onStart === 'function') {
            this.onStart(mapNumber);
        }
    }

    /** Nasconde tutti i pannelli del menu */
    _hideAll() {
        [this.mainMenu, this.mapSelect, this.pauseMenu].forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    /** Gestisce il tasto ESC per la pausa (emesso dal browser con pointerlockchange) */
    _initPauseListener() {
        document.addEventListener('pointerlockchange', () => {
            const locked = !!document.pointerLockElement;
            if (!locked) {
                // ESC premuto durante il gioco → pausa
                // TODO Davide: verifica che il gioco stia girando prima di mostrare la pausa
                // (evita di mostrare la pausa se siamo già nel menu principale)
            }
        });
    }
}
