import { DodgeRequest } from '../../room/CreepMovementManager';
import { HarvestingPoint } from '../../room/positions/HarvestingPoint';
import { SpawnManager } from '../../spawn/SpawnManager';
import { oppositeDirection } from '../../utils/DirectionUtil';
import { staticImplements } from '../../utils/staticImplements';
import { CreepAI } from '../CreepAI';
import { CreepRole, type CreepRoleConstructor } from '../CreepRole';
import { CreepTaskResult, CreepTaskStatus } from '../CreepTask';
import { MoveByPathTask } from '../tasks/MoveByPathTask';
import { rememberSpawn } from './utils/rememberSpawn';

enum State {
    NEW_BORN,
    MOVING_TO_SOURCE,
    HARVESTING,
    RESTING_AT_SOURCE,
    MOVING_TO_SPAWN,
    RESTING_AT_SPAWN,
    DODGING_AT_SPAWN,
}

interface EarlyHarvesterMemory {
    harvestingPointName: string;
    spawnName?: string;
}

type Init = [HarvestingPoint];

@staticImplements<CreepRoleConstructor<EarlyHarvesterMemory, State, Init>>()
export class EarlyHarvester extends CreepRole<EarlyHarvesterMemory, State> {
    static bodyParts() {
        return [MOVE, WORK, CARRY];
    }

    static initMemory(harvestingPoint: HarvestingPoint) {
        return { harvestingPointName: harvestingPoint.name };
    }

    pathSpawnToSource?: PathStep[];
    pathSourceToSpawn?: PathStep[];

    constructor(creep: CreepAI) {
        super(creep, State.NEW_BORN, {
            [State.NEW_BORN]: '👶',
            [State.MOVING_TO_SOURCE]: '➡️⚡',
            [State.HARVESTING]: '⛏️⚡',
            [State.RESTING_AT_SOURCE]: '💤⚡',
            [State.MOVING_TO_SPAWN]: '➡️🏠',
            [State.RESTING_AT_SPAWN]: '💤🏠',
            [State.DODGING_AT_SPAWN]: '🏃‍♂️🏠',
        });
    }

    override init() {
        rememberSpawn(this);
    }

    override tick(taskResult: CreepTaskResult, dodgeRequests: DodgeRequest[]) {
        if (!this.memory.harvestingPointName) {
            return;
        }

        const harvestingPoint = this.creep.room.harvestingPoints.ais[this.memory.harvestingPointName];
        const spawn = SpawnManager.INSTANCE.ais[this.memory.spawnName!];

        switch (this.state) {
            case State.NEW_BORN: {
                if (this.pathSourceToSpawn) {
                    delete this.pathSourceToSpawn;
                }
                if (this.pathSpawnToSource) {
                    delete this.pathSpawnToSource;
                }

                if (this.creep.value!.store.energy == 0) {
                    const path = this.creep.value!.pos.findPathTo(harvestingPoint.pos);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.toState(State.MOVING_TO_SOURCE);
                } else {
                    const path = this.creep.value!.pos.findPathTo(spawn.value!);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.toState(State.MOVING_TO_SPAWN);
                }
                break;
            }
            case State.MOVING_TO_SOURCE: {
                if (taskResult.status == CreepTaskStatus.SUCCESS) {
                    this.toState(State.HARVESTING);
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                }
                break;
            }
            case State.HARVESTING: {
                if (this.creep.value!.store.getFreeCapacity('energy') == 0) {
                    this.toState(State.RESTING_AT_SOURCE);
                } else {
                    this.creep.value!.harvest(harvestingPoint.source);
                }
                break;
            }
            case State.RESTING_AT_SOURCE: {
                if (spawn.value!.store.getFreeCapacity('energy') > 0) {
                    this.toState(State.MOVING_TO_SPAWN);
                    if (!this.pathSourceToSpawn) {
                        this.pathSourceToSpawn = this.creep.value!.pos.findPathTo(spawn.value!);
                    }
                    this.creep.currentTask = new MoveByPathTask(this.creep, this.pathSourceToSpawn);
                }
                break;
            }
            case State.MOVING_TO_SPAWN: {
                if (this.creep.value!.pos.inRangeTo(spawn.value!, 1)) {
                    this.toState(State.RESTING_AT_SPAWN);
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                }
                break;
            }
            case State.RESTING_AT_SPAWN: {
                const energyLeft = this.creep.value!.store.energy;
                if (energyLeft == 0) {
                    this.toState(State.MOVING_TO_SOURCE);
                    if (!this.pathSpawnToSource) {
                        this.pathSpawnToSource = this.creep.value!.pos.findPathTo(harvestingPoint.pos);
                    }
                    this.creep.currentTask = new MoveByPathTask(this.creep, this.pathSpawnToSource);
                    break;
                }
                const energyToTransfer = Math.min(energyLeft, spawn.value!.store.getFreeCapacity('energy'));
                if (energyToTransfer > 0) {
                    this.creep.value!.transfer(spawn.value!, 'energy', energyToTransfer);
                }
                if (dodgeRequests.length > 0) {
                    this.toState(State.DODGING_AT_SPAWN);
                    this.creep.requestMove(oppositeDirection(dodgeRequests[0].direction));
                    break;
                }
                break;
            }
            case State.DODGING_AT_SPAWN: {
                if (dodgeRequests.length > 0) {
                    this.creep.requestMove(oppositeDirection(dodgeRequests[0].direction));
                    break;
                }

                if (this.creep.value!.store.energy == 0 || spawn.value!.store.getFreeCapacity('energy') > 0) {
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                    break;
                }

                break;
            }
        }
    }
}
