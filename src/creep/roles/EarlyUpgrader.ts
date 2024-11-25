import { DodgeRequest } from '../../room/CreepMovementManager';
import { UpgradingPoint } from '../../room/positions/UpgradingPoint';
import { SpawnAI } from '../../spawn/SpawnAI';
import { oppositeDirection } from '../../utils/DirectionUtil';
import { staticImplements } from '../../utils/staticImplements';
import { CreepAI } from '../CreepAI';
import { CreepRole, CreepRoleConstructor } from '../CreepRole';
import { CreepTaskResult, CreepTaskStatus } from '../CreepTask';
import { MoveByPathTask } from '../tasks/MoveByPathTask';
import { rememberSpawn } from './utils/rememberSpawn';

enum State {
    NEW_BORN,
    MOVING_TO_CONTROLLER,
    UPGRADING,
    MOVING_TO_SPAWN,
    RESTING_AT_SPAWN,
    DODGING_AT_SPAWN,
}

interface EarlyUpgraderMemory {
    upgradingPointName: string;
    spawnName?: string;
}

type Init = [UpgradingPoint];

@staticImplements<CreepRoleConstructor<EarlyUpgraderMemory, State, Init>>()
export class EarlyUpgrader extends CreepRole<EarlyUpgraderMemory, State> {
    static bodyParts() {
        return [MOVE, WORK, CARRY];
    }

    static initMemory(upgradingPoint: UpgradingPoint) {
        return { upgradingPointName: upgradingPoint.name };
    }

    pathSpawnToController?: PathStep[];
    pathControllerToSpawn?: PathStep[];

    constructor(creep: CreepAI) {
        super(creep, State.NEW_BORN, {
            [State.NEW_BORN]: '👶',
            [State.MOVING_TO_SPAWN]: '➡️🏠',
            [State.RESTING_AT_SPAWN]: '💤🏠',
            [State.DODGING_AT_SPAWN]: '🏃‍♂️🏠',
            [State.MOVING_TO_CONTROLLER]: '➡️🖨️',
            [State.UPGRADING]: '🖨️',
        });
    }

    override init() {
        rememberSpawn(this);
    }

    override tick(taskResult: CreepTaskResult, dodgeRequests: DodgeRequest[]) {
        if (!this.memory.upgradingPointName) {
            return;
        }

        const upgradingPoint = this.creep.room.upgradingPoints.ais[this.memory.upgradingPointName];
        const spawn = Game.spawns[this.memory.spawnName!];

        switch (this.state) {
            case State.NEW_BORN: {
                if (this.pathControllerToSpawn) {
                    delete this.pathControllerToSpawn;
                }
                if (this.pathSpawnToController) {
                    delete this.pathSpawnToController;
                }

                if (this.creep.value!.store.energy == 0) {
                    const path = this.creep.value!.pos.findPathTo(spawn);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.toState(State.MOVING_TO_SPAWN);
                } else {
                    const path = this.creep.value!.pos.findPathTo(upgradingPoint.pos);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.toState(State.MOVING_TO_CONTROLLER);
                }
                break;
            }
            case State.MOVING_TO_CONTROLLER: {
                if (taskResult.status == CreepTaskStatus.SUCCESS) {
                    this.toState(State.UPGRADING);
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                }
                break;
            }
            case State.UPGRADING: {
                if (this.creep.value!.store.energy > 0) {
                    const controller = this.creep.value!.room.controller!;
                    this.creep.value!.upgradeController(controller);
                } else {
                    if (!this.pathControllerToSpawn) {
                        this.pathControllerToSpawn = this.creep.value!.pos.findPathTo(spawn);
                    }
                    this.creep.currentTask = new MoveByPathTask(this.creep, this.pathControllerToSpawn);
                    this.toState(State.MOVING_TO_SPAWN);
                }
                break;
            }
            case State.MOVING_TO_SPAWN: {
                if (this.creep.value!.pos.inRangeTo(spawn, 1)) {
                    this.toState(State.RESTING_AT_SPAWN);
                    this.creep.clearTask();
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                }
                break;
            }
            case State.RESTING_AT_SPAWN: {
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
                        this.toState(State.MOVING_TO_CONTROLLER);
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
                    (SpawnAI.of(spawn).taskQueue.length == 0 &&
                        spawn.store.energy >= this.creep.value!.store.getCapacity('energy'))
                ) {
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                    break;
                }

                break;
            }
        }
    }
}
