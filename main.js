import * as THREE from 'three';
import { PlayerController } from './src/core/PlayerController.js';

// ==========================================
// 1. SETUP DELLA SCENA MINIMALE (WEBGL)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // Grigio scuro horror

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Luce ambientale minima per vedere i tuoi blocchi di test
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// ==========================================
// 2. SIMULAZIONE DEL LAVORO DI B (MURI E TRIGGER)
// ==========================================
const collisionBoxes = []; // Array di THREE.Box3 che riempirai tu ora
const triggerZones = [];

// PAVIMENTO (Giusto per avere un riferimento visivo)
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0x222222 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// CORPO DI COLLISIONE 1: Un muro invisibile/visibile (CUBO ROSSO)
const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 1), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
wallMesh.position.set(0, 2, -10); // Posizionato a 10 metri davanti allo spawn
scene.add(wallMesh);
// Crei la bounding box matematica e la metti nell'array delle collisioni
collisionBoxes.push(new THREE.Box3().setFromObject(wallMesh));

// OGGETTO INTERATTIVO 1: Una Chiave di test (CUBO GIALLO)
const chiaveMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
chiaveMesh.position.set(-3, 1, -5); 
chiaveMesh.name = "Chiave_Serratura_A";
chiaveMesh.userData = { isInteractive: true, tipo: "chiave", idChiave: "chiave_atrio" };
scene.add(chiaveMesh);
// Nota: Le chiavi le aggiungiamo alla scena così il tuo Raycaster le interseca
scene.add(chiaveMesh);

// OGGETTO INTERATTIVO 2: Una Porta bloccata (CUBO BLU)
const portaMesh = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
portaMesh.position.set(3, 2, -5);
portaMesh.name = "Portone_Atrio";
portaMesh.userData = { isInteractive: true, tipo: "porta", richiedeChiave: true, idChiave: "chiave_atrio" };
scene.add(portaMesh);

// SIMULAZIONE DI UN TRIGGER AD AREA: Zona di Spavento invisibile (CUBO VERDE SEMI-TRASPARENTE)
const triggerMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2 }));
triggerMesh.position.set(0, 2, -15); // Dietro il primo muro rosso
scene.add(triggerMesh);
// Crei la struttura dati del trigger da passare al tuo controller
triggerZones.push({
    box: new THREE.Box3().setFromObject(triggerMesh),
    nome: "JUMPSCARE_CORRIDOIO_1",
    giaAttivato: false
});

// ==========================================
// 3. SIMULAZIONE DEL MOSTRO (CUBO VIOLA)
// ==========================================
const mostroMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1.5), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
mostroMesh.position.set(12, 1.5, -20); // Abbastanza lontano per non aggrare subito
scene.add(mostroMesh);

// ==========================================
// 4. INIZIALIZZAZIONE DEL TUO CONTROLLER ROBOTICO
// ==========================================
camera.position.set(0, 1.8, 0); // Altezza occhi (1.8 metri)
scene.add(camera);
const player = new PlayerController(camera, renderer.domElement, collisionBoxes, triggerZones);

// ==========================================
// 5. ASCOLTO DEGLI EVENTI (Test disaccoppiamento C)
// ==========================================
// Qui verifichi che i tuoi segnali (dispatchEvent) vengano lanciati correttamente!
document.addEventListener('uiTargetChanged', (e) => {
    if (e.detail.name) console.log(`[UI INTERFACCIA]: Mirino su -> ${e.detail.name}`);
});

document.addEventListener('itemRaccolto', (e) => {
    console.log(`[LOG GIOCO]: Hai raccolto l'oggetto: ${e.detail.object.name}. Lo rimuovo dalla scena.`);
    scene.remove(e.detail.object); // Simula l'azione visiva
});

document.addEventListener('portaAperta', (e) => {
    console.log(`[TWEEN SUCCESS]: La porta ${e.detail.object.name} è aperta! (Qui interverrà lo studente C)`);
});

document.addEventListener('horrorTrigger', (e) => {
    console.warn(`[TRIGGER ATTIVATO]: Calpestata zona: ${e.detail.eventName}! Far spawnare rumori/mostri.`);
});

document.addEventListener('playerMorto', () => {
    alert("GAME OVER: Il cubo viola ti ha catturato!");
    window.location.reload();
});

// ==========================================
// 6. LOOP DI ANIMAZIONE E RENDERING
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    // Aggiorna il tuo controller passando il mostro di test
    player.update(deltaTime, mostroMesh);
    
    renderer.render(scene, camera);
}
animate();

// Gestione ridimensionamento finestra browser
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Aggiungi questo in fondo a main.js per intercettare il click sulla schermata di istruzioni
document.getElementById('instructions').addEventListener('click', () => {
    player.controls.lock();
});