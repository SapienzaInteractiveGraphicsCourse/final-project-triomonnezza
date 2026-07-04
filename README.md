# 🧟‍♂️ Horror Labyrinth – Interactive Graphics Final Project

## 🔗 GitHub Pages Live Demo
**👉 [https://sapienzainteractivegraphicscourse.github.io/final-project-triomonnezza/](https://sapienzainteractivegraphicscourse.github.io/final-project-triomonnezza/)**

## 👥 Team: Trio Monnezza
| Studente | Matricola |
|---|---|
| Davide Timperi | 1950722 |
| Alexandru Vivian Pita | 1948533 |
| Federico Mendiola | 1986026 |

## 📖 Specifiche del Progetto e Motivazione
Questo progetto è un gioco horror interattivo in 3D sviluppato in WebGL per l'esame finale del corso di **Interactive Graphics** presso l'Università La Sapienza di Roma. 
La motivazione alla base del progetto è creare un ambiente immersivo e spaventoso in cui il giocatore deve esplorare un labirinto, risolvere enigmi o interazioni e cercare di sopravvivere scappando da un mostro gestito da un'Intelligenza Artificiale che lo insegue.

Il progetto sfrutta `three.js` per il rendering di modelli complessi, strutture gerarchiche, materiali e un sistema di illuminazione dinamico, rispettando a pieno i requisiti tecnici richiesti dal corso (modelli gerarchici, asset complessi, luci, texture di vario tipo e interazione con l'utente).

## 📂 Panoramica della Repository
La repository è strutturata nei seguenti file e cartelle principali:

- **`index.html`**: Il punto di ingresso principale dell'applicazione web.
- **`main.js`**: Lo script centrale per il setup e l'inizializzazione del gioco.
- **`assets_list.js`**: Un indice che elenca tutti i modelli 3D in formato `.glb` disponibili (blocchi geometrici e oggetti di scena).
- **`download_libs.py`**: Uno script Python utile per scaricare eventuali librerie esterne necessarie.
- **`assets/`**: Contiene tutti gli asset visivi e audio del gioco.
  - **`models/`**: I file `.glb` per l'architettura (`geomAssets`) e per l'arredamento (`propAssets`).
  - **`sounds/`**: File audio per l'atmosfera e gli effetti sonori.
  - **`ui/`**: Grafiche e icone per l'interfaccia utente.
- **`src/`**: Il codice sorgente con la logica del gioco.
  - **`animations/`**: Gestione delle animazioni e dei tween (`MonsterAnimator.js`, `TweenManager.js`).
  - **`core/`**: Logica di base del gameplay, tra cui `MonsterAI.js` per l'IA del mostro e `PlayerController.js` per il giocatore.
  - **`entities/`**: Entità del gioco (es. `Monster.js`).
  - **`ui/`**: Gestione dell'interfaccia e dei menu (`HUD.js`, `MenuManager.js`).
  - **`world/`**: Script per la costruzione e l'illuminazione delle mappe (`InteriorAssetManager.js`, `CollisionBuilder.js`, `LightingSetup.js`, `TextureLoader.js`), più la cartella `maps/` con le configurazioni dei vari livelli di difficoltà (`MapBase.js`, `MapEasy.js`, `MapMedium.js`, `MapHard.js`).

## 🛋️ Come sono realizzati gli Asset
Il progetto utilizza modelli 3D in formato **`.glb`** (GL Transmission Format), un formato binario che racchiude geometrie, materiali e texture in un unico file ottimizzato per il web. Gli asset si dividono in due categorie:
- **Asset Geometrici Strutturali (`geomAssets`)**: Sono moduli architettonici (muri, pavimenti, soffitti, pilastri, scale) costruiti basandosi su una griglia standard. Affiancando questi blocchi è possibile comporre dinamicamente la planimetria del labirinto, garantendo coerenza nelle dimensioni.
- **Asset di Scena / Arredamento (`propAssets`)**: Sono singoli elementi d'arredo (letti, sedie, lampade, libri, scatole, ecc.). Sono stati modellati e texturizzati per mantenere proporzioni realistiche rispetto ai muri e all'ambiente. In questo modo possono essere posizionati senza subire distorsioni di scala.

---

## 🤖 Prompt per Claude / Codex (Assistente Arredamento Mappe)

Se sei un LLM (come Claude o Codex) incaricato di arredare le mappe del gioco, segui attentamente questo prompt:

> **Ruolo:** Sei un esperto di level design 3D per un gioco horror in WebGL. **Le mappe strutturali (muri, pavimenti, corridoi e stanze) sono già state costruite e definite.** Il tuo unico compito è **arredare le stanze già esistenti**, inserendo gli oggetti di scena disponibili per creare ambienti realistici e a tema (es. camere da letto, bagni, salotti, ripostigli).
> 
> **Modelli da Utilizzare:** Devi usare ESCLUSIVAMENTE i modelli 3D definiti nell'array `propAssets` (presente in `assets_list.js`). Alcuni esempi sono `bed.glb`, `bookshelf.glb`, `cabinet.glb`, `chair.glb`, `table.glb`, `plant.glb`, `ceilingLight.glb`, ecc.
> 
> **Regole di Proporzione e Posizionamento:**
> 1. **Rispetta le Proporzioni Reali:** Gli asset sono modellati in scala reale. Quando definisci la traslazione `(x, y, z)`, posiziona gli oggetti in modo logico. Ad esempio, un `book.glb` o una `cup.glb` devono stare *sopra* un `table.glb` o un mobile, il che significa che la loro coordinata `y` (altezza) deve corrispondere a quella della superficie del tavolo. Un `ceilingLight.glb` deve avere una coordinata `y` vicina al soffitto.
> 2. **Evita le Collisioni e Rispetta il Passaggio:** Non sovrapporre due oggetti fisici nello stesso spazio e lascia sempre lo spazio sufficiente per far camminare il giocatore nella stanza.
> 3. **Coerenza Tematica:** Raggruppa gli oggetti in base al tipo di stanza. Un bagno richiede `toilet.glb`, `bathtub.glb`, `bathroomSink.glb` e `mirror.glb`. Un ripostiglio potrebbe essere disordinato e pieno di `box.glb`, `pallet.glb` e `trashBag.glb`.
> 4. **Orientamento (`rotation`):** Ruota gli oggetti in modo logico. Un `bed.glb` dovrebbe avere la testiera contro un muro. Una `tv.glb` dovrebbe essere rivolta verso un `couchBig.glb`.
> 
> Fornisci in output il codice di configurazione o le coordinate JSON per iniettare questi oggetti nelle stanze specifiche, mantenendo un'atmosfera horror abbandonata e inquietante.
