import { MapBase } from './MapBase.js?v=2';

export class MapMedium extends MapBase {
    load() {
        this.monsterSpawn.set(0, 1.5, -12.5); // Spawn vicino all'inizio ma coperto
        
        // MapMedium: Più grande, loop disassati
        // Spawn
        this.buildRoom(0, 0, 10, 10, ['N', 'E'], 0xffcccc); 

        // Nord Corridor
        this.buildHallway(0, -12.5, 4, 15, false);
        this.buildRoom(0, -25, 10, 10, ['S', 'E', 'W'], 0xccccff); 

        // Ovest da Nord
        this.buildHallway(-12.5, -25, 15, 4, true);
        this.buildRoom(-25, -25, 10, 10, ['E', 'S'], 0xff5555);

        // Sud da Ovest(-25,-25)
        this.buildHallway(-25, -12.5, 4, 15, false);
        this.buildRoom(-25, 0, 10, 10, ['N', 'S', 'E'], 0xccffff); 

        // Sud da Ovest(-25,0)
        this.buildHallway(-25, 12.5, 4, 15, false);
        this.buildRoom(-25, 25, 10, 10, ['N', 'E'], 0xffdddd);

        // Est da Ovest(-25,25) -> Sud(0,25)
        this.buildHallway(-12.5, 25, 15, 4, true);
        this.buildRoom(0, 25, 10, 10, ['W', 'E', 'N'], 0xddffdd); 
        // Connetto (0,25) a (0,0)? No, facciamo un muro. In (0,0) abbiamo solo N, E.

        // Est da (0,25)
        this.buildHallway(12.5, 25, 15, 4, true);
        this.buildRoom(25, 25, 10, 10, ['W', 'N', 'GOAL_S'], 0xffffaa); // GOAL QUI (25, 25)

        // Est da Nord (0,-25)
        this.buildHallway(12.5, -25, 15, 4, true);
        this.buildRoom(25, -25, 10, 10, ['W', 'S'], 0xccffcc); 

        // Sud da (25,-25)
        this.buildHallway(25, -12.5, 4, 15, false);
        this.buildRoom(25, 0, 10, 10, ['N', 'S', 'W'], 0xcccccc); 

        // Ovest da (25,0) -> Chiude verso lo Spawn (0,0)
        this.buildHallway(12.5, 0, 15, 4, true); 

        // Sud da (25,0) -> Chiude verso il Goal (25,25)
        this.buildHallway(25, 12.5, 4, 15, false);
        
        // Triggers
        this.addTrigger(-12.5, 2, -25, "JUMPSCARE_MEDIUM_NW");
        this.addTrigger(25, 2, 12.5, "JUMPSCARE_MEDIUM_SE");
    }
}
