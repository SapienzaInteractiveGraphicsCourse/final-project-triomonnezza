/**
 * HUD.js  —  Heads-Up Display
 * RESPONSABILE: Davide (Artista)
 *
 * Gestisce tutti gli elementi dell'interfaccia 2D sovrapposti al canvas 3D:
 *   - Mirino (crosshair) dinamico
 *   - Indicatore torcia (batteria)
 *   - Messaggi di gioco (porta serrata, chiave raccolta…)
 *   - Schermata di game over
 *   - HUD di pausa
 *
 * UTILIZZO:
 *   const hud = new HUD();           // legge il DOM già presente in index.html
 *   hud.showMessage("Testo", 3000);  // mostra un testo per 3 secondi
 *   hud.setTorcia(80);               // aggiorna l'indicatore batteria torcia
 *
 * NOTA: Questo file lavora sul DOM. La grafica HTML/CSS dell'HUD
 *       è definita in index.html (sezione <style>) e index.css.
 *       Questo modulo JS è SOLO il controller del DOM, non crea stili.
 */

export class HUD {
    constructor() {
        // Recupera gli elementi dal DOM (devono esistere in index.html)
        this.crosshair   = document.getElementById('crosshair');
        this.hudMessages = document.getElementById('hud-messages');
        this.torchBar    = document.getElementById('torch-bar');       // TODO Davide: aggiungere in index.html
        this.torchFill   = document.getElementById('torch-bar-fill'); // TODO Davide: aggiungere in index.html
        this.gameOverlay = document.getElementById('game-overlay');    // TODO Davide: aggiungere in index.html

        this._msgTimeout  = null;
        this._listening   = false;

        this._initEventListeners();
    }

    /** Ascolta gli eventi globali del gioco e aggiorna l'HUD di conseguenza */
    _initEventListeners() {
        // Mirino rosso quando guardi un oggetto interattivo (emesso da PlayerController)
        document.addEventListener('uiTargetChanged', (e) => {
            if (e.detail.name) {
                this.crosshair?.classList.add('active');
            } else {
                this.crosshair?.classList.remove('active');
            }
        });

        // Testo rapido sullo schermo (es. "Porta serrata")
        document.addEventListener('logMessaggioUI', (e) => {
            this.showMessage(e.detail.testo, 3000);
        });

        // Aggiorna la barra della torcia
        document.addEventListener('torciaScarica', (e) => {
            // TODO Davide: anima la barra con un CSS transition invece di impostare direttamente
            this.setTorcia(e.detail.batteria);
        });

        // Game Over
        document.addEventListener('playerMorto', () => {
            this.showGameOver();
        });

        // Mostra/Nascondi HUD al PointerLock
        document.addEventListener('pointerlockchange', () => {
            const locked = !!document.pointerLockElement;
            if (this.torchBar) this.torchBar.style.display = locked ? 'block' : 'none';
        });
    }

    // ─────────────────────────────────────────────────────────
    //  API PUBBLICA
    // ─────────────────────────────────────────────────────────

    /**
     * Mostra un messaggio temporaneo al centro/basso dello schermo.
     * @param {string} testo
     * @param {number} durataMs - durata in millisecondi (default 3000)
     */
    showMessage(testo, durataMs = 3000) {
        if (!this.hudMessages) return;
        this.hudMessages.innerText = testo;
        this.hudMessages.style.display = 'block';

        clearTimeout(this._msgTimeout);
        this._msgTimeout = setTimeout(() => {
            this.hudMessages.style.display = 'none';
        }, durataMs);
    }

    /**
     * Aggiorna visivamente l'indicatore della torcia.
     * @param {number} percentuale - 0-100
     */
    setTorcia(percentuale) {
        if (!this.torchFill) return;

        // TODO Davide: aggiungi classi CSS per i colori (verde > 50%, giallo 20-50%, rosso < 20%)
        this.torchFill.style.width = `${Math.max(0, percentuale)}%`;

        if (percentuale < 20) {
            this.torchFill.classList.add('critico');
        } else {
            this.torchFill.classList.remove('critico');
        }
    }

    /** Mostra la schermata di Game Over */
    showGameOver() {
        // TODO Davide: progetta la schermata di game over in HTML/CSS
        // Dovrebbe avere: testo "GAME OVER", animazione di fade-in, pulsante "Riprova"
        if (this.gameOverlay) {
            this.gameOverlay.style.display = 'flex';
            this.gameOverlay.classList.add('game-over');
        } else {
            // Fallback temporaneo
            console.log('[HUD] GAME OVER — gameOverlay non trovato nel DOM, aggiungilo in index.html');
        }
    }

    /** Nasconde la schermata di Game Over (usato da MenuManager al riavvio) */
    hideGameOver() {
        if (this.gameOverlay) {
            this.gameOverlay.style.display = 'none';
            this.gameOverlay.classList.remove('game-over');
        }
    }
}
