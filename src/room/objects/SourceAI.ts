import { RoomAI } from '../RoomAI';
import { RoomObjectAI, RoomObjectAIManager } from '../RoomObjectAI';

export interface SourceAIMemory {
    harvestingPoints?: { x: number; y: number }[];
}

export class SourceAI extends RoomObjectAI<Source, SourceManager, SourceAIMemory> {
    constructor(source: Source, manager: SourceManager) {
        super(source, manager, () => ({}), []);
    }

    protected override initSelf(): void {
        const harvestingPoints = this.harvestingPoints;
        if (!this.memory.harvestingPoints) {
            this.memory.harvestingPoints = harvestingPoints.findPoints();
        } else {
            harvestingPoints.readMemory(this.memory.harvestingPoints);
        }
    }

    get room() {
        return RoomAI.of(this.value!.room);
    }

    get harvestingPoints() {
        return this.room.harvestingPoints.getOrCreateChild(this.name);
    }
}

export class SourceManager extends RoomObjectAIManager<Source, SourceAI, undefined, undefined> {
    constructor(readonly room: RoomAI) {
        super('SourceManager', undefined, undefined);
    }

    protected override initSelf() {
        const sources = this.room.value!.find(FIND_SOURCES);
        for (const source of sources) {
            new SourceAI(source, this);
        }
    }
}
