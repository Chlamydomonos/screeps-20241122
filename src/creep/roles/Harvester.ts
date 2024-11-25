import { HarvestingPoint } from '../../room/positions/HarvestingPoint';
import { RoomAI } from '../../room/RoomAI';
import { staticImplements } from '../../utils/staticImplements';
import { CreepAI } from '../CreepAI';
import { CreepRole, CreepRoleConstructor } from '../CreepRole';
import { CreepTaskResult, CreepTaskStatus } from '../CreepTask';
import { MoveByPathTask } from '../tasks/MoveByPathTask';

const MAX_HARVEST_PARTS = 10;

enum State {
    NEW_BORN,
    MOVING_TO_SOURCE,
    HARVESTING,
}

interface HarvesterMemory {
    harvestingPointName: string;
    containerId?: Id<StructureContainer>;
}

type Init = [HarvestingPoint];

@staticImplements<CreepRoleConstructor<HarvesterMemory, State, Init>>()
export class Harvester extends CreepRole<HarvesterMemory, State> {
    static bodyParts(room: RoomAI) {
        const parts: BodyPartConstant[] = [MOVE];
        let cost = BODYPART_COST[MOVE];
        const workCost = BODYPART_COST[WORK];
        const available = room.value!.energyCapacityAvailable;
        for (let i = 0; i < MAX_HARVEST_PARTS; i++) {
            if (cost + workCost > available) {
                break;
            }

            parts.push(WORK);
            cost += workCost;
        }

        return parts;
    }

    static initMemory(harvestingPoint: HarvestingPoint) {
        return { harvestingPointName: harvestingPoint.name };
    }

    constructor(creep: CreepAI) {
        super(creep, State.NEW_BORN, {
            [State.NEW_BORN]: '👶',
            [State.MOVING_TO_SOURCE]: '➡️⚡',
            [State.HARVESTING]: '⛏️⚡',
        });
    }

    override init(): void {
        const harvestingPoint = this.creep.room.harvestingPoints.ais[this.memory.harvestingPointName];
        const structures = this.creep.room.value!.lookForAt(LOOK_STRUCTURES, harvestingPoint.pos);
        for (const structure of structures) {
            if (structure.structureType == STRUCTURE_CONTAINER) {
                this.memory.containerId = structure.id as any;
            }
        }
    }

    override tick(taskResult: CreepTaskResult): void {
        const harvestingPoint = this.creep.room.harvestingPoints.ais[this.memory.harvestingPointName];
        switch (this.state) {
            case State.NEW_BORN: {
                const pos = this.creep.value!.pos;
                if (pos.x == harvestingPoint.x && pos.y == harvestingPoint.y) {
                    this.toState(State.HARVESTING);
                } else {
                    const path = pos.findPathTo(harvestingPoint.pos);
                    this.creep.currentTask = new MoveByPathTask(this.creep, path);
                    this.toState(State.MOVING_TO_SOURCE);
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
                const containerId = this.memory.containerId;
                if (!containerId) {
                    this.creep.value!.suicide();
                    break;
                }

                const container = Game.getObjectById(containerId!);
                if (!container) {
                    this.creep.value!.suicide();
                    break;
                }

                const freeCapacity = container.store.getFreeCapacity('energy');
                if (freeCapacity > 0) {
                    this.creep.value!.harvest(harvestingPoint.source);
                }

                break;
            }
        }
    }
}
