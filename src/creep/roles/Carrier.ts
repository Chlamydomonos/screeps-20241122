import { RoomAI } from '../../room/RoomAI';
import { staticImplements } from '../../utils/staticImplements';
import { CreepRole, CreepRoleConstructor } from '../CreepRole';

const MAX_CARRY_PARTS = 10;

enum Status {
    NEW_BORN,
    WAITING_FOR_ENERGY,
    MOVING_TO_CONTAINER,
    WAITING_FOR_TASK,
    FULFILLING_TASK,
}

interface CarrierMemory {}

@staticImplements<CreepRoleConstructor<CarrierMemory, []>>()
export class Carrier extends CreepRole<CarrierMemory> {
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
        return {};
    }
}
