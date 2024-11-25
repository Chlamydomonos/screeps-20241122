import { BuilderTask, BuilderTaskType, ConstructionTask, RepairTask } from '../../room/BuilderTask';
import { DodgeRequest } from '../../room/CreepMovementManager';
import { SpawnManager } from '../../spawn/SpawnManager';
import { oppositeDirection } from '../../utils/DirectionUtil';
import { staticImplements } from '../../utils/staticImplements';
import { CreepAI } from '../CreepAI';
import { CreepRole, CreepRoleConstructor } from '../CreepRole';
import { CreepTaskResult, CreepTaskStatus } from '../CreepTask';
import { MoveByPathTask } from '../tasks/MoveByPathTask';
import { IBuilder } from './base/IBuilder';
import { rememberSpawn } from './utils/rememberSpawn';

enum State {
    NEW_BORN,
    MOVING_TO_SITE,
    BUILDING,
    MOVING_TO_REPAIR_SITE,
    REPAIRING,
    MOVING_TO_SPAWN,
    RESTING_AT_SPAWN,
    DODGING_AT_SPAWN,
}

interface EarlyBuilderMemory {
    spawnName?: string;
}

@staticImplements<CreepRoleConstructor<EarlyBuilderMemory, State, []>>()
export class EarlyBuilder extends CreepRole<EarlyBuilderMemory, State> implements IBuilder {
    currentTask?: BuilderTask;
    taskQueue: BuilderTask[] = [];

    constructor(creep: CreepAI) {
        super(creep, State.NEW_BORN, {
            [State.NEW_BORN]: '👶',
            [State.MOVING_TO_SPAWN]: '➡️🏠',
            [State.RESTING_AT_SPAWN]: '💤🏠',
            [State.DODGING_AT_SPAWN]: '🏃‍♂️🏠',
            [State.MOVING_TO_SITE]: '➡️🏗️',
            [State.BUILDING]: '🏗️',
            [State.MOVING_TO_REPAIR_SITE]: '➡️🏚️',
            [State.REPAIRING]: '🏚️',
        });
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

    override tick(taskResult: CreepTaskResult, dodgeRequests: DodgeRequest[]) {
        const spawn = SpawnManager.INSTANCE.ais[this.memory.spawnName!];

        switch (this.state) {
            case State.NEW_BORN: {
                if (!this.currentTask) {
                    if (this.taskQueue.length == 0) {
                        if (dodgeRequests.length > 0) {
                            this.creep.requestMove(oppositeDirection(dodgeRequests[0].direction));
                        }
                        break;
                    }

                    this.currentTask = this.taskQueue.shift()!;
                }

                if (this.creep.value!.store.energy == 0) {
                    const path = this.creep.value!.pos.findPathTo(spawn.value!);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.toState(State.MOVING_TO_SPAWN);
                } else if (this.currentTask.type == BuilderTaskType.CONSTRUCTION) {
                    const path = this.creep.value!.pos.findPathTo(this.currentTask.site);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.toState(State.MOVING_TO_SITE);
                } else {
                    const path = this.creep.value!.pos.findPathTo(this.currentTask.structure);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.toState(State.MOVING_TO_REPAIR_SITE);
                }
                break;
            }
            case State.MOVING_TO_SITE: {
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                    break;
                }

                if (this.creep.value!.pos.inRangeTo(this.currentTask!.value, 3)) {
                    this.toState(State.BUILDING);
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                }
                break;
            }
            case State.BUILDING: {
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                    break;
                }

                if (this.creep.value!.store.energy == 0) {
                    this.toState(State.MOVING_TO_SPAWN);
                    const path = this.creep.value!.pos.findPathTo(spawn.value!);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    break;
                }

                const site = (this.currentTask as ConstructionTask).site;

                if (site.progress == site.progressTotal) {
                    this.currentTask!.finished = true;
                    this.currentTask = undefined;
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                    break;
                }

                this.creep.value!.build(site);
                break;
            }
            case State.MOVING_TO_REPAIR_SITE: {
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                    break;
                }

                if (this.creep.value!.pos.inRangeTo(this.currentTask!.value, 3)) {
                    this.toState(State.REPAIRING);
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                }
                break;
            }
            case State.REPAIRING: {
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                    break;
                }

                if (this.creep.value!.store.energy == 0) {
                    this.toState(State.MOVING_TO_SPAWN);
                    const path = this.creep.value!.pos.findPathTo(spawn.value!);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    break;
                }

                const structure = (this.currentTask as RepairTask).structure;

                if (structure.hits == structure.hitsMax) {
                    this.currentTask!.finished = true;
                    this.currentTask = undefined;
                    this.creep.clearTask();
                    this.toState(State.NEW_BORN);
                    break;
                }

                this.creep.value!.repair(structure);
                break;
            }
            case State.MOVING_TO_SPAWN: {
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.creep.clearTask();
                    this.toState(State.NEW_BORN);
                    break;
                }

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
                if (!this.currentTask!.alive) {
                    this.currentTask = undefined;
                    this.creep.clearTask();
                    this.toState(State.NEW_BORN);
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
                            this.toState(State.MOVING_TO_SITE);
                        } else {
                            this.toState(State.MOVING_TO_REPAIR_SITE);
                        }

                        break;
                    }
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

                if (
                    this.creep.value!.store.energy > 0 ||
                    (spawn.taskQueue.length == 0 &&
                        spawn.value!.store.energy >= this.creep.value!.store.getCapacity('energy'))
                ) {
                    this.creep.clearTask();
                    this.toState(State.NEW_BORN);
                    break;
                }

                break;
            }
        }
    }
}
