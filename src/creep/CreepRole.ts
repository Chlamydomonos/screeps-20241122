import { DodgeRequest } from '../room/CreepMovementManager';
import { RoomAI } from '../room/RoomAI';
import { CreepAI } from './CreepAI';
import { CreepTaskResult } from './CreepTask';

export class CreepRole<M = any, S extends number = any> {
    constructor(readonly creep: CreepAI, protected state: S, private messages: Record<S, string>) {}

    protected toState(state: S) {
        this.state = state;
        this.creep.value!.say(this.messages[state]);
    }

    init() {}

    get memory(): M {
        return this.creep.memory.data;
    }

    tick(taskResult: CreepTaskResult, dodgeRequests: DodgeRequest[]) {}

    onDeath() {}
}

export interface CreepRoleConstructor<M = any, S extends number = any, P extends any[] = any[]> {
    bodyParts(room: RoomAI): BodyPartConstant[];
    initMemory(...args: P): M;
    new (creep: CreepAI): CreepRole<M, S>;
}
