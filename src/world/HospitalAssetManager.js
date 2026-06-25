import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { textureMap } from './maps/HospitalTextureMap.js';
import { hospitalAssets } from './maps/HospitalAssetList.js';

class HospitalAssetManagerClass {
    constructor() {
        this.models = {};
        this.materials = {};
        this.loader = new FBXLoader();
        this.textureLoader = new THREE.TextureLoader();
        this.isLoaded = false;
        
        // Disabilitiamo il cache di sistema perché creiamo il nostro manager
        THREE.Cache.enabled = true;
    }

    async preloadAll() {
        if (this.isLoaded) return;
        
        console.log("Preloading all Hospital Assets...");
        let loadedCount = 0;
        const total = hospitalAssets.length;
        
        return new Promise((resolve, reject) => {
            const checkDone = () => {
                loadedCount++;
                document.dispatchEvent(new CustomEvent('assetProgressEvent', { detail: { progress: (loadedCount / total) * 100 } }));
                if (loadedCount >= total) {
                    this.isLoaded = true;
                    console.log("All Hospital Assets Preloaded!");
                    resolve();
                }
            };

            hospitalAssets.forEach(filename => {
                this.loader.load('assets/models/hospital_test/' + filename, (fbx) => {
                    const model = fbx;
                    
                    // Applica lo scale 0.01 per convertire da cm a metri
                    model.scale.set(0.01, 0.01, 0.01);
                    model.updateMatrixWorld(true);

                    // Materiale PBR dinamico
                    const mapping = textureMap[filename];
                    let customMat = null;
                    
                    if (mapping) {
                        const basePath = 'assets/models/hospital_test/textures/' + mapping.prefix;
                        
                        // Creiamo un identificativo univoco per il materiale per evitare di duplicarlo in memoria
                        const matId = mapping.prefix;
                        
                        if (!this.materials[matId]) {
                            const map = this.textureLoader.load(basePath + mapping.base + '.png');
                            map.colorSpace = THREE.SRGBColorSpace;
                            
                            const normalMap = this.textureLoader.load(basePath + 'Normal.png');
                            const roughnessMap = this.textureLoader.load(basePath + 'Roughness.png');
                            const metallicMap = this.textureLoader.load(basePath + 'Metallic.png');
                            
                            this.materials[matId] = new THREE.MeshStandardMaterial({
                                map: map,
                                normalMap: normalMap,
                                roughnessMap: roughnessMap,
                                metalnessMap: metallicMap,
                                roughness: 1.0,
                                metalness: 1.0,
                            });
                        }
                        customMat = this.materials[matId];
                    }
                    
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true; // Nei livelli veri vogliamo le ombre
                            child.receiveShadow = true;
                            
                            if (customMat) {
                                child.material = customMat;
                            } else if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(m => m.transparent = false);
                                } else {
                                    child.material.transparent = false;
                                }
                            }
                        }
                    });

                    this.models[filename] = model;
                    checkDone();
                }, undefined, (err) => {
                    console.error("Errore preload FBX", filename, err);
                    checkDone(); // Continua anche se fallisce
                });
            });
        });
    }

    get(filename) {
        if (!this.models[filename]) {
            console.warn(`Asset ${filename} non trovato nel manager!`);
            return new THREE.Group();
        }
        // Il clone() di THREE.Group clona la gerarchia ma mantiene le geometrie e materiali per referenza (instancing leggero)
        return this.models[filename].clone();
    }
}

export const HospitalAssetManager = new HospitalAssetManagerClass();
