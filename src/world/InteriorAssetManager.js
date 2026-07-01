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

    // Doors
    'doorWood.glb',
    'low_poly_psx_hinged_door.glb',
];

// Props used by the maps (bed, chair, etc.)
export const interiorProps = [
    // Seating & beds
    'bed.glb',
    'bed2.glb',
    'chair.glb',
    'chair2.glb',
    'chair3.glb',
    'couchSmall.glb',
    'couchSmall2.glb',
    'couchBig.glb',

    // Tables & desks
    'table.glb',
    'table2.glb',
    'tableSmall.glb',
    'tableSmall2.glb',

    // Storage
    'bookshelf.glb',
    'cabinet.glb',
    'cabinetHigh.glb',
    'cabinetLow.glb',
    'sideboard.glb',
    'sideboard2.glb',
    'shelves.glb',
    'wallShelf.glb',
    'wallShelf2.glb',

    // Decorative / wall items
    'painting.glb',
    'painting2.glb',
    'painting3.glb',
    'painting4.glb',
    'mirror.glb',
    'mirror2.glb',
    'clock.glb',
    'wallLight.glb',

    // Electronics / appliances
    'radio.glb',
    'phone.glb',
    'tv.glb',
    'lamp.glb',
    'tableLamp.glb',

    // Bathroom
    'bathroomSink.glb',
    'toilet.glb',
    'toiletPaper.glb',

    // Nature
    'plant.glb',
    'plant2.glb',

    // Junk & clutter
    'book.glb',
    'bookStack.glb',
    'bookStack2.glb',
    'box.glb',
    'box2.glb',
    'trashBin.glb',
    'trashBag.glb',
    'bucket.glb',
    'broom.glb',

    // Misc
    'flashlight.glb',
    'radiator.glb',
    'breakerBox.glb',
    'ladder.glb',
    'carpet.glb',
    'carpet2.glb',
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

                    if (filename === 'low_poly_psx_hinged_door.glb') {
                        const box = new THREE.Box3().setFromObject(model);
                        const size = new THREE.Vector3();
                        box.getSize(size);
                        console.log(`[DOOR DEBUG] BoundingBox Size: x=${size.x}, y=${size.y}, z=${size.z}`);
                    }

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
