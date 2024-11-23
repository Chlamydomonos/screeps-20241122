import { BuilderTask, BuilderTaskType, ConstructionTask, RepairTask } from '../../room/BuilderTask';
import { SpawnManager } from '../../spawn/SpawnManager';
import { staticImplements } from '../../utils/staticImplements';
import { CreepAI } from '../CreepAI';
import { CreepRole, CreepRoleConstructor } from '../CreepRole';
import { CreepTaskResult, CreepTaskStatus } from '../CreepTask';
import { MoveByPathTask } from '../tasks/MoveByPathTask';
import { IBuilder } from './base/IBuilder';
import { rememberSpawn } from './utils/rememberSpawn';

enum Status {
    NEW_BORN,
    MOVING_TO_SITE,
    BUILDING,
    MOVING_TO_SPAWN,
    RESTING_AT_SPAWN,
    MOVING_TO_REPAIR_SITE,
    REPAIRING,
}

interface EarlyBuilderMemory {
    spawnName?: string;
}

@staticImplements<CreepRoleConstructor<EarlyBuilderMemory, []>>()
export class EarlyBuilder extends CreepRole<EarlyBuilderMemory> implements IBuilder {
    currentTask?: BuilderTask;
    taskQueue: BuilderTask[] = [];
    status = Status.NEW_BORN;

    constructor(creep: CreepAI) {
        super(creep);
    }

    override init() {
        rememberSpawn(this);
    }

    static bodyParts() {
        return [MOVE, WORK, CARRY];
    }

    static initMemory() {
        return {};
    }

    get taskCount() {
        return this.taskQueue.length;
    }

    addTask(task: BuilderTask) {
        this.taskQueue.push(task);
    }

    override onDeath() {
        if (this.currentTask) {
            this.currentTask.builder = undefined;
        }
        for (const task of this.taskQueue) {
            task.builder = undefined;
        }
    }

    override tick(taskResult: CreepTaskResult) {
        const spawn = SpawnManager.INSTANCE.ais[this.memory.spawnName!];

        switch (this.status) {
            case Status.NEW_BORN: {
                if (!this.currentTask) {
                    if (this.taskQueue.length == 0) {
                        break;
                    }

                    this.currentTask = this.taskQueue.shift()!;
                }

                if (this.creep.value!.store.energy == 0) {
                    const path = this.creep.value!.pos.findPathTo(spawn.value!);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.status = Status.MOVING_TO_SPAWN;
                } else if (this.currentTask.type == BuilderTaskType.CONSTRUCTION) {
                    const path = this.creep.value!.pos.findPathTo(this.currentTask.site);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.status = Status.MOVING_TO_SITE;
                } else {
                    const path = this.creep.value!.pos.findPathTo(this.currentTask.structure);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.status = Status.MOVING_TO_REPAIR_SITE;
                }
                break;
            }
            case Status.MOVING_TO_SITE: {
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.status = Status.NEW_BORN;
                    break;
                }

                if (this.creep.value!.pos.inRangeTo(this.currentTask!.value, 3)) {
                    this.status = Status.BUILDING;
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.status = Status.NEW_BORN;
                    this.creep.clearTask();
                }
                break;
            }
            case Status.BUILDING: {
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.status = Status.NEW_BORN;
                    break;
                }

                if (this.creep.value!.store.energy == 0) {
                    this.status = Status.MOVING_TO_SPAWN;
                    const path = this.creep.value!.pos.findPathTo(spawn.value!);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    break;
                }

                const site = (this.currentTask as ConstructionTask).site;

                if (site.progress == site.progressTotal) {
                    this.currentTask!.finished = true;
                    this.currentTask = undefined;
                    this.status = Status.NEW_BORN;
                    break;
                }

                this.creep.value!.build(site);
                break;
            }
            case Status.MOVING_TO_REPAIR_SITE: {
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.status = Status.NEW_BORN;
                    break;
                }

                if (this.creep.value!.pos.inRangeTo(this.currentTask!.value, 3)) {
                    this.status = Status.REPAIRING;
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.status = Status.NEW_BORN;
                    this.creep.clearTask();
                }
                break;
            }
            case Status.REPAIRING: {
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.status = Status.NEW_BORN;
                    break;
                }

                if (this.creep.value!.store.energy == 0) {
                    this.status = Status.MOVING_TO_SPAWN;
                    const path = this.creep.value!.pos.findPathTo(spawn.value!);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    break;
                }

                const structure = (this.currentTask as RepairTask).structure;

                if (structure.hits == structure.hitsMax) {
                    this.currentTask!.finished = true;
                    this.currentTask = undefined;
                    this.status = Status.NEW_BORN;
                    break;
                }

                this.creep.value!.repair(structure);
                break;
            }
            case Status.MOVING_TO_SPAWN: {
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.status = Status.NEW_BORN;
                    break;
                }

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
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.status = Status.NEW_BORN;
                    break;
                }

                const spawnHasTask = spawn.taskQueue.length > 0;
                if (!spawnHasTask) {
                    const spawnEnergy = spawn.value!.store.energy;
                    const capacity = this.creep.value!.store.getFreeCapacity('energy');
                    if (spawnEnergy >= capacity) {
                        this.creep.value!.withdraw(spawn.value!, 'energy', capacity);

                        const path = this.creep.value!.pos.findPathTo(this.currentTask!.value);
                        this.creep.currentTask = new MoveByPathTask(this.creep, path);
                        if (this.currentTask!.type == BuilderTaskType.CONSTRUCTION) {
                            this.status = Status.MOVING_TO_SITE;
                        } else {
                            this.status = Status.MOVING_TO_REPAIR_SITE;
                        }

                        break;
                    }
                }

                break;
            }
        }
    }
}
