import { HarvestingPoint } from '../../room/positions/HarvestingPoint';
import { SpawnManager } from '../../spawn/SpawnManager';
import { staticImplements } from '../../utils/staticImplements';
import { CreepAI } from '../CreepAI';
import { CreepRole, type CreepRoleConstructor } from '../CreepRole';
import { CreepTaskResult, CreepTaskStatus } from '../CreepTask';
import { MoveByPathTask } from '../tasks/MoveByPathTask';

enum Status {
    NEW_BORN,
    MOVING_TO_MINE,
    MINING,
    RESTING_AT_MINE,
    MOVING_TO_SPAWN,
    RESTING_AT_SPAWN,
}

interface EarlyHarvesterMemory {
    harvestingPointName: string;
    spawnName?: string;
}

type Init = [HarvestingPoint];

@staticImplements<CreepRoleConstructor<EarlyHarvesterMemory, Init>>()
export class EarlyHarvester extends CreepRole<EarlyHarvesterMemory> {
    static bodyParts() {
        return [MOVE, WORK, CARRY];
    }

    static initMemory(harvestingPoint: HarvestingPoint) {
        return { harvestingPointName: harvestingPoint.name };
    }

    status = Status.NEW_BORN;
    pathSpawnToSource?: PathStep[];
    pathSourceToSpawn?: PathStep[];

    constructor(creep: CreepAI) {
        super(creep);

        if (!this.memory.spawnName) {
            const spawn = this.creep.value!.pos.findInRange(FIND_MY_SPAWNS, 1)[0];
            this.memory.spawnName = spawn.name;
        }
    }

    override tick(taskResult: CreepTaskResult) {
        if (!this.memory.harvestingPointName) {
            return;
        }

        const harvestingPoint = this.creep.room.harvestingPoints.ais[this.memory.harvestingPointName];
        const spawn = SpawnManager.INSTANCE.ais[this.memory.spawnName!];

        switch (this.status) {
            case Status.NEW_BORN: {
                if (this.pathSourceToSpawn) {
                    delete this.pathSourceToSpawn;
                }
                if (this.pathSpawnToSource) {
                    delete this.pathSpawnToSource;
                }

                if (this.creep.value!.store.energy == 0) {
                    const path = this.creep.value!.pos.findPathTo(harvestingPoint.pos);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.status = Status.MOVING_TO_MINE;
                } else {
                    const path = this.creep.value!.pos.findPathTo(spawn.value!);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.status = Status.MOVING_TO_SPAWN;
                }
                break;
            }
            case Status.MOVING_TO_MINE: {
                if (taskResult.status == CreepTaskStatus.SUCCESS) {
                    this.status = Status.MINING;
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.status = Status.NEW_BORN;
                    this.creep.clearTask();
                }
                break;
            }
            case Status.MINING: {
                if (this.creep.value!.store.getFreeCapacity('energy') == 0) {
                    this.status = Status.RESTING_AT_MINE;
                } else {
                    this.creep.value!.harvest(harvestingPoint.source);
                }
                break;
            }
            case Status.RESTING_AT_MINE: {
                if (spawn.value!.store.getFreeCapacity('energy') > 0) {
                    this.status = Status.MOVING_TO_SPAWN;
                    if (!this.pathSourceToSpawn) {
                        this.pathSourceToSpawn = this.creep.value!.pos.findPathTo(spawn.value!);
                    }
                    this.creep.currentTask = new MoveByPathTask(this.creep, this.pathSourceToSpawn);
                }
                break;
            }
            case Status.MOVING_TO_SPAWN: {
                if (this.creep.value!.pos.inRangeTo(spawn.value!, 1)) {
                    this.status = Status.RESTING_AT_SPAWN;
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.status = Status.NEW_BORN;
                    this.creep.clearTask();
                }
                break;
            }
            case Status.RESTING_AT_SPAWN: {
                const energyLeft = this.creep.value!.store.energy;
                if (energyLeft == 0) {
                    this.status = Status.MOVING_TO_MINE;
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
                break;
            }
        }
    }
}
