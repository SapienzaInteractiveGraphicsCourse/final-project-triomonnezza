import * as THREE from 'three';
import { MapBase } from './MapBase.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { hospitalAssets } from './HospitalAssetList.js';
import { textureMap } from './HospitalTextureMap.js';

export class MapHospitalTest extends MapBase {
    constructor(scene) {
        super(scene);
        this.loader = new FBXLoader();
        this.textureLoader = new THREE.TextureLoader();
        this.textureCache = {};
    }

    getTexture(path) {
        if (!this.textureCache[path]) {
            this.textureCache[path] = this.textureLoader.load(path);
        }
        return this.textureCache[path];
    }

    load() {
        console.log("Loading Hospital FBX Test Map...");

        // Piattaforma enorme
        const floorGeo = new THREE.PlaneGeometry(200, 200);
        const floorMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.collisionBoxes.push(new THREE.Box3().setFromObject(floor));

        // Luce fortissima per vedere i colori crudi
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        const gridSpacing = 4;
        let xPos = -40;
        const zPos = -10; // Riga singola un po' più vicina

        const loadAsset = (filename) => {
            this.loader.load('assets/models/hospital_test/' + filename, (fbx) => {
                const model = fbx;
                model.position.set(xPos, 0, zPos);
                
                // I file FBX provenienti da Unreal/Blender spesso usano i centimetri (100 = 1m).
                // Proviamo a scalarli universalmente di 0.01 per renderli in proporzione col player.
                model.scale.set(0.01, 0.01, 0.01);
                model.updateMatrixWorld(true);
                
                // Ricalcola il bounding box dopo il ridimensionamento
                const newBox = new THREE.Box3().setFromObject(model);
                
                // Allinea la base dell'oggetto esattamente sul pavimento (Y = 0)
                model.position.y -= newBox.min.y;
                
                const mapping = textureMap[filename];
                let customMat = null;
                
                if (mapping) {
                    const basePath = 'assets/models/hospital_test/textures/' + mapping.prefix;
                    const map = this.getTexture(basePath + mapping.base + '.png');
                    map.colorSpace = THREE.SRGBColorSpace;
                    
                    const normalMap = this.getTexture(basePath + 'Normal.png');
                    const roughnessMap = this.getTexture(basePath + 'Roughness.png');
                    const metallicMap = this.getTexture(basePath + 'Metallic.png');
                    
                    customMat = new THREE.MeshStandardMaterial({
                        map: map,
                        normalMap: normalMap,
                        roughnessMap: roughnessMap,
                        metalnessMap: metallicMap,
                        roughness: 1.0,
                        metalness: 1.0,
                    });
                }
                
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = false; // Disabilita per ridurre il lag nel test
                        child.receiveShadow = false;
                        
                        if (customMat) {
                            child.material = customMat;
                        } else if (child.material) {
                            // Fix fallback per materiali trasparenti non voluti
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.transparent = false);
                            } else {
                                child.material.transparent = false;
                            }
                        }
                    }
                });

                this.scene.add(model);
                
                const collisionBox = new THREE.Box3().setFromObject(model);
                this.collisionBoxes.push(collisionBox);

                const sprite = this.createTextSprite(filename);
                sprite.position.set(xPos, 4, zPos);
                this.scene.add(sprite);

                // Incrementa in una riga singola
                xPos += gridSpacing;
            }, undefined, (err) => {
                console.error("Errore nel caricare FBX", filename, err);
            });
        };

        // Itera tutti gli asset FBX dell'ospedale
        hospitalAssets.forEach(file => loadAsset(file));

        // Spawn sicuro per il giocatore
        this.monsterSpawn = new THREE.Vector3(1000, -100, 1000); // Lontano per evitare Game Over
        
        // Sblocca UI
        document.dispatchEvent(new Event('assetsLoadedEvent'));
    }

    createTextSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = '32px Arial';
        ctx.fillStyle = '#ffaa00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(4, 1, 1);
        sprite.renderOrder = 999;
        return sprite;
    }
}
