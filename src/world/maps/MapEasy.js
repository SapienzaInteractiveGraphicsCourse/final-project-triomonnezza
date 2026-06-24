import { MapBase } from './MapBase.js';

export class MapEasy extends MapBase {
    load() {
        // Stanza Centrale (Spawn) - Collegate in tutte le direzioni
        this.buildRoom(0, 0, 10, 10, ['N', 'S', 'E', 'W'], 0xffffff);
        
        // Direzione NORD
        this.buildHallway(0, -12.5, 4, 15, false);
        this.buildRoom(0, -25, 10, 10, ['S'], 0xffaaaa);

        // Direzione SUD
        this.buildHallway(0, 12.5, 4, 15, false);
        this.buildRoom(0, 25, 10, 10, ['N'], 0xaaaaff);

        // Direzione EST
        this.buildHallway(12.5, 0, 15, 4, true);
        this.buildRoom(25, 0, 10, 10, ['W'], 0xaaffaa);

        // Direzione OVEST
        this.buildHallway(-12.5, 0, 15, 4, true);
        this.buildRoom(-25, 0, 10, 10, ['E'], 0xffffaa);

        this.addTrigger(0, 2, -12.5, "JUMPSCARE_CORRIDOIO_NORD");
    }
}
