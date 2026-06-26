import * as THREE from 'three';
import { InteriorAssetManager } from '../InteriorAssetManager.js';

export class MapBase {

    constructor(scene) {
        this.scene = scene;
        this.collisionBoxes = [];
        this.triggerZones = [];
        this.playerSpawn = new THREE.Vector3(0, 1.8, 0);
        this.playerSpawnRotationY = 0;
        this.monsterSpawn = new THREE.Vector3(0, 1.5, 0);
        this.flickeringLights = [];
    }

    getMeshFromManager(filename) {
        if (!filename) return new THREE.Group();
        return InteriorAssetManager.get(filename);
    }

    spawnAsset(filename, position, rotationY = 0) {
        const mesh = this.getMeshFromManager(filename);
        if (!mesh) return null;

        mesh.position.copy(position);
        mesh.rotation.set(0, rotationY, 0);
        this.scene.add(mesh);

        if (filename === 'Exit_sign.fbx') {
            const greenLight = new THREE.PointLight(0x00ff44, 5.0, 8);
            greenLight.position.set(0, -0.5, 0);
            mesh.add(greenLight);
        }

        const box = new THREE.Box3().setFromObject(mesh);
        this.collisionBoxes.push(box);
        return mesh;
    }

    spawnTile(filename, position, rotationY = 0) {
        const mesh = InteriorAssetManager.get(filename);
        if (!mesh) return null;
        mesh.position.copy(position);
        mesh.rotation.set(0, rotationY, 0);
        this.scene.add(mesh);
        return mesh;
    }

    addInvisibleCollisionBox(x, y, z, w, h, d) {
        const geo  = new THREE.BoxGeometry(w, h, d);
        const mat  = new THREE.MeshBasicMaterial({ visible: false });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.updateMatrixWorld(true);
        this.collisionBoxes.push(new THREE.Box3().setFromObject(mesh));
    }

