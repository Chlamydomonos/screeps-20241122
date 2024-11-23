import { AIManager } from '../base/AI';
import { CreepAI } from './CreepAI';

export class RoleCreepManager extends AIManager<Creep, CreepAI, undefined, RoomCreepManager> {
    constructor(name: string, parent: RoomCreepManager) {
        super(name, undefined, parent);
    }
}

export class RoomCreepManager extends AIManager<Creep, CreepAI, RoleCreepManager, CreepManager> {
    constructor(name: string, parent: CreepManager) {
        super(name, RoleCreepManager, parent);
    }
}

export class CreepManager extends AIManager<Creep, CreepAI, RoomCreepManager, undefined> {
    private constructor() {
        super('CreepManager', RoomCreepManager, undefined);
    }
    static readonly INSTANCE = new CreepManager();
}
