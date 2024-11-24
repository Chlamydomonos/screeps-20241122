import { TreeAI } from '../base/TreeAI';
import { SpawnTask } from '../spawn/SpawnAI';
import { RoomAI } from './RoomAI';

const CARRIER_COUNT = 2;

interface CarrierTask {
    id: number;
    toId: Id<Structure>;
    x: number;
    y: number;
    amount: number;
    toAmount: number;
}

interface CarrierManagerMemory {
    creepNames: string[];
}

export class CarrierManager extends TreeAI<CarrierManagerMemory> {
    readonly tasks: Record<number, CarrierTask> = {};

    spawnTasks: SpawnTask[] = [];

    constructor(readonly room: RoomAI) {
        super(`carrierManager#${room.name}`, () => ({ creepNames: [] }));
    }
}
