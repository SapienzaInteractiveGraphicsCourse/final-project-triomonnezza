import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Preloads and caches interior geometry GLB tiles and props.
 * Drop-in replacement for HospitalAssetManager but using the
 * `assets/models/interior/geometry/` and `assets/models/interior/props/` folders.
 *
 * Scale: interior GLBs are authored in metres → scale = 1.0 (no conversion needed).
 */

// Tile geometry used by MapBase.buildHospitalRoom()
export const interiorTiles = [
    // Plaster (Default / MapMedium)
    'floorTiles.glb',
    'ceilingPlaster.glb',
    'ceilingLight.glb',
    'wallPlaster.glb',
    'wallDoorPlaster.glb',
    'wallTiles.glb',
    'wallDoorTiles.glb',

    // Wood / Wallpaper (MapEasy)
    'floorWood.glb',
    'ceilingWood.glb',
    'wallWallpaper.glb',
    'wallDoorWallpaper.glb',

    // Stone / Brick (MapHard)
    'floorStone.glb',
    'ceilingConcrete.glb',
    'wallBrick.glb',
    'wallDoorBrick.glb',
];

// Props used by the maps (bed, chair, etc.)
export const interiorProps = [
    'bed.glb',
    'chair.glb',
    'table.glb',
    'bookshelf.glb',
    'cabinet.glb',
    'cabinetHigh.glb',
    'couchSmall.glb',
    'trashBin.glb',
    'lamp.glb',
    'plant.glb',
    'sideboard.glb',
    'painting.glb',
    'painting2.glb',
    'painting3.glb',
    'clock.glb',
    'radio.glb',
    'phone.glb',
    'book.glb',
    'bookStack.glb',
    'box.glb',
    'flashlight.glb',
];

class InteriorAssetManagerClass {
    constructor() {
        this.models = {};
        this.loader  = new GLTFLoader();
        this.isLoaded = false;
        THREE.Cache.enabled = true;
    }

    /**
     * Preloads all tiles + props into memory.
     * Dispatches 'assetProgressEvent' as files complete.
     */
    async preloadAll() {
        if (this.isLoaded) return;

        const allFiles = [...interiorTiles, ...interiorProps];
        const total = allFiles.length;
        let loadedCount = 0;

        console.log(`[InteriorAssetManager] Preloading ${total} interior GLB assets…`);

        return new Promise((resolve) => {
            const checkDone = () => {
                loadedCount++;
                document.dispatchEvent(new CustomEvent('assetProgressEvent', {
                    detail: { progress: (loadedCount / total) * 100 }
                }));
                if (loadedCount >= total) {
                    this.isLoaded = true;
                    console.log('[InteriorAssetManager] All assets preloaded.');
                    resolve();
                }
            };

            allFiles.forEach(filename => {
                // Geometry tiles live in /geometry/, props in /props/
                const subfolder = interiorTiles.includes(filename) ? 'geometry' : 'props';
                const path = `assets/models/interior/${subfolder}/${filename}`;

                this.loader.load(path, (gltf) => {
                    const model = gltf.scene;

                    // Interior GLBs are already in metres — no scale conversion needed.
                    // However we normalise them to a 4m tile footprint so they fit
                    // the MapBase grid.  Each geometry tile should already be ~4×4m;
                    // if the pack uses a different unit we detect it via bounding box.
                    model.updateMatrixWorld(true);

                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow    = true;
                            child.receiveShadow = true;
                            if (child.material) {
                                child.material.side = THREE.DoubleSide;
                                child.material.needsUpdate = true;
                            }
                        }
                    });

                    this.models[filename] = model;
                    checkDone();
                }, undefined, (err) => {
                    console.error(`[InteriorAssetManager] Failed to load ${path}`, err);
                    checkDone(); // Don't block startup on a missing asset
                });
            });
        });
    }

    /**
     * Returns a clone of the preloaded model.
     * @param {string} filename  e.g. 'floorTiles.glb'
     */
    get(filename) {
        if (!this.models[filename]) {
            console.warn(`[InteriorAssetManager] Asset "${filename}" not found.`);
            return new THREE.Group();
        }
        return this.models[filename].clone();
    }
}

export const InteriorAssetManager = new InteriorAssetManagerClass();
