import * as THREE from 'three';
import { InteriorAssetManager } from '../InteriorAssetManager.js';

export class MapBase {

    constructor(scene) {
        this.scene = scene;
        this.collisionBoxes = [];
        this.triggerZones = [];
        this.playerSpawn = new THREE.Vector3(0, 1.8, 0); // Eye level height
        this.playerSpawnRotationY = 0;
        this.monsterSpawn = new THREE.Vector3(0, 2.454, 0); // Root Y so feet rest on floor with scale 1.636
        this.flickeringLights = [];
        // Tracks world positions of already-spawned doors to prevent
        // duplicate doors when two adjacent rooms both declare the same doorway.
        this._spawnedDoorKeys = new Set();
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

    buildRoomByTiles(tx, tz, cols, rows, doorways = [], theme = {}) {
        // Tile size is 4m. Center of tile (0,0) is at x=0, z=0.
        // Left edge of tile 0 is x=-2. Right edge is x=2.
        // A room of size (cols, rows) starting at tile (tx, tz) has:
        // Left edge: tx * 4 - 2
        // Right edge: (tx + cols) * 4 - 2
        // Center X: tx * 4 - 2 + (cols * 4) / 2 = tx * 4 + cols * 2 - 2
        const cx = tx * 4 + cols * 2 - 2;
        const cz = tz * 4 + rows * 2 - 2;
        this.buildBlockRoom(cx, cz, cols, rows, doorways, theme);
    }

    /**
     * Extracts and clones the material (with texture) from a preloaded GLB tile.
     * Sets UV tiling so the texture repeats at the correct physical scale.
     * @param {string}  glbName  Filename in InteriorAssetManager (e.g. 'floorWood.glb')
     * @param {number}  repeatU  Horizontal texture repeats
     * @param {number}  repeatV  Vertical texture repeats
     * @returns {THREE.Material|null}
     */
    _getMaterialFromTheme(glbName, repeatU = 1, repeatV = 1) {
        if (!glbName) return null;
        const model = InteriorAssetManager.get(glbName);
        if (!model) return null;
        let mat = null;
        model.traverse(child => {
            if (child.isMesh && child.material && !mat) {
                mat = child.material.clone();
            }
        });
        if (!mat) return null;
        if (mat.map) {
            mat.map = mat.map.clone();
            mat.map.wrapS = THREE.RepeatWrapping;
            mat.map.wrapT = THREE.RepeatWrapping;
            mat.map.repeat.set(repeatU, repeatV);
            mat.map.needsUpdate = true;
        }
        return mat;
    }

    buildBlockRoom(cx, cz, cols, rows, doorways = [], theme = {}) {
        const tileSize = 4;
        const w = cols * tileSize;
        const d = rows * tileSize;
        const wallH = 5.5;  // Higher walls
        const wallT = 0.5;
        const doorWidth = 2.4;

        // ── Floor ──────────────────────────────────────────────────────
        // Repeat the texture once per 4 m tile across the full floor area.
        const floorMat = this._getMaterialFromTheme(theme.floorTile, cols, rows)
                      || new THREE.MeshStandardMaterial({ color: 0x555555 });
        const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), floorMat);
        floor.position.set(cx, -0.25, cz);
        floor.receiveShadow = true;
        this.scene.add(floor);

