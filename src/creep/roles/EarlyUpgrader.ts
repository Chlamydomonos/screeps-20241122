import { UpgradingPoint } from '../../room/positions/UpgradingPoint';
import { SpawnAI } from '../../spawn/SpawnAI';
import { staticImplements } from '../../utils/staticImplements';
import { CreepAI } from '../CreepAI';
import { CreepRole, CreepRoleConstructor } from '../CreepRole';
import { CreepTaskResult, CreepTaskStatus } from '../CreepTask';
import { MoveByPathTask } from '../tasks/MoveByPathTask';
import { rememberSpawn } from './utils/rememberSpawn';

enum Status {
    NEW_BORN,
    MOVING_TO_CONTROLLER,
    UPGRADING,
    MOVING_TO_SPAWN,
    RESTING_AT_SPAWN,
}

interface EarlyUpgraderMemory {
    upgradingPointName: string;
    spawnName?: string;
}

type Init = [UpgradingPoint];

@staticImplements<CreepRoleConstructor<EarlyUpgraderMemory, Init>>()
export class EarlyUpgrader extends CreepRole<EarlyUpgraderMemory> {
    static bodyParts() {
        return [MOVE, WORK, CARRY];
    }

    static initMemory(upgradingPoint: UpgradingPoint) {
        return { upgradingPointName: upgradingPoint.name };
    }

    status = Status.NEW_BORN;
    pathSpawnToController?: PathStep[];
    pathControllerToSpawn?: PathStep[];

    constructor(creep: CreepAI) {
        super(creep);
    }

    override init() {
        rememberSpawn(this);
    }

    override tick(taskResult: CreepTaskResult) {
        if (!this.memory.upgradingPointName) {
            return;
        }

        const upgradingPoint = this.creep.room.upgradingPoints.ais[this.memory.upgradingPointName];
        const spawn = Game.spawns[this.memory.spawnName!];

        switch (this.status) {
            case Status.NEW_BORN: {
                if (this.pathControllerToSpawn) {
                    delete this.pathControllerToSpawn;
                }
                if (this.pathSpawnToController) {
                    delete this.pathSpawnToController;
                }

                if (this.creep.value!.store.energy == 0) {
                    const path = this.creep.value!.pos.findPathTo(spawn);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.status = Status.MOVING_TO_SPAWN;
                } else {
                    const path = this.creep.value!.pos.findPathTo(upgradingPoint.pos);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.status = Status.MOVING_TO_CONTROLLER;
                }
                break;
            }
            case Status.MOVING_TO_CONTROLLER: {
                if (taskResult.status == CreepTaskStatus.SUCCESS) {
                    this.status = Status.UPGRADING;
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.status = Status.NEW_BORN;
                    this.creep.clearTask();
                }
                break;
            }
            case Status.UPGRADING: {
                if (this.creep.value!.store.energy > 0) {
                    const controller = this.creep.value!.room.controller!;
                    this.creep.value!.upgradeController(controller);
                } else {
                    if (!this.pathControllerToSpawn) {
                        this.pathControllerToSpawn = this.creep.value!.pos.findPathTo(spawn);
                    }
                    this.creep.currentTask = new MoveByPathTask(this.creep, this.pathControllerToSpawn);
                    this.status = Status.MOVING_TO_SPAWN;
                }
                break;
            }
            case Status.MOVING_TO_SPAWN: {
                if (this.creep.value!.pos.inRangeTo(spawn, 1)) {
                    this.status = Status.RESTING_AT_SPAWN;
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.status = Status.NEW_BORN;
                    this.creep.clearTask();
                }
                break;
            }
            case Status.RESTING_AT_SPAWN: {
                const spawnHasTask = SpawnAI.of(spawn).taskQueue.length > 0;
                if (!spawnHasTask) {
                    const spawnEnergy = spawn.store.energy;
                    const capacity = this.creep.value!.store.getFreeCapacity('energy');
                    if (spawnEnergy >= capacity) {
                        this.creep.value!.withdraw(spawn, 'energy', capacity);
                        if (!this.pathSpawnToController) {
                            this.pathSpawnToController = this.creep.value!.pos.findPathTo(upgradingPoint.pos);
                        }
                        this.creep.currentTask = new MoveByPathTask(this.creep, this.pathSpawnToController);
                        this.status = Status.MOVING_TO_CONTROLLER;
                        break;
                    }
                }
                break;
            }
        }
    }
}
