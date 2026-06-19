/**
 * TweenManager.js  —  Gestore Animazioni Tween
 * RESPONSABILE: Federico (Regista)
 *
 * Centralizza tutte le animazioni smooth del gioco usando tween.js.
 * Ascolta gli eventi globali e risponde con i Tween appropriati.
 *
 * EVENTI ASCOLTATI (emessi da PlayerController / LightingSetup):
 *   - 'portaAperta'       → Tween di rotazione porta
 *   - 'itemRaccolto'      → Tween di raccolta (scale → 0 + translate up)
 *   - 'horrorTrigger'     → Tween jumpscare specifico per il trigger
 *   - 'mostroInMovimento' → Tween oscillazione braccia
 *   - 'torciaScarica'     → Tween sfarfallio torcia aggressivo
 *
 * TODO Federico: implementa ogni handler.
 */

export class TweenManager {
    constructor(TWEEN) {
        this.TWEEN = TWEEN; // libreria tween.js passata dall'esterno
        this._initListeners();
    }

    _initListeners() {
        document.addEventListener('portaAperta',       (e) => this._onPortaAperta(e.detail));
        document.addEventListener('itemRaccolto',      (e) => this._onItemRaccolto(e.detail));
        document.addEventListener('horrorTrigger',     (e) => this._onHorrorTrigger(e.detail));
        document.addEventListener('mostroInMovimento', (e) => this._onMostroMoves(e.detail));
        document.addEventListener('torciaScarica',     (e) => this._onTorciaScarica(e.detail));
    }

    _onPortaAperta(detail) {
        // TODO Federico: Tween di rotazione della porta (es. ruota Y di 90°)
        console.log('[TweenManager] portaAperta → TODO implementare Tween porta');
    }

    _onItemRaccolto(detail) {
        // TODO Federico: Tween di sparizione oggetto (scale 1→0 + fly-up)
        console.log('[TweenManager] itemRaccolto → TODO implementare Tween raccolta');
    }

    _onHorrorTrigger(detail) {
        // TODO Federico: switch su detail.eventName per Tween jumpscare specifico
        console.log(`[TweenManager] horrorTrigger: ${detail.eventName} → TODO`);
    }

    _onMostroMoves(detail) {
        // TODO Federico: oscillazione braccia gerarchiche del mostro
        console.log('[TweenManager] mostroInMovimento → TODO oscillazione braccia');
    }

    _onTorciaScarica(detail) {
        // TODO Federico: sfarfallio aggressivo via Tween sull'intensità della torcia
        console.log('[TweenManager] torciaScarica → TODO sfarfallio Tween');
    }

    /** Da chiamare nel game loop: aggiorna tutti i Tween attivi */
    update(time) {
        this.TWEEN.update(time);
    }
}
