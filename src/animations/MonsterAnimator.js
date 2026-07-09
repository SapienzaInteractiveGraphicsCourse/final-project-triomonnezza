/**
 * MonsterAnimator.js  —  Animazioni Gerarchiche del Mostro
 * RESPONSABILE: Federico (Regista)
 *
 * Facciata pubblica sulle animazioni procedurali del mostro. L'implementazione
 * effettiva dei Tween vive dentro Monster.js (_startWalkAnimation,
 * _startIdleAnimation, attack) perché il mostro possiede il proprio
 * TWEEN.Group isolato: ogni cambio di stato deve poter interrompere e
 * riavviare in modo pulito le proprie animazioni senza toccare gli altri
 * tween della scena (porte, oggetti, jumpscare). Questa classe espone
 * un'interfaccia semplice e nominata in italiano (come da specifica) per
 * chi vuole pilotare le animazioni del mostro dall'esterno senza conoscere
 * i dettagli implementativi di Monster.js.
 *
 * ANIMAZIONI:
 *   - camminata(): oscillazione braccia/gambe/testa durante l'inseguimento
 *   - attacco():   scatto rapido delle braccia/artigli verso il giocatore
 *   - idle():      leggero dondolamento/respiro in stato di pattuglia
 */

export class MonsterAnimator {
    /**
     * @param {import('../entities/Monster.js').Monster} monster - istanza del mostro
     * @param {object} TWEEN - libreria tween.js (non usata direttamente qui,
     *                          mantenuta nella firma per compatibilità con
     *                          l'interfaccia storica e per eventuali estensioni
     *                          future che animino oggetti esterni al mostro)
     */
    constructor(monster, TWEEN) {
        this.monster = monster;
        this.TWEEN   = TWEEN;
    }

    /** Avvia l'animazione di camminata (loop ping-pong su braccia/gambe/testa) */
    camminata() {
        this.monster._startWalkAnimation();
    }

    /** Animazione di attacco (one-shot, poi il mostro torna a camminata/idle) */
    attacco() {
        this.monster.attack();
    }

    /** Animazione idle (dondolamento/respiro lento) */
    idle() {
        this.monster._startIdleAnimation();
    }

    /** Stato animazione corrente del mostro ('walk' | 'idle' | 'attack' | null) */
    getState() {
        return this.monster.getAnimState();
    }

    /** Ferma tutte le animazioni in corso sul mostro */
    stop() {
        this.monster._stopAllTweens();
    }
}
