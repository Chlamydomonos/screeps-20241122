import { CarrierTask, CarrierTaskStatus } from '../../room/CarrierManager';
import { DodgeRequest } from '../../room/CreepMovementManager';
import { ContainerRequest } from '../../room/objects/ContainerAI';
import { RoomAI } from '../../room/RoomAI';
import { oppositeDirection } from '../../utils/DirectionUtil';
import { staticImplements } from '../../utils/staticImplements';
import { CreepAI } from '../CreepAI';
import { CreepRole, CreepRoleConstructor } from '../CreepRole';
import { CreepTaskResult, CreepTaskStatus } from '../CreepTask';
import { MoveByPathTask } from '../tasks/MoveByPathTask';

const MAX_CARRY_PARTS = 10;

enum State {
    NEW_BORN,
    WAITING_FOR_ENERGY,
    MOVING_TO_CONTAINER,
    WAITING_FOR_TASK,
    FULFILLING_TASK,
}

@staticImplements<CreepRoleConstructor<undefined, State, []>>()
export class Carrier extends CreepRole<undefined, State> {
    static bodyParts(room: RoomAI) {
        const parts: BodyPartConstant[] = [];
        let cost = 0;
        const capacity = room.value!.energyCapacityAvailable;
        const moveCost = BODYPART_COST[MOVE];
        const carryCost = BODYPART_COST[CARRY];
        for (let i = 0; i < MAX_CARRY_PARTS; i++) {
            if (cost + moveCost + carryCost > capacity) {
                break;
            }
            cost += moveCost + carryCost;
            parts.push(MOVE, CARRY);
        }
        return parts;
    }

    static initMemory() {
        return undefined;
    }

    currentTask?: CarrierTask;
    containerRequest?: ContainerRequest;
    taskQueue: CarrierTask[] = [];
    taskEnergySum = 0;

    constructor(creep: CreepAI) {
        super(creep, State.NEW_BORN, {
            [State.NEW_BORN]: '👶',
            [State.MOVING_TO_CONTAINER]: '➡️🥤',
            [State.WAITING_FOR_ENERGY]: '⏳⚡',
            [State.WAITING_FOR_TASK]: '⏳📋',
            [State.FULFILLING_TASK]: '📋',
        });
    }

    get freeCapacity() {
        return this.creep.value!.store.energy - this.taskEnergySum;
    }

    get ready() {
        return this.state == State.WAITING_FOR_TASK || this.state == State.FULFILLING_TASK;
    }

    registerTask(task: CarrierTask) {
        this.taskQueue.push(task);
        this.taskEnergySum += task.amount;
    }

    get atTaskPoint() {
        if (!this.currentTask) {
            return false;
        }
        if (this.currentTask.isStructure) {
            return this.creep.value!.pos.inRangeTo(this.currentTask.x, this.currentTask.y, 1);
        } else {
            const pos = this.creep.value!.pos;
            return pos.x == this.currentTask.x && pos.y == this.currentTask.y;
        }
    }

    override tick(taskResult: CreepTaskResult, dodgeRequests: DodgeRequest[]): void {
        switch (this.state) {
            case State.NEW_BORN: {
                if (this.currentTask) {
                    if (this.currentTask.amount < this.creep.value!.store.energy) {
                        const path = this.creep.value!.pos.findPathTo(this.currentTask.x, this.currentTask.y);
                        this.creep.currentTask = new MoveByPathTask(this.creep, path);
                        this.toState(State.FULFILLING_TASK);
                    } else {
                        this.toState(State.WAITING_FOR_ENERGY);
                        break;
                    }
                }
                break;
            }
            case State.WAITING_FOR_ENERGY: {
                const store = this.creep.value!.store;
                const capacity = store.getCapacity(RESOURCE_ENERGY);
                const energy = store.energy;

                if (energy == capacity) {
                    this.toState(State.WAITING_FOR_TASK);
                    break;
                }

                const energyRequest = this.creep.room.containerManager.requestEnergy(capacity - energy);
                if (energyRequest) {
                    const path = this.creep.value!.pos.findPathTo(energyRequest.container.value!);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.toState(State.MOVING_TO_CONTAINER);
                } else if (dodgeRequests.length > 0) {
                    this.creep.requestMove(oppositeDirection(dodgeRequests[0].direction));
                }
                break;
            }
            case State.MOVING_TO_CONTAINER: {
                if (this.creep.value!.pos.inRangeTo(this.containerRequest!.container.value!, 1)) {
                    this.containerRequest?.container.fulfillRequest(this.containerRequest, this.creep.value!);
                    this.creep.clearTask();
                    this.toState(State.WAITING_FOR_TASK);
                } else if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                }
                break;
            }
            case State.WAITING_FOR_TASK: {
                if (this.taskQueue.length > 0) {
                    this.currentTask = this.taskQueue.shift();
                }

                if (this.currentTask) {
                    const path = this.creep.value!.pos.findPathTo(this.currentTask.x, this.currentTask.y);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.toState(State.FULFILLING_TASK);
                    break;
                }

                if (dodgeRequests.length > 0) {
                    this.creep.requestMove(oppositeDirection(dodgeRequests[0].direction));
                }

                break;
            }
            case State.FULFILLING_TASK: {
                if (taskResult.status == CreepTaskStatus.FAIL) {
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                    break;
                }

                if (!this.currentTask) {
                    this.toState(State.NEW_BORN);
                    this.creep.clearTask();
                    break;
                }

                if (this.atTaskPoint) {
                    const structure = Game.getObjectById(this.currentTask.toId) as StructureSpawn | null;
                    if (!structure) {
                        this.currentTask = undefined;
                        this.toState(State.NEW_BORN);
                        this.creep.clearTask();
                        break;
                    }

                    const energy = structure.store.energy;

                    if (energy < this.currentTask.toAmount) {
                        let amountToTransfer = this.currentTask.toAmount - energy;
                        if (amountToTransfer > this.currentTask.amount) {
                            amountToTransfer = this.currentTask.amount;
                        }
                        this.creep.value!.transfer(structure, RESOURCE_ENERGY, amountToTransfer);
                        this.taskEnergySum -= this.currentTask.amount;
                    }
                    this.currentTask.status = CarrierTaskStatus.FINISHED;
                    this.currentTask = undefined;

                    if (this.taskQueue.length == 0) {
                        this.toState(State.NEW_BORN);
                        this.creep.clearTask();
                        break;
                    }

                    this.currentTask = this.taskQueue.shift()!;

                    const path = this.creep.value!.pos.findPathTo(this.currentTask.x, this.currentTask.y);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                }

                break;
            }
        }
    }

    override onDeath() {
        const manager = this.creep.room.carrierManager;
        if (this.currentTask && this.currentTask.status != CarrierTaskStatus.FINISHED) {
            manager.incomingTasks.push(this.currentTask);
        }
        for (const task of this.taskQueue) {
            manager.incomingTasks.push(task);
        }
    }
}