        // ── Ceiling ────────────────────────────────────────────────────
        const ceilMat = this._getMaterialFromTheme(theme.ceilingTile, cols, rows)
                     || new THREE.MeshStandardMaterial({ color: 0x888888 });
        const ceil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), ceilMat);
        ceil.position.set(cx, wallH + 0.25, cz);
        this.scene.add(ceil);

        // ── Wall base material (shared; per-segment UV is set in the builder) ──
        // Provide the raw un-repeated texture; _buildVisibleWallWithGaps will
        // clone + set repeat per segment based on its dimensions.
        const wallBaseMat = this._getMaterialFromTheme(theme.wallTile, 1, wallH / tileSize)
                         || new THREE.MeshStandardMaterial({ color: 0xa0a0a0 });

        const startX = cx - w/2 + tileSize/2;
        const startZ = cz - d/2 + tileSize/2;

        this._buildVisibleWallWithGaps(cx, cz - d/2, true,  doorways, 'N', cols, startX, tileSize, wallH, wallT, doorWidth, wallBaseMat);
        this._buildVisibleWallWithGaps(cx, cz + d/2, true,  doorways, 'S', cols, startX, tileSize, wallH, wallT, doorWidth, wallBaseMat);
        this._buildVisibleWallWithGaps(cx - w/2, cz, false, doorways, 'W', rows, startZ, tileSize, wallH, wallT, doorWidth, wallBaseMat);
        this._buildVisibleWallWithGaps(cx + w/2, cz, false, doorways, 'E', rows, startZ, tileSize, wallH, wallT, doorWidth, wallBaseMat);

        const light = new THREE.PointLight(0xffeedd, 1.0, 15);
        light.position.set(cx, wallH - 0.5, cz);
        this.scene.add(light);
    }

    _buildVisibleWallWithGaps(wallX, wallZ, isHorizontal, doorways, side, count, startCoord, tileSize, wallH, wallT, doorWidth, baseMat = null) {
        const defaultMat = baseMat || new THREE.MeshStandardMaterial({ color: 0xa0a0a0 });

        // Creates a mesh with a per-segment clone of the material so each
        // segment can have its own UV repeat matching its physical dimensions.
        const addVisibleBox = (x, y, z, w, h, d) => {
            let mat = defaultMat;
            if (defaultMat.map) {
                mat = defaultMat.clone();
                mat.map = defaultMat.map.clone();
                // Tile once per 1 m horizontally and once per 1.5 m vertically.
                // This matches typical wallpaper density (motif every ~1 m)
                // and avoids the stretched look caused by showing 1 tile per 4 m.
                const wallLength = Math.max(w, d);
                mat.map.repeat.set(wallLength, h / 1.5);
                mat.map.needsUpdate = true;
            }
            const geo  = new THREE.BoxGeometry(w, h, d);
            const mesh = new THREE.Mesh(geo, mat);
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

            // ── Deduplication: skip if a door was already placed at this position ──
            const key = `${Math.round(x * 10)},${Math.round(z * 10)}`;
            if (this._spawnedDoorKeys.has(key)) return;
            this._spawnedDoorKeys.add(key);
            // 1. Reset mesh to measure raw size
            mesh.position.set(0, 0, 0);
            mesh.rotation.set(0, 0, 0);
            mesh.scale.set(1, 1, 1);
            mesh.updateMatrixWorld(true);
            
            const rawBox = new THREE.Box3().setFromObject(mesh);
            const rawSize = new THREE.Vector3();
            rawBox.getSize(rawSize);
            
            // 2. Calculate scaling to fit our 2.4 x 4.5 doorway
            const targetWidth = 2.4;
            const targetHeight = 4.5;
            
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
                isAnimating: false,  // locked while the swing animation runs
                startRotationY: rotationY
            };
            
            hinge.userData = doorData;
            // The raycaster hits the mesh, so give it the same userData reference
            mesh.traverse((child) => {
                if (child.isMesh) {
                    child.userData = doorData;
                    child.parentHinge = hinge; // Crucial reference for animating the parent group
                }
            });
            
            hinge.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(hinge);
            hinge.userData.collisionBox = box;
            // Save closed-state extents so we can restore them when the door swings shut
            hinge.userData.closedBoxMin = box.min.clone();
            hinge.userData.closedBoxMax = box.max.clone();
            
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
                const lintelH = 1.0; 
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

    /**
     * Overlays GLB visual tile faces over an existing buildRoomByTiles room.
     * No collision is added — the collision comes from buildRoomByTiles / buildBlockRoom.
     *
     * Wall tiles are inset 0.26m from the wall centre toward the room interior
     * (the walls are 0.5m thick so the inner face is at 0.25m — we go 0.01m past
     * it to eliminate z-fighting with the underlying BoxGeometry).
     *
     * @param {number}   tx / tz      Tile-grid origin of the room (same as buildRoomByTiles)
     * @param {number}   cols / rows  Size in 4m tiles
     * @param {string[]} doorways     Same doorway list passed to buildRoomByTiles
     * @param {Object}   options      { floorTile, ceilingTile, wallTile, wallDoorTile, ceilingHeight }
     */
    _coverRoomWithTiles(tx, tz, cols, rows, doorways = [], options = {}) {
        const {
            floorTile    = null,
            ceilingTile  = null,
            wallTile     = null,
            wallDoorTile = null,
            ceilingHeight = 5.5,
        } = options;

        const tileSize = 4;
        const cx    = tx * 4 + cols * 2 - 2;
        const cz    = tz * 4 + rows * 2 - 2;
        const halfW = (cols * tileSize) / 2;
        const halfD = (rows * tileSize) / 2;
        const startX = cx - halfW + tileSize / 2;
        const startZ = cz - halfD + tileSize / 2;

        // Distance the visual tile sits inside the room from the wall centre.
        // Wall thickness = 0.5m  →  inner face at 0.25m  →  inset by 0.26m.
        const INSET = 0.26;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * tileSize;
                const z = startZ + r * tileSize;

                // ── Floor ─────────────────────────────────────────────────
                if (floorTile) {
                    this.spawnTile(floorTile, new THREE.Vector3(x, 0.01, z));
                }

                // ── Ceiling ───────────────────────────────────────────────
                if (ceilingTile) {
                    this.spawnTile(ceilingTile, new THREE.Vector3(x, ceilingHeight - 0.01, z));
                }

                const isN = r === 0;
                const isS = r === rows - 1;
                const isW = c === 0;
                const isE = c === cols - 1;

                // ── North wall ─────────────────────────────────────────────
                if (isN && wallTile) {
                    const t = doorways.includes(`N_${c}`) ? (wallDoorTile || wallTile) : wallTile;
                    this.spawnTile(t, new THREE.Vector3(x, 0, cz - halfD + INSET), 0);
                }
                // ── South wall ─────────────────────────────────────────────
                if (isS && wallTile) {
                    const t = doorways.includes(`S_${c}`) ? (wallDoorTile || wallTile) : wallTile;
                    this.spawnTile(t, new THREE.Vector3(x, 0, cz + halfD - INSET), Math.PI);
                }
                // ── West wall ──────────────────────────────────────────────
                if (isW && wallTile) {
                    const t = doorways.includes(`W_${r}`) ? (wallDoorTile || wallTile) : wallTile;
                    this.spawnTile(t, new THREE.Vector3(cx - halfW + INSET, 0, z), -Math.PI / 2);
                }
                // ── East wall ──────────────────────────────────────────────
                if (isE && wallTile) {
                    const t = doorways.includes(`E_${r}`) ? (wallDoorTile || wallTile) : wallTile;
                    this.spawnTile(t, new THREE.Vector3(cx + halfW - INSET, 0, z), Math.PI / 2);
                }
            }
        }
    }

    /**
     * Spawns a decorative prop with no collision.
     * Identical to spawnTile but semantically named for readability in map files.
     */
    spawnProp(filename, position, rotationY = 0) {
        return this.spawnTile(filename, position, rotationY);
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