    buildHospitalRoom(cx, cz, cols, rows, doorways = [], options = {}) {
        const {
            hasCeiling = true,
            floorTile = 'floorTiles.glb',
            ceilingTile = 'ceilingPlaster.glb',
            wallTile = 'wallPlaster.glb',
            wallDoorTile = 'wallDoorPlaster.glb',
            ceilingHeight = 4,
            wallScaleY = 1,
            wallOffsetY = 0
        } = options;
        const tileSize = 4;
        const startX = cx - (cols * tileSize) / 2 + tileSize / 2;
        const startZ = cz - (rows * tileSize) / 2 + tileSize / 2;

        let lightsPlaced = 0;
        const maxLights = Math.max(1, Math.floor((cols * rows) / 4));

        const scaleWall = (mesh) => {
            if (mesh) {
                if (wallScaleY !== 1) mesh.scale.set(1, wallScaleY, 1);
                if (wallOffsetY !== 0) mesh.position.y += wallOffsetY;
            }
        };

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * tileSize;
                const z = startZ + r * tileSize;

                this.spawnTile(floorTile, new THREE.Vector3(x, 0, z));

                if (hasCeiling) {
                    this.spawnTile(ceilingTile, new THREE.Vector3(x, ceilingHeight, z));

                    if (lightsPlaced < maxLights && Math.random() > 0.4) {
                        this.spawnTile('ceilingLight.glb', new THREE.Vector3(x, ceilingHeight, z));
                        const light = new THREE.PointLight(0xddeeff, 1.5, 14);
                        light.position.set(x, ceilingHeight - 0.5, z);
                        this.scene.add(light);
                        this.flickeringLights.push({
                            light, timer: Math.random() * 5.0,
                            isFlickering: false, baseIntensity: 1.5
                        });
                        lightsPlaced++;
                    }
                }

                const isN = r === 0, isS = r === rows - 1;
                const isW = c === 0, isE = c === cols - 1;

                if (isN) {
                    const t = doorways.includes(`N_${c}`) ? wallDoorTile : wallTile;
                    scaleWall(this.spawnTile(t, new THREE.Vector3(x, 0, z - tileSize / 2), 0));
                }
                if (isS) {
                    const t = doorways.includes(`S_${c}`) ? wallDoorTile : wallTile;
                    scaleWall(this.spawnTile(t, new THREE.Vector3(x, 0, z + tileSize / 2), Math.PI));
                }
                if (isW) {
                    const t = doorways.includes(`W_${r}`) ? wallDoorTile : wallTile;
                    scaleWall(this.spawnTile(t, new THREE.Vector3(x - tileSize / 2, 0, z), -Math.PI / 2));
                }
                if (isE) {
                    const t = doorways.includes(`E_${r}`) ? wallDoorTile : wallTile;
                    scaleWall(this.spawnTile(t, new THREE.Vector3(x + tileSize / 2, 0, z), Math.PI / 2));
                }
            }
        }

        const halfW = (cols * tileSize) / 2;
        const halfD = (rows * tileSize) / 2;

        this._buildWallWithGaps(cx, cz - halfD, true,  doorways, 'N', cols, startX, tileSize);
        this._buildWallWithGaps(cx, cz + halfD, true,  doorways, 'S', cols, startX, tileSize);
        this._buildWallWithGaps(cx - halfW, cz, false, doorways, 'W', rows, startZ, tileSize);
        this._buildWallWithGaps(cx + halfW, cz, false, doorways, 'E', rows, startZ, tileSize);
    }

    _buildWallWithGaps(wallX, wallZ, isHorizontal, doorways, side, count, startCoord, tileSize) {
        const doorWidth = 2.4;
        const wallH = 4.5;
        const wallT = 0.5;

        for (let i = 0; i < count; i++) {
            const hasDoor    = doorways.includes(`${side}_${i}`);
            const tileCenter = startCoord + i * tileSize;

            if (hasDoor) {
                const sideLen = (tileSize - doorWidth) / 2;
                if (sideLen > 0.05) {
                    const offset = tileSize / 2 - sideLen / 2;
                    if (isHorizontal) {
                        this.addInvisibleCollisionBox(tileCenter - offset, wallH / 2, wallZ, sideLen, wallH, wallT);
                        this.addInvisibleCollisionBox(tileCenter + offset, wallH / 2, wallZ, sideLen, wallH, wallT);
                    } else {
                        this.addInvisibleCollisionBox(wallX, wallH / 2, tileCenter - offset, wallT, wallH, sideLen);
                        this.addInvisibleCollisionBox(wallX, wallH / 2, tileCenter + offset, wallT, wallH, sideLen);
                    }
                }
            } else {
                if (isHorizontal) {
                    this.addInvisibleCollisionBox(tileCenter, wallH / 2, wallZ, tileSize, wallH, wallT);
                } else {
                    this.addInvisibleCollisionBox(wallX, wallH / 2, tileCenter, wallT, wallH, tileSize);
                }
            }
        }
    }

    buildRoomByTiles(tx, tz, cols, rows, doorways = []) {
        // Tile size is 4m. Center of tile (0,0) is at x=0, z=0.
        // Left edge of tile 0 is x=-2. Right edge is x=2.
        // A room of size (cols, rows) starting at tile (tx, tz) has:
        // Left edge: tx * 4 - 2
        // Right edge: (tx + cols) * 4 - 2
        // Center X: tx * 4 - 2 + (cols * 4) / 2 = tx * 4 + cols * 2 - 2
        const cx = tx * 4 + cols * 2 - 2;
        const cz = tz * 4 + rows * 2 - 2;
        this.buildBlockRoom(cx, cz, cols, rows, doorways);
    }

    buildBlockRoom(cx, cz, cols, rows, doorways = []) {
        const tileSize = 4;
        const w = cols * tileSize;
        const d = rows * tileSize;
        const wallH = 4.5;
        const wallT = 0.5;
        const doorWidth = 2.4;

        const floorGeo = new THREE.BoxGeometry(w, 0.5, d);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(cx, -0.25, cz);
        floor.receiveShadow = true;
        this.scene.add(floor);

        const ceilGeo = new THREE.BoxGeometry(w, 0.5, d);
        const ceilMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const ceil = new THREE.Mesh(ceilGeo, ceilMat);
        ceil.position.set(cx, wallH + 0.25, cz);
        this.scene.add(ceil);

        const startX = cx - w/2 + tileSize/2;
        const startZ = cz - d/2 + tileSize/2;

        this._buildVisibleWallWithGaps(cx, cz - d/2, true, doorways, 'N', cols, startX, tileSize, wallH, wallT, doorWidth);
        this._buildVisibleWallWithGaps(cx, cz + d/2, true, doorways, 'S', cols, startX, tileSize, wallH, wallT, doorWidth);
        this._buildVisibleWallWithGaps(cx - w/2, cz, false, doorways, 'W', rows, startZ, tileSize, wallH, wallT, doorWidth);
        this._buildVisibleWallWithGaps(cx + w/2, cz, false, doorways, 'E', rows, startZ, tileSize, wallH, wallT, doorWidth);

        const light = new THREE.PointLight(0xffeedd, 1.0, 15);
        light.position.set(cx, wallH - 0.5, cz);
        this.scene.add(light);
    }

    _buildVisibleWallWithGaps(wallX, wallZ, isHorizontal, doorways, side, count, startCoord, tileSize, wallH, wallT, doorWidth) {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xa0a0a0 });

        const addVisibleBox = (x, y, z, w, h, d) => {
            const geo = new THREE.BoxGeometry(w, h, d);
            const mesh = new THREE.Mesh(geo, wallMat);
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.updateMatrixWorld(true);
            this.scene.add(mesh);
            this.collisionBoxes.push(new THREE.Box3().setFromObject(mesh));
        };

        const spawnInteractiveDoor = (x, y, z, rotationY) => {
            const mesh = InteriorAssetManager.get('low_poly_psx_hinged_door.glb');
            if (!mesh) return;
            
            // 1. Reset mesh to measure raw size
            mesh.position.set(0, 0, 0);
            mesh.rotation.set(0, 0, 0);
            mesh.scale.set(1, 1, 1);
            mesh.updateMatrixWorld(true);
            
            const rawBox = new THREE.Box3().setFromObject(mesh);
            const rawSize = new THREE.Vector3();
            rawBox.getSize(rawSize);
            
            // 2. Calculate scaling to fit our 2.4 x 3.0 doorway
            const targetWidth = 2.4;
            const targetHeight = 3.0;
            
            const scaleX = targetWidth / (rawSize.x || 1);
            const scaleY = targetHeight / (rawSize.y || 1);
            const scaleZ = 1.0; // Keep depth normal
            
            mesh.scale.set(scaleX, scaleY, scaleZ);
            mesh.updateMatrixWorld(true);
            
            const scaledBox = new THREE.Box3().setFromObject(mesh);
            
            // 3. Create a Hinge Group to allow correct swinging
            const hinge = new THREE.Group();
            
            // Offset mesh so its left edge (min.x) and bottom (min.y) are at the hinge origin
            mesh.position.set(-scaledBox.min.x, -scaledBox.min.y, -(scaledBox.min.z + scaledBox.max.z) / 2);
            hinge.add(mesh);
            
            // 4. Position the hinge in world space
            hinge.position.set(x, 0, z);
            hinge.rotation.set(0, rotationY, 0);
            // Move the hinge itself to the left edge of the doorway hole
            hinge.translateX(-targetWidth / 2);
            
            const doorData = { 
                isInteractive: true, 
                tipo: 'porta', 
                isOpen: false,
                startRotationY: rotationY
            };
            
            hinge.userData = doorData;
            // The raycaster hits the mesh, so give it the same userData reference
            mesh.traverse((child) => {
                if (child.isMesh) child.userData = doorData;
            });
            
            hinge.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(hinge);
            hinge.userData.collisionBox = box;
            
            this.scene.add(hinge);
            this.collisionBoxes.push(box);
            return hinge;
        };

        for (let i = 0; i < count; i++) {
            const hasDoor    = doorways.includes(`${side}_${i}`);
            const tileCenter = startCoord + i * tileSize;

            if (hasDoor) {
                const sideLen = (tileSize - doorWidth) / 2;
                if (sideLen > 0.05) {
                    const offset = tileSize / 2 - sideLen / 2;
                    if (isHorizontal) {
                        addVisibleBox(tileCenter - offset, wallH / 2, wallZ, sideLen, wallH, wallT);
                        addVisibleBox(tileCenter + offset, wallH / 2, wallZ, sideLen, wallH, wallT);
                    } else {
                        addVisibleBox(wallX, wallH / 2, tileCenter - offset, wallT, wallH, sideLen);
                        addVisibleBox(wallX, wallH / 2, tileCenter + offset, wallT, wallH, sideLen);
                    }
                }
                const lintelH = 1.5; 
                const lintelY = wallH - lintelH / 2;
                if (isHorizontal) {
                    addVisibleBox(tileCenter, lintelY, wallZ, doorWidth, lintelH, wallT);
                    spawnInteractiveDoor(tileCenter, 0, wallZ, 0);
                } else {
                    addVisibleBox(wallX, lintelY, tileCenter, wallT, lintelH, doorWidth);
                    spawnInteractiveDoor(wallX, 0, tileCenter, Math.PI / 2);
                }
            } else {
                if (isHorizontal) {
                    addVisibleBox(tileCenter, wallH / 2, wallZ, tileSize, wallH, wallT);
                } else {
                    addVisibleBox(wallX, wallH / 2, tileCenter, wallT, wallH, tileSize);
                }
            }
        }
    }

    addTrigger(x, y, z, name) {
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.0 });
        const triggerMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), mat);
        triggerMesh.position.set(x, y, z);
        this.scene.add(triggerMesh);
        this.triggerZones.push({
            box: new THREE.Box3().setFromObject(triggerMesh),
            nome: name,
            giaAttivato: false
        });
    }

    update(deltaTime) {
        for (const obj of this.flickeringLights) {
            obj.timer -= deltaTime;
            if (obj.isFlickering) {
                obj.light.intensity = Math.random() > 0.5 ? obj.baseIntensity : 0;
                if (obj.timer <= 0) {
                    obj.isFlickering = false;
                    obj.light.intensity = obj.baseIntensity;
                    obj.timer = 6.0 + Math.random() * 12.0;
                }
            } else {
                if (obj.timer <= 0) {
                    obj.isFlickering = true;
                    obj.timer = 0.3 + Math.random() * 1.0;
                }
            }
        }
    }

    load() {}

    getCollisionBoxes() { return this.collisionBoxes; }
    getTriggerZones()   { return this.triggerZones; }
    getPlayerSpawn()    { return this.playerSpawn; }
    getPlayerRotationY(){ return this.playerSpawnRotationY; }
    getMonsterSpawn()   { return this.monsterSpawn; }
}
