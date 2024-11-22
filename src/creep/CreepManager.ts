import { AIManager } from '../base/AI';
import { CreepAI } from './CreepAI';

export class RoomCreepManager extends AIManager<Creep, CreepAI> {
    readonly roles: Record<string, AIManager<Creep>> = {};

    override registerAI(ai: CreepAI, fromChild: boolean = false) {
        if (!fromChild) {
            if (!this.roles[ai.roleName]) {
                this.roles[ai.roleName] = new AIManager<Creep, CreepAI>(this);
            }
            this.roles[ai.roleName].registerAI(ai);
        } else {
            super.registerAI(ai);
        }
    }

    override tick() {
        for (const name in this.roles) {
            this.roles[name].tick();
        }
    }
}

export class CreepManager extends AIManager<Creep, CreepAI> {
    readonly rooms: Record<string, RoomCreepManager> = {};

    static readonly INSTANCE = new CreepManager();
    private constructor() {
        super();
    }

    override registerAI(ai: CreepAI, fromChild: boolean = false) {
        if (!fromChild) {
            const roomName = ai.value!.room.name;
            if (!this.rooms[roomName]) {
                this.rooms[roomName] = new RoomCreepManager(this);
            }
            this.rooms[roomName].registerAI(ai);
        } else {
            super.registerAI(ai);
        }
    }

    override tick() {
        for (const name in this.rooms) {
            this.rooms[name].tick();
        }
    }
}
