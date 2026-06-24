import { MapBase } from './MapBase.js?v=2';

export class MapEasy extends MapBase {
    load() {
        this.monsterSpawn.set(0, 1.5, -20); // Spawn nel corridoio nord
        
        // Stanza Centrale (Spawn) - Collegate in tutte le direzioni
        this.buildRoom(0, 0, 10, 10, ['N', 'S', 'E', 'W'], 0xffffff);
        
        // Direzione NORD
        this.buildHallway(0, -12.5, 4, 15, false);
        this.buildRoom(0, -25, 10, 10, ['S', 'E', 'W'], 0xffaaaa);

        // Direzione SUD
        this.buildHallway(0, 12.5, 4, 15, false);
        this.buildRoom(0, 25, 10, 10, ['N', 'E', 'W', 'GOAL_S'], 0xaaaaff); // GOAL QUI

        // Direzione EST
        this.buildHallway(12.5, 0, 15, 4, true);
        this.buildRoom(25, 0, 10, 10, ['W', 'N', 'S'], 0xaaffaa);

        // Direzione OVEST
        this.buildHallway(-12.5, 0, 15, 4, true);
        this.buildRoom(-25, 0, 10, 10, ['E', 'N', 'S'], 0xffffaa);

        // Connessioni ad anello esterne (per fuggire)
        // NORD -> EST
        this.buildHallway(12.5, -25, 15, 4, true);
        this.buildHallway(25, -12.5, 4, 15, false);
        this.buildRoom(25, -25, 10, 10, ['W','S'], null); // Chiuso ai lati esterni

        // EST -> SUD
        this.buildHallway(25, 12.5, 4, 15, false);
        this.buildHallway(12.5, 25, 15, 4, true);
        this.buildRoom(25, 25, 10, 10, ['N','W'], null);

        // SUD -> OVEST
        this.buildHallway(-12.5, 25, 15, 4, true);
        this.buildHallway(-25, 12.5, 4, 15, false);
        this.buildRoom(-25, 25, 10, 10, ['N','E'], null);

        // OVEST -> NORD
        this.buildHallway(-25, -12.5, 4, 15, false);
        this.buildHallway(-12.5, -25, 15, 4, true);
        this.buildRoom(-25, -25, 10, 10, ['S','E'], null);

        this.addTrigger(0, 2, -12.5, "JUMPSCARE_CORRIDOIO_NORD");
    }
}
