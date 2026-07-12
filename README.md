# 🧟‍♂️ Echoes in the Dark (formerly Horror Labyrinth)

**Sapienza University of Rome - Interactive Graphics Course Final Project**

## 🔗 Live Demo
**👉 [Play the Game Here](https://sapienzainteractivegraphicscourse.github.io/final-project-triomonnezza/)**

## 👥 Team: Trio Monnezza
| Student | Matricola |
|---|---|
| Davide Timperi | 1950722 |
| Alexandru Vivian Pita | 1948533 |
| Federico Mendiola | 1986026 |

---

## 📖 1. Project Overview
**Echoes in the Dark** is a fully 3D, first-person psychological horror survival game developed entirely in **WebGL** and **Three.js**. Created as the final project for the Interactive Graphics course at Sapienza University of Rome, it pushes the boundaries of browser-based gaming without relying on heavy game engines like Unity or Unreal Engine.

The player is trapped in a procedurally styled, claustrophobic labyrinth. The ultimate goal is to locate a **Hidden Key** and escape through the **Goal Door**. However, the maze is actively patrolled by a relentless, procedurally-animated monster. Survival depends on resource management, stealth, and spatial awareness.

---

## 🕹️ 2. Core Gameplay Mechanics

### 🏃 The Player & Stamina System
- **First-Person Controls:** Standard WASD movement with mouse-look controls.
- **Stamina Management:** Sprinting (holding `Spacebar`) rapidly depletes the stamina bar. If stamina hits zero, the player is forced into a slow walk state until the bar partially recharges.
- **Immersive Head-Bobbing:** Procedural camera motions using trigonometric functions (`Math.sin()`, `Math.cos()`) simulate realistic walking and running gaits.

### 🔦 Dynamic Flashlight
- **Battery Drain:** The flashlight is the player's only light source. Its battery drains over time.
- **Visual Degradation:** As battery decreases, the light intensity dims, the cone angle narrows, and it begins to flicker procedurally (randomised on/off thresholds whose frequency and depth increase as the battery gets lower), increasing tension.

### 🚪 Interactive Environment
- **Doors:** Players can approach doors and press `E` to interact. Doors act as physical barriers and break the monster's line of sight, allowing players to hide in rooms.
- **The Objective:** The player must explore rooms to find the **Key**. Once acquired, the player must navigate to the **Goal Door** (distinguished by a green light) to escape.

### 👹 The Monster
- An invincible entity that stalks the player. You cannot fight it; you can only run and hide.
- If the monster catches the player, a procedural jump-scare animation plays, and the game is over.

---

## 🛠️ 3. Technical Architecture & Implementation

The project strictly adheres to the course constraints, featuring custom-built systems for physics, AI, and animations rather than importing pre-made engine solutions.

### 🏛️ Rendering and Environment (`Three.js`)
- Entirely built using vanilla **JavaScript** and **Three.js**.
- **Asset Management:** `.glb` and `.gltf` models for architecture and props are dynamically loaded and cached (`InteriorAssetManager.js`). The flashlight prop is loaded via `FBXLoader`, which relies on `fflate` internally to decompress the format — not a compression step written by the team.
- **Dynamic Level Configuration:** Levels (Easy, Medium, Hard) are defined by grid-based arrays (`MapEasy.js`, etc.) parsed by the engine to construct walls, floors, and interactive objects on the fly.

### 🧠 Advanced Artificial Intelligence (`src/core/MonsterAI.js`)
The monster operates on a custom, highly responsive State Machine:
- **Idle / Search State:** While the player is outside the aggro radius, the monster waits and periodically teleports itself to a room or doorway near the player if too much time passes without contact, keeping the threat from being purely avoidable by distance.
- **Chase State:** Continuously casts rays towards the player. If the player enters the Line of Sight (and is not blocked by walls/doors), the monster speeds up and pursues aggressively.
- **Dynamic Teleportation:** To maintain constant psychological pressure, the AI periodically teleports to rooms adjacent to the player if they have been separated for too long. It also features failsafe emergency teleports if the monster becomes stuck in world geometry.

### 🧬 Procedural Hierarchical Animations (`src/animations/MonsterAnimator.js`)
Instead of importing pre-rigged and pre-animated meshes, the monster's animations are **100% procedurally coded**:
- **Hierarchical Structure:** The monster is assembled using Three.js `Object3D` parent-child relationships (Torso -> Arms, Legs, Head).
- **Trigonometric Gaits:** Walking and running cycles are calculated using alternating sine and cosine waves applied to the limbs' rotation axes.
- **Attack Animations:** Lunges and jump-scares utilize custom Tweening (`TweenManager.js`) to snap limbs into aggressive postures rapidly.

### 🧱 Custom Physics & Collision (`src/world/maps/MapBase.js`)
To maintain high performance in the browser, the game avoids heavy physics libraries (like Cannon.js):
- **AABB & Raycasting:** Implements Axis-Aligned Bounding Boxes (AABB) and Raycasters to prevent the player and the monster from clipping through walls, doors, and props.
- **Sliding Mechanics:** When colliding with a wall at an angle, the collision resolution allows the player to slide smoothly along the surface rather than stopping abruptly.

### 💡 Dynamic Lighting & Texturing (`src/world/TextureLoader.js`)
- **Spotlights & Point Lights:** Utilizes Three.js lighting models. Environmental lights flicker dynamically.
- **Texture Mapping:** Diffuse, Normal, and Specular maps (via `THREE.MeshPhongMaterial`) are applied to world geometry to give depth and realism to the otherwise flat maze walls; procedural objects such as the key and battery pickups instead use PBR `MeshStandardMaterial`.

### 🎧 Spatial Web Audio API (`src/core/AudioSystem.js`)
- **3D Positional Audio:** Monster footsteps and roars are emitted from the monster's 3D coordinates, allowing the player to locate the threat entirely by sound.
- **Dynamic Music:** The background track smoothly cross-fades between an "ambience" mix and a more intense "pursuit" mix depending on whether the player is within the monster's aggro range, inducing panic.

---

## 🤖 4. AI-Assisted Room Decoration

To populate the rooms with realistic furniture layouts, the team utilized Large Language Models (LLMs like Claude/Codex) with a specific prompt structure. 

The structural maps were provided to the AI, which acted as a level designer to inject 3D models from the team's own prop library (e.g., `bed.glb`, `bookshelf.glb`, `cabinet.glb`) into the rooms. The AI respected real-world proportions, prevented overlapping collisions, and ensured thematic consistency (e.g., grouping bathroom items together). This data is parsed by `InteriorAssetManager.js`.

---

## 📂 5. Repository Structure

```text
📦 final-project-triomonnezza
├── 📂 assets/              # 3D Models (.glb), Textures, and Audio files (.wav)
├── 📂 lib/                 # Downloaded external libraries (Three.js, etc.)
├── 📂 src/                 # Main Source Code
│   ├── 📂 animations/      # Procedural animation logic (MonsterAnimator, TweenManager)
│   ├── 📂 core/            # Core systems (Player, AI, Audio, Flashlight, Doors)
│   ├── 📂 entities/        # Game entity classes (Monster.js)
│   ├── 📂 ui/              # User interface, Menus, HUD, Blood splatter effects
│   └── 📂 world/           # Map generation, Collision, Textures, Asset instantiation
│       └── 📂 maps/        # Grid-based level layouts (Easy, Medium, Hard)
├── 📄 index.html           # Main entry point for the web application
├── 📄 index.css            # UI styling and HUD elements
├── 📄 main.js              # Game initialization and main render loop
├── 📄 download_libs.py     # Script to fetch required libraries
└── 📄 README.md            # Project documentation (You are here)
```

---

## 🚀 6. How to Run Locally

Since the game loads external assets (3D models, textures, sounds), it must be run via a local web server to bypass strict browser CORS policies.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SapienzaInteractiveGraphicsCourse/final-project-triomonnezza.git
   cd final-project-triomonnezza
   ```
2. **Download libraries (if necessary):**
   ```bash
   python download_libs.py
   ```
3. **Start a local web server:**
   - *Using Python 3:*
     ```bash
     python -m http.server 8000
     ```
   - *Using Node.js (http-server):*
     ```bash
     npx http-server -p 8000
     ```
   - *Using VS Code:* Install the "Live Server" extension and click "Go Live" on `index.html`.
4. **Play:** Open your browser and navigate to `http://localhost:8000`.

---

## 🎓 7. Academic Requirements Compliance

This project successfully fulfills the core requirements of the Interactive Graphics exam:
- ✅ **WebGL & Three.js Framework:** Built entirely within the required technological stack.
- ✅ **Hierarchical Modeling:** The monster is a complex, multi-part hierarchical mesh built in code, not a pre-animated import.
- ✅ **Lighting and Textures:** Extensively uses Spotlights, Point lights, and multi-layered textures (diffuse/normal/specular via Phong materials, plus PBR materials for procedural objects).
- ✅ **User Interaction:** Features complex movement, stamina, flashlight management, and interactive doors.
- ✅ **Custom Animation:** Movement gaits and jump-scares are procedurally generated using mathematical functions and tweens.
