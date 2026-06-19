/**
 * MonsterAnimator.js  —  Animazioni Gerarchiche del Mostro
 * RESPONSABILE: Federico (Regista)
 *
 * Gestisce tutte le animazioni del modello gerarchico del mostro
 * implementate via JavaScript (requisito del prof: NO animazioni importate).
 *
 * ANIMAZIONI DA IMPLEMENTARE:
 *   - camminata(): oscillazione braccia e corpo durante l'inseguimento
 *   - attacco():   movimento rapido delle braccia verso il giocatore
 *   - idle():      leggero dondolamento in stato di pattuglia
 *
 * TODO Federico: usa tween.js per interpolare le rotazioni dei joints.
 */

export class MonsterAnimator {
    /**
     * @param {Monster} monster  - istanza di src/entities/Monster.js
     * @param {object}  TWEEN    - libreria tween.js
     */
    constructor(monster, TWEEN) {
        this.monster = monster;
        this.TWEEN   = TWEEN;
        this._currentAnim = null;
    }

    /** Avvia l'animazione di camminata (loop) */
    camminata() {
        // TODO Federico: Tween ciclico sulle rotazioni di braccioSx e braccioDx
        // Suggerimento: usa TWEEN.Tween con onComplete che richiama se stesso (ping-pong)
        console.warn('[MonsterAnimator] camminata() → TODO');
    }

    /** Animazione di attacco (one-shot, poi torna a camminata) */
    attacco() {
        // TODO Federico
        console.warn('[MonsterAnimator] attacco() → TODO');
    }

    /** Animazione idle (dondolamento lento) */
    idle() {
        // TODO Federico
        console.warn('[MonsterAnimator] idle() → TODO');
    }

    /** Ferma tutte le animazioni in corso */
    stop() {
        if (this._currentAnim) {
            this._currentAnim.stop();
            this._currentAnim = null;
        }
    }
}
