import { TreeAI } from '../base/TreeAI';
import { Carrier } from '../creep/roles/Carrier';
import { GlobalNamePool } from '../global/GlobalNamePool';
import { CreepCountController } from '../spawn/CreepCountController';
import { RoomAI } from './RoomAI';

const CARRIER_COUNT = 2;

export enum CarrierTaskStatus {
    IN_PROGRESS,
    FINISHED,
}

export interface CarrierTask {
    id: number;
    toId: Id<Structure>;
    isStructure: boolean;
    x: number;
    y: number;
    amount: number;
    toAmount: number;
    status: CarrierTaskStatus;
}

export class CarrierManager extends TreeAI<undefined> {
    incomingTasks: CarrierTask[] = [];

    constructor(readonly room: RoomAI) {
        super(`carrierManager#${room.name}`, () => undefined);
    }

    readonly CCC = this.registerChild(
        new CreepCountController(
            this.name,
            this.room,
            (room) => room.value!.controller!.level >= 2,
            () => CARRIER_COUNT,
            (m) => m.createTask('Carrier')
        )
    );

    createTask(
        to: Structure & { store: Store<RESOURCE_ENERGY, false> },
        amount: number,
        pos?: { x: number; y: number }
    ) {
        const isStructure = !!pos;
        const toPos = pos ?? to.pos;

        let toAmount = to.store.energy + amount;
        const capacity = to.store.getCapacity(RESOURCE_ENERGY);
        const toFull = toAmount - (capacity - to.store.energy);
        if (toFull > 0) {
            toAmount = capacity;
            amount -= toFull;
        }

        const task: CarrierTask = {
            id: GlobalNamePool.INSTANCE.genId(),
            toId: to.id,
            x: toPos.x,
            y: toPos.y,
            isStructure,
            amount,
            toAmount,
            status: CarrierTaskStatus.IN_PROGRESS,
        };

        this.incomingTasks.push(task);
        return task;
    }

    protected override tickSelf() {
        const oldIncomingTasks = this.incomingTasks;
        this.incomingTasks = [];
        const creepManager = this.room.creepManager.getOrCreateChild('Carrier').ais;

        if (oldIncomingTasks.length > 0) {
            let currentTask = oldIncomingTasks.shift();

            for (const carrierName in creepManager) {
                const creep = creepManager[carrierName];
                const role = creep.role as Carrier;
                if (!role.ready) {
                    continue;
                }

                while (currentTask && role.freeCapacity >= currentTask.amount) {
                    role.registerTask(currentTask);
                    currentTask = oldIncomingTasks.shift();
                }

                if (role.freeCapacity == 0) {
                    continue;
                }

                if (!currentTask) {
                    break;
                }

                const structure = Game.getObjectById(currentTask.toId) as StructureSpawn;
                let energy = structure.store.energy;
                if (energy < currentTask.toAmount - currentTask.amount) {
                    energy = currentTask.toAmount - currentTask.amount;
                }

                while (currentTask && energy >= currentTask.toAmount) {
                    currentTask.status = CarrierTaskStatus.FINISHED;
                    currentTask = oldIncomingTasks.shift();
                }

                if (!currentTask) {
                    break;
                }

                if (currentTask.toAmount - energy <= role.freeCapacity) {
                    currentTask.amount = currentTask.toAmount - energy;
                    role.registerTask(currentTask);
                    currentTask = oldIncomingTasks.shift();
                    continue;
                }

                const newTask: CarrierTask = {
                    id: GlobalNamePool.INSTANCE.genId(),
                    toId: currentTask.toId,
                    isStructure: currentTask.isStructure,
                    x: currentTask.x,
                    y: currentTask.y,
                    amount: role.freeCapacity,
                    toAmount: energy + role.freeCapacity,
                    status: CarrierTaskStatus.IN_PROGRESS,
                };
                role.registerTask(newTask);

                currentTask.amount -= role.freeCapacity;
            }

            if (currentTask) {
                this.incomingTasks.push(currentTask);
            }
            if (oldIncomingTasks.length > 0) {
                this.incomingTasks.push(...oldIncomingTasks);
            }
        }
    }
}
