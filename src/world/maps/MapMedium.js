import { MapBase } from './MapBase.js';

export class MapMedium extends MapBase {
    load() {
        // MapMedium: Mappa ad anello con vicoli ciechi
        
        // Spawn (Incrocio a L)
        this.buildRoom(0, 0, 10, 10, ['N', 'E'], 0xffcccc); 

        // Nord Corridor
        this.buildHallway(0, -12.5, 4, 15, false);
        this.buildRoom(0, -25, 10, 10, ['S', 'E', 'W'], 0xccccff); // Incrocio a T

        // Ovest da Nord (vicolo cieco, stanza rossa)
        this.buildHallway(-12.5, -25, 15, 4, true);
        this.buildRoom(-25, -25, 10, 10, ['E'], 0xff5555); 

        // Est da Nord (continua verso Sud)
        this.buildHallway(12.5, -25, 15, 4, true);
        this.buildRoom(25, -25, 10, 10, ['W', 'S'], 0xccffcc); 

        // Sud da Est
        this.buildHallway(25, -12.5, 4, 15, false);
        this.buildRoom(25, 0, 10, 10, ['N', 'S', 'W'], 0xcccccc); // Incrocio

        // Ovest da Incrocio Est -> Torna allo spawn (chiude l'anello)
        this.buildHallway(12.5, 0, 15, 4, true); 

        // Sud da Incrocio Est -> Stanza finale o area extra
        this.buildHallway(25, 12.5, 4, 15, false);
        this.buildRoom(25, 25, 10, 10, ['N'], 0xffffaa); 
        
        // Triggers
        this.addTrigger(-12.5, 2, -25, "JUMPSCARE_MEDIUM_VICOLO_CIECO");
        this.addTrigger(25, 2, 12.5, "JUMPSCARE_MEDIUM_STANZA_FINALE");
    }
}
