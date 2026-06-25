import * as THREE from 'three';
import { HospitalAssetManager } from '../HospitalAssetManager.js';

export class MapBase {

    constructor(scene) {
        this.scene = scene;
        this.collisionBoxes = [];
        this.triggerZones = [];
        this.monsterSpawn = new THREE.Vector3(0, 1.5, 0); // Default spawn
        this.flickeringLights = [];
    }

    spawnAsset(filename, position, rotationY = 0, isProp = false) {
        const mesh = HospitalAssetManager.get(filename);
        if (!mesh) return null;
        
        mesh.position.copy(position);
        mesh.rotation.set(0, rotationY, 0);
        
        this.scene.add(mesh);
        
        // Luci personalizzate per gli oggetti speciali
        if (filename === 'Exit_sign.fbx') {
            const greenLight = new THREE.PointLight(0x00ff00, 10.0, 6); // Luce verde per l'insegna
            greenLight.position.set(0, -0.5, 0);
            mesh.add(greenLight);
        }

        // Aggiungi collisione (solo se non è un prop piccolo o decorativo, altrimenti il player si incastra)
        if (!isProp) {
            const box = new THREE.Box3().setFromObject(mesh);
            this.collisionBoxes.push(box);
        } else {
            // Per i prop, potremmo fare un box più piccolo o cilindrico, 
            // ma per ora aggiungiamo il box di base per i grandi prop.
            const box = new THREE.Box3().setFromObject(mesh);
            this.collisionBoxes.push(box);
        }
        
        return mesh;
    }

    addInvisibleCollisionBox(x, y, z, w, h, d) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial());
        mesh.position.set(x, y, z);
        mesh.updateMatrixWorld(true);
        this.collisionBoxes.push(new THREE.Box3().setFromObject(mesh));
    }

    // Costruttore modulare per stanze ospedaliere
    // grid = 4 metri. cx, cz = centro logico in metri.
    buildHospitalRoom(cx, cz, cols, rows, doorways = [], hasCeiling = true) {
        const tileSize = 4; // Supponiamo 4 metri
        const startX = cx - (cols * tileSize) / 2 + tileSize / 2;
        const startZ = cz - (rows * tileSize) / 2 + tileSize / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * tileSize;
                const z = startZ + r * tileSize;

                // Pavimento e soffitto
                this.spawnAsset('floor_tile_1.fbx', new THREE.Vector3(x, 0, z));
                if (hasCeiling) {
                    this.spawnAsset('ceiling_tile.fbx', new THREE.Vector3(x, 4, z));
                    
                    // Solo in alcune stanze o posizioni mettiamo la lampada per tenere buio
                    if (Math.random() > 0.4) {
                        this.spawnAsset('ceiling_light.fbx', new THREE.Vector3(x, 4, z));
                        const light = new THREE.PointLight(0xddddff, 0.15, 8); // Luce molto debole (0.15)
                        light.position.set(x, 3.8, z);
                        this.scene.add(light);
                        
                        // Registra per sfarfallio
                        this.flickeringLights.push({
                            light: light,
                            timer: Math.random() * 5.0,
                            isFlickering: false,
                            baseIntensity: 0.15
                        });
                    }
                }

                // Muri esterni
                const isNorthEdge = (r === 0);
                const isSouthEdge = (r === rows - 1);
                const isWestEdge = (c === 0);
                const isEastEdge = (c === cols - 1);

                if (isNorthEdge) {
                    if (doorways.includes(`N_${c}`)) this.spawnAsset('tile_doorway_1.fbx', new THREE.Vector3(x, 0, z - tileSize/2), 0);
                    else this.spawnAsset('tile_wall.fbx', new THREE.Vector3(x, 0, z - tileSize/2), 0);
                }
                if (isSouthEdge) {
                    if (doorways.includes(`S_${c}`)) this.spawnAsset('tile_doorway_1.fbx', new THREE.Vector3(x, 0, z + tileSize/2), Math.PI);
                    else this.spawnAsset('tile_wall.fbx', new THREE.Vector3(x, 0, z + tileSize/2), Math.PI);
                }
                if (isWestEdge) {
                    if (doorways.includes(`W_${r}`)) this.spawnAsset('tile_doorway_1.fbx', new THREE.Vector3(x - tileSize/2, 0, z), -Math.PI/2);
                    else this.spawnAsset('tile_wall.fbx', new THREE.Vector3(x - tileSize/2, 0, z), -Math.PI/2);
                }
                if (isEastEdge) {
                    if (doorways.includes(`E_${r}`)) this.spawnAsset('tile_doorway_1.fbx', new THREE.Vector3(x + tileSize/2, 0, z), Math.PI/2);
                    else this.spawnAsset('tile_wall.fbx', new THREE.Vector3(x + tileSize/2, 0, z), Math.PI/2);
                }
            }
        }
        
        // Aggiungi un grosso box di collisione per i muri esterni per evitare glitch attraverso i bordi
        const width = cols * tileSize;
        const depth = rows * tileSize;
        const t = 1; // Spessore muro logico
        this.addInvisibleCollisionBox(cx, 2, cz - depth/2, width, 4, t); // Nord
        this.addInvisibleCollisionBox(cx, 2, cz + depth/2, width, 4, t); // Sud
        this.addInvisibleCollisionBox(cx - width/2, 2, cz, t, 4, depth); // Ovest
        this.addInvisibleCollisionBox(cx + width/2, 2, cz, t, 4, depth); // Est
    }

    addTrigger(x, y, z, name) {
        const triggerMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2 }));
        triggerMesh.position.set(x, y, z);
        this.scene.add(triggerMesh);
        this.triggerZones.push({
            box: new THREE.Box3().setFromObject(triggerMesh),
            nome: name,
            giaAttivato: false
        });
    }

    update(deltaTime) {
        if (this.flickeringLights) {
            for (let i = 0; i < this.flickeringLights.length; i++) {
                const obj = this.flickeringLights[i];
                obj.timer -= deltaTime;
                if (obj.isFlickering) {
                    // Durante lo sfarfallio, accendi o spegni casualmente
                    obj.light.intensity = Math.random() > 0.5 ? obj.baseIntensity : 0;
                    if (obj.timer <= 0) {
                        obj.isFlickering = false;
                        obj.light.intensity = obj.baseIntensity;
                        obj.timer = 5.0 + Math.random() * 15.0; // Rimani acceso a lungo
                    }
                } else {
                    if (obj.timer <= 0) {
                        obj.isFlickering = true;
                        obj.timer = 0.5 + Math.random() * 1.5; // Sfarfalla per un po'
                    }
                }
            }
        }
    }

    load() {
        // Da implementare nelle classi figlie
    }

    getCollisionBoxes() {
        return this.collisionBoxes;
    }

    getTriggerZones() {
        return this.triggerZones;
    }
}
