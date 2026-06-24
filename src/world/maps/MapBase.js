import * as THREE from 'three';

export class MapBase {
    constructor(scene) {
        this.scene = scene;
        this.collisionBoxes = [];
        this.triggerZones = [];
    }

    buildBox(x, y, z, w, h, d, color) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        this.collisionBoxes.push(new THREE.Box3().setFromObject(mesh));
        return mesh;
    }

    buildWallWithGap(cx, cy, cz, length, thickness, isHorizontal, gapSize=4) {
        const pieceLen = (length - gapSize) / 2;
        const offset = gapSize / 2 + pieceLen / 2;
        if (isHorizontal) {
            this.buildBox(cx - offset, cy, cz, pieceLen, 4, thickness, 0x555555);
            this.buildBox(cx + offset, cy, cz, pieceLen, 4, thickness, 0x555555);
        } else {
            this.buildBox(cx, cy, cz - offset, thickness, 4, pieceLen, 0x555555);
            this.buildBox(cx, cy, cz + offset, thickness, 4, pieceLen, 0x555555);
        }
    }

    buildRoom(cx, cz, w, d, openings=[], lightColor=0xffffff) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ color: 0x333333 }));
        floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); this.scene.add(floor);
        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
        ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, 4, cz); this.scene.add(ceil);

        const t = 0.5;
        const h = 4;
        
        if (!openings.includes('N')) this.buildBox(cx, h/2, cz - d/2, w, h, t, 0x666666);
        else this.buildWallWithGap(cx, h/2, cz - d/2, w, t, true);
        
        if (!openings.includes('S')) this.buildBox(cx, h/2, cz + d/2, w, h, t, 0x666666);
        else this.buildWallWithGap(cx, h/2, cz + d/2, w, t, true);
        
        if (!openings.includes('W')) this.buildBox(cx - w/2, h/2, cz, t, h, d, 0x666666);
        else this.buildWallWithGap(cx - w/2, h/2, cz, d, t, false);
        
        if (!openings.includes('E')) this.buildBox(cx + w/2, h/2, cz, t, h, d, 0x666666);
        else this.buildWallWithGap(cx + w/2, h/2, cz, d, t, false);

        if (lightColor !== null) {
            const light = new THREE.PointLight(lightColor, 0.8, 15);
            light.position.set(cx, 3, cz);
            this.scene.add(light);
        }
    }

    buildHallway(cx, cz, w, d, isHorizontal) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
        floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); this.scene.add(floor);
        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ color: 0x111111 }));
        ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, 4, cz); this.scene.add(ceil);

        const t = 0.5;
        const h = 4;
        if (isHorizontal) {
            this.buildBox(cx, h/2, cz - d/2, w, h, t, 0x444444);
            this.buildBox(cx, h/2, cz + d/2, w, h, t, 0x444444);
        } else {
            this.buildBox(cx - w/2, h/2, cz, t, h, d, 0x444444);
            this.buildBox(cx + w/2, h/2, cz, t, h, d, 0x444444);
        }
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
