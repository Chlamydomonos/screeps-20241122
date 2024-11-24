import { DodgeRequest } from '../room/CreepMovementManager';
import { RoomAI } from '../room/RoomAI';
import { CreepAI } from './CreepAI';
import { CreepTaskResult } from './CreepTask';

export class CreepRole<M = any> {
    constructor(readonly creep: CreepAI) {}

    init() {}

    get memory(): M {
        return this.creep.memory.data;
    }

    tick(taskResult: CreepTaskResult, dodgeRequests: DodgeRequest[]) {}

    onDeath() {}
}

export interface CreepRoleConstructor<M = any, P extends any[] = any[]> {
    bodyParts(room: RoomAI): BodyPartConstant[];
    initMemory(...args: P): M;
    new (creep: CreepAI): CreepRole<M>;
}
