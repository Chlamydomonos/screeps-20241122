import { CreepAI } from './CreepAI';

export enum CreepTaskStatus {
    SUCCESS,
    IN_PROGRESS,
    FAIL,
}

export type CreepTaskResult<T = any> =
    | { status: CreepTaskStatus.SUCCESS | CreepTaskStatus.IN_PROGRESS }
    | { status: CreepTaskStatus.FAIL; reason?: T };

export abstract class CreepTask<T = any> {
    constructor(readonly creep: CreepAI) {}
    abstract tick(): CreepTaskResult<T>;
}
