import { MapBase } from './MapBase.js?v=2';

export class MapHard extends MapBase {
    load() {
        this.monsterSpawn.set(0, 1.5, 25); // Spawn a sud
        
        // Spawn (0,0) buio
        this.buildRoom(0, 0, 10, 10, ['N', 'S', 'E', 'W'], 0x555555); 

        // Ramo Nord
        this.buildHallway(0, -12.5, 4, 15, false);
        this.buildRoom(0, -25, 10, 10, ['S', 'W', 'E', 'N'], 0x222222);

        // Nord-Ovest
        this.buildHallway(-12.5, -25, 15, 4, true);
        this.buildRoom(-25, -25, 10, 10, ['E', 'S'], 0x331111);

        // Ramo Ovest (dallo spawn)
        this.buildHallway(-12.5, 0, 15, 4, true);
        this.buildRoom(-25, 0, 10, 10, ['E', 'N', 'S'], 0x111133);

        // Connessione Nord-Ovest a Ovest
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
        this.buildRoom(25, -25, 10, 10, ['W', 'S', 'E'], 0x440000);

        // Connessione Nord a Nord-Est
        this.buildHallway(25, -12.5, 4, 15, false);

        // Estensione lunghissima verso il GOAL
        this.buildHallway(37.5, -25, 15, 4, true);
        this.buildRoom(50, -25, 10, 10, ['W', 'E'], 0x050505);
        this.buildHallway(62.5, -25, 15, 4, true);
        
        // Stanza Finale col GOAL
        this.buildRoom(75, -25, 10, 10, ['W', 'GOAL_E'], 0x000000);

        // Per non renderla un dead end lungo (vicolo cieco) e basta, creiamo un corridoio di ritorno
        this.buildHallway(75, -12.5, 4, 15, false);
        this.buildRoom(75, 0, 10, 10, ['N', 'W'], 0x050505);
        
        // Ritorno lunghissimo verso la base
        this.buildHallway(62.5, 0, 15, 4, true);
        this.buildHallway(50, 0, 10, 4, true); // Stanza finta, corridoio dritto
        this.buildHallway(37.5, 0, 15, 4, true); // Ritorna a Est (25,0) che ha la porta E ora:
        // Aspetta, Est (25,0) ha porte 'W', 'S', 'N'. Aggiungo 'E' a (25,0) nel buildRoom:
        // Sopra: this.buildRoom(25, 0, 10, 10, ['W', 'S', 'N', 'E'], ...);
        // Devo farlo nel prossimo `replace`? L'ho sovrascritto. Vado a modificare la linea 33 qui:
        // No, in MapHard posso scrivere semplicemente:
        // "Est (25,0)" è a riga 32: this.buildRoom(25, 0, 10, 10, ['W', 'S', 'N', 'E'], 0x113311);

        // Triggers
        this.addTrigger(-25, 2, -12.5, "JUMPSCARE_HARD_RING_OVEST");
        this.addTrigger(12.5, 2, 25, "JUMPSCARE_HARD_SUD_EST");
        this.addTrigger(62.5, 2, -25, "JUMPSCARE_HARD_LUNGO_CORRIDOIO");
    }
}
