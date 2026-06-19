/**
 * TextureLoader.js
 * RESPONSABILE: Davide (Artista)
 *
 * Centralizza il caricamento di tutte le texture del gioco.
 * Gestisce tre tipologie (requisiti del professore):
 *   - Color Map    (diffuse / albedo)
 *   - Normal Map   (rilievi sulla superficie senza geometria aggiuntiva)
 *   - Specular Map (riflessi: pavimento bagnato, sangue, metallo arrugginito)
 *
 * UTILIZZO:
 *   const tl = new HorrorTextureLoader();
 *   const muro = tl.getMuro();        // { map, normalMap, specularMap }
 *   mesh.material = new THREE.MeshPhongMaterial({ ...muro });
 *
 * NOTA: Le texture NON sono ancora presenti in assets/textures/.
 *       Sostituisci i path con i file reali quando pronti.
 *       Le texture DEVONO essere locali per funzionare su GitHub Pages.
 */

import * as THREE from 'three';

const loader = new THREE.TextureLoader();

/**
 * Helper: carica una texture e applica il wrapping/repeat standard
 * @param {string} path
 * @param {number} repeatX
 * @param {number} repeatY
 */
function loadTex(path, repeatX = 1, repeatY = 1) {
    const tex = loader.load(path);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    return tex;
}

export class HorrorTextureLoader {

    // ─────────────────────────────────────────────
    //  MURI
    // ─────────────────────────────────────────────

    /** Muro standard del corridoio (mattoni consumati, intonaco scrostato) */
    getMuro() {
        return {
            // TODO Davide: sostituisci con i path reali delle tue texture
            map:        loadTex('assets/textures/walls/wall_color.jpg',    2, 2),
            normalMap:  loadTex('assets/textures/walls/wall_normal.jpg',   2, 2),
            specularMap:loadTex('assets/textures/walls/wall_specular.jpg', 2, 2),
        };
    }

    /** Muro con macchie di sangue (zona del jumpscare) */
    getMuroSangue() {
        return {
            map:        loadTex('assets/textures/walls/wall_blood_color.jpg',    1, 1),
            normalMap:  loadTex('assets/textures/walls/wall_blood_normal.jpg',   1, 1),
            specularMap:loadTex('assets/textures/walls/wall_blood_specular.jpg', 1, 1),
        };
    }

    // ─────────────────────────────────────────────
    //  PAVIMENTO
    // ─────────────────────────────────────────────

    /** Pavimento bagnato/riflettente (corridoio principale) */
    getPavimentoBagnato() {
        return {
            map:        loadTex('assets/textures/floors/floor_wet_color.jpg',    4, 4),
            normalMap:  loadTex('assets/textures/floors/floor_wet_normal.jpg',   4, 4),
            specularMap:loadTex('assets/textures/floors/floor_wet_specular.jpg', 4, 4),
        };
    }

    /** Pavimento asciutto (stanze secondarie) */
    getPavimentoSecco() {
        return {
            map:        loadTex('assets/textures/floors/floor_dry_color.jpg',    3, 3),
            normalMap:  loadTex('assets/textures/floors/floor_dry_normal.jpg',   3, 3),
            specularMap:null, // nessuna specular — non riflette
        };
    }

    // ─────────────────────────────────────────────
    //  SOFFITTO
    // ─────────────────────────────────────────────

    /** Soffitto scrostato con macchie d'umidità */
    getSoffitto() {
        return {
            map:        loadTex('assets/textures/ceiling/ceiling_color.jpg',  2, 2),
            normalMap:  loadTex('assets/textures/ceiling/ceiling_normal.jpg', 2, 2),
            specularMap:null,
        };
    }

    // ─────────────────────────────────────────────
    //  FACTORY: Crea un MeshPhongMaterial già pronto
    // ─────────────────────────────────────────────

    /**
     * Restituisce un THREE.MeshPhongMaterial con le texture applicate.
     * MeshPhongMaterial supporta normalMap + specularMap (richiesto dal prof).
     *
     * @param {'muro'|'muro_sangue'|'pavimento_bagnato'|'pavimento_secco'|'soffitto'} tipo
     */
    createMaterial(tipo) {
        let textures;
        switch (tipo) {
            case 'muro':             textures = this.getMuro();             break;
            case 'muro_sangue':      textures = this.getMuroSangue();       break;
            case 'pavimento_bagnato':textures = this.getPavimentoBagnato(); break;
            case 'pavimento_secco':  textures = this.getPavimentoSecco();   break;
            case 'soffitto':         textures = this.getSoffitto();         break;
            default:
                console.warn(`[TextureLoader] Tipo sconosciuto: "${tipo}". Uso materiale di default.`);
                return new THREE.MeshPhongMaterial({ color: 0x888888 });
        }

        return new THREE.MeshPhongMaterial({
            map:         textures.map         || null,
            normalMap:   textures.normalMap   || null,
            specularMap: textures.specularMap || null,
            specular:    new THREE.Color(0x333333), // riflessività base
            shininess:   textures.specularMap ? 60 : 5,
        });
    }
}
