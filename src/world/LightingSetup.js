/**
 * LightingSetup.js
 * RESPONSABILE: Davide (Artista)
 *
 * Gestisce tutta l'illuminazione della scena horror:
 *   - Luce ambientale minima (atmosfera soffocante)
 *   - Luci nei corridoi (PointLight con flickering via script)
 *   - Torcia del giocatore (SpotLight figlia della camera)
 *
 * INTERFACCIA ATTESA:
 *   const lighting = new LightingSetup(scene, camera);
 *   lighting.update(deltaTime);  // chiamato nel game loop
 *
 * EVENTI IN USCITA (per Federico - Regista):
 *   - 'torciaScarica'   → la torcia sta per esaurirsi (Federico: Tween di sfarfallio aggressivo)
 *   - 'luceSpenta'      → una luce del corridoio si spegne   (Federico: Tween di dissolvenza)
 */

import * as THREE from 'three';

export class LightingSetup {
    /**
     * @param {THREE.Scene}  scene  - La scena principale
     * @param {THREE.Camera} camera - La camera del giocatore (per agganciare la torcia)
     */
    constructor(scene, camera) {
        this.scene  = scene;
        this.camera = camera;

        // --- Torcia del giocatore ---
        // TODO Davide: regola intensity, distance, angle, penumbra per l'effetto horror
        this.torcia = null;
        this.torciaBatteria = 100; // 0-100, si scarica col tempo

        // --- Luci corridoio ---
        // TODO Davide: Array di { light: PointLight, baseIntensity, flickerTimer }
        this.corridoioLuci = [];

        this._initAmbient();
        this._initTorcia();
    }

    /** Luce ambientale globale molto bassa — il buio è protagonista */
    _initAmbient() {
        // TODO Davide: scegli colore (leggermente bluastro per horror) e intensity 0.05-0.15
        const ambient = new THREE.AmbientLight(0x111122, 0.1);
        this.scene.add(ambient);
    }

    /** Torcia del giocatore agganciata alla camera */
    _initTorcia() {
        // TODO Davide: SpotLight con cone stretto per effetto torcia realistica
        // Suggerimento: angle ~0.35, penumbra ~0.4, distance ~12, decay 2
        const torcia = new THREE.SpotLight(0xfff5e0, 1.5);
        torcia.angle     = 0.35;
        torcia.penumbra  = 0.4;
        torcia.distance  = 12;
        torcia.decay     = 2;
        torcia.castShadow = true;

        // La torcia segue lo sguardo del giocatore
        this.camera.add(torcia);
        this.camera.add(torcia.target); // target davanti alla camera
        torcia.target.position.set(0, 0, -1);

        this.torcia = torcia;
    }

    /**
     * Aggiunge una luce da corridoio alla scena e la registra per il flickering.
     * Chiamato da ciascuna Map (Map1, Map2…) durante la costruzione.
     *
     * @param {THREE.Vector3} position  - Posizione nel mondo
     * @param {number}        intensity - Intensità base (es. 0.8)
     * @param {number}        distance  - Raggio di influenza (es. 6)
     * @param {number|string} color     - Colore hex (es. 0xff4400 per arancio sporco)
     */
    addCorridoioLuce(position, intensity = 0.8, distance = 6, color = 0xff6600) {
        // TODO Davide: aggiungi castShadow se le performance lo permettono
        const luce = new THREE.PointLight(color, intensity, distance, 2);
        luce.position.copy(position);
        this.scene.add(luce);

        this.corridoioLuci.push({
            light:         luce,
            baseIntensity: intensity,
            flickerTimer:  Math.random() * 2, // offset casuale per non sfarfallare tutte insieme
            isActive:      true,
        });

        return luce; // restituita per eventuali riferimenti esterni
    }

    /**
     * Loop principale — chiamato ogni frame dal game loop in main.js
     * @param {number} deltaTime
     */
    update(deltaTime) {
        this._updateTorcia(deltaTime);
        this._updateFlicker(deltaTime);
    }

    /** Scarica lentamente la torcia e lancia evento quando è critica */
    _updateTorcia(deltaTime) {
        // TODO Davide: regola il tasso di scarica (es. 2 unità al secondo)
        const TASSO_SCARICA = 2;

        if (this.torciaBatteria > 0) {
            this.torciaBatteria -= TASSO_SCARICA * deltaTime;
            this.torciaBatteria = Math.max(0, this.torciaBatteria);

            // Mappa la batteria all'intensità (es. 100% → 1.5, 0% → 0.0)
            this.torcia.intensity = (this.torciaBatteria / 100) * 1.5;

            // Evento per Federico: avvia il Tween di sfarfallio aggressivo al 20%
            if (this.torciaBatteria < 20 && !this._torciaCriticaNotificata) {
                this._torciaCriticaNotificata = true;
                document.dispatchEvent(new CustomEvent('torciaScarica', {
                    detail: { batteria: this.torciaBatteria }
                }));
            }
        }
    }

    /** Effetto sfarfallio sulle luci del corridoio (matematica pura — niente Tween qui) */
    _updateFlicker(deltaTime) {
        for (const entry of this.corridoioLuci) {
            if (!entry.isActive) continue;

            entry.flickerTimer += deltaTime;

            // Oscillazione con rumore: combina sin a frequenze diverse per effetto organico
            // TODO Davide: sperimenta con le frequenze per l'atmosfera che vuoi
            const flicker = Math.sin(entry.flickerTimer * 8)
                          * Math.sin(entry.flickerTimer * 3.7)
                          * 0.3; // ampiezza max 30%

            entry.light.intensity = entry.baseIntensity + flicker;
        }
    }

    /**
     * Spegne permanentemente una luce del corridoio (chiamato da Federico via Tween)
     * @param {THREE.PointLight} light
     */
    spegniLuce(light) {
        const entry = this.corridoioLuci.find(e => e.light === light);
        if (entry) {
            entry.isActive = false;
            entry.light.intensity = 0;
        }
    }
}
