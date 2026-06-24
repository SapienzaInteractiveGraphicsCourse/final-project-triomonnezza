import { MapBase } from './MapBase.js';

export class MapHard extends MapBase {
    load() {
        // MapHard: Stile Labirinto, buio e intricato
        
        // Spawn (Luci molto deboli)
        this.buildRoom(0, 0, 10, 10, ['N', 'S', 'E', 'W'], 0x555555); 

        // Ramo Nord
        this.buildHallway(0, -12.5, 4, 15, false);
        this.buildRoom(0, -25, 10, 10, ['S', 'W', 'E'], 0x222222);

        // Nord-Ovest
        this.buildHallway(-12.5, -25, 15, 4, true);
        this.buildRoom(-25, -25, 10, 10, ['E', 'S'], 0x331111);

        // Ramo Ovest (dallo spawn)
        this.buildHallway(-12.5, 0, 15, 4, true);
        this.buildRoom(-25, 0, 10, 10, ['E', 'N', 'S'], 0x111133);

        // Connessione Nord-Ovest a Ovest (chiude un anello)
        this.buildHallway(-25, -12.5, 4, 15, false);

        // Ovest-Sud
        this.buildHallway(-25, 12.5, 4, 15, false);
        this.buildRoom(-25, 25, 10, 10, ['N', 'E'], 0x222200);

        // Ramo Sud (dallo spawn)
        this.buildHallway(0, 12.5, 4, 15, false);
        this.buildRoom(0, 25, 10, 10, ['N', 'W', 'E'], 0x331133);

        // Connessione Ovest-Sud a Sud
        this.buildHallway(-12.5, 25, 15, 4, true);

        // Sud-Est
        this.buildHallway(12.5, 25, 15, 4, true);
        this.buildRoom(25, 25, 10, 10, ['W', 'N'], 0x002200);

        // Ramo Est (dallo spawn)
        this.buildHallway(12.5, 0, 15, 4, true);
        this.buildRoom(25, 0, 10, 10, ['W', 'S', 'N'], 0x113311);

        // Connessione Sud-Est a Est
        this.buildHallway(25, 12.5, 4, 15, false);

        // Nord-Est
        this.buildHallway(12.5, -25, 15, 4, true);
        this.buildRoom(25, -25, 10, 10, ['W', 'E'], 0x440000);

        // Corridoio extra verso una stanza lontana
        this.buildHallway(37.5, -25, 15, 4, true);
        this.buildRoom(50, -25, 10, 10, ['W'], 0x050505); // Stanza buia

        // Triggers
        this.addTrigger(-25, 2, -12.5, "JUMPSCARE_HARD_RING_OVEST");
        this.addTrigger(12.5, 2, 25, "JUMPSCARE_HARD_SUD_EST");
        this.addTrigger(37.5, 2, -25, "JUMPSCARE_HARD_LUNGO_CORRIDOIO");
    }
}
