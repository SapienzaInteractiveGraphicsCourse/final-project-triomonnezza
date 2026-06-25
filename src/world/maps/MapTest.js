import * as THREE from 'three';
import { MapBase } from './MapBase.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { geomAssets, propAssets } from './AssetList.js';

export class MapTest extends MapBase {
    constructor(scene) {
        super(scene);
        this.loader = new GLTFLoader();
    }

    load() {
        console.log("Loading Map Test with all assets...");

        // Piattaforma enorme per appoggiare tutto
        const floorGeo = new THREE.PlaneGeometry(200, 200);
        const floorMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.collisionBoxes.push(new THREE.Box3().setFromObject(floor));

        // Luce fortissima per vedere bene
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        const gridSpacing = 4;
        let xPos = -40;
        let zPos = -40;

        // Funzione helper per caricare un asset asincrono e piazzarlo
        const loadAsset = (filename, pathPrefix) => {
            this.loader.load(pathPrefix + filename, (gltf) => {
                const model = gltf.scene;
                model.position.set(xPos, 0, zPos);
                
                // Muri e porte necessitano di essere alzati un po' se l'origine è al centro
                // Ma di solito i GLB architettonici hanno l'origine in basso. 
                // Scaliamoli a una dimensione ragionevole
                
                // GLB format uses 1 unit = 1 meter natively. We don't scale it dynamically.
                // model.scale.set(1, 1, 1);
                
                // Allinea la base dell'oggetto esattamente sul pavimento (Y = 0)
                const newBox = new THREE.Box3().setFromObject(model);
                model.position.y -= newBox.min.y;
                
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = false; // Disabilita per ridurre il lag nel test
                        child.receiveShadow = false;
                    }
                });

                this.scene.add(model);
                
                // Aggiungi hitbox di collisione grossolana
                const collisionBox = new THREE.Box3().setFromObject(model);
                this.collisionBoxes.push(collisionBox);

                // Aggiungi etichetta di testo sopra l'asset
                const sprite = this.createTextSprite(filename);
                sprite.position.set(xPos, 4, zPos);
                this.scene.add(sprite);

                // Incrementa la posizione per il prossimo in una riga singola
                xPos += gridSpacing;
            }, undefined, (err) => {
                console.error("Errore nel caricare", filename, err);
            });
        };

        // Itera tutti gli asset di geometria
        geomAssets.forEach(file => loadAsset(file, 'assets/models/interior/geometry/'));
        
        // Itera tutti gli asset props
        propAssets.forEach(file => loadAsset(file, 'assets/models/interior/props/'));

        // Spawn del player al centro della griglia
        this.monsterSpawn = new THREE.Vector3(1000, -100, 1000); // Spawna il mostro molto lontano per evitare il game over istantaneo
        
        // Finta promessa globale per sbloccare la UI, 
        // dato che li carichiamo in modo asincrono senza bloccare la schermata iniziale
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
        ctx.fillStyle = '#00ffaa';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(4, 1, 1);
        sprite.renderOrder = 999; // Sempre visibile sopra i modelli
        return sprite;
    }
}
