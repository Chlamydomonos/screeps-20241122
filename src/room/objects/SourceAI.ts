import { HarvestingPoint } from '../positions/HarvestingPoint';
import { RoomAI } from '../RoomAI';
import { RoomObjectAI, RoomObjectAIManager } from '../RoomObjectAI';

export interface SourceAIMemory {
    harvestingPoints?: { x: number; y: number }[];
    hasContainer: boolean;
}

export class SourceAI extends RoomObjectAI<Source, SourceManager, SourceAIMemory> {
    constructor(source: Source, manager: SourceManager) {
        super(source, manager, () => ({ hasContainer: false }), []);
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

    protected override tickSelf() {
        if (tick % 10 == 1) {
            const pointsWithContainer: HarvestingPoint[] = [];
            const pointsWithoutContainer: HarvestingPoint[] = [];
            const harvestingPoints = this.harvestingPoints;
            for (const name in harvestingPoints.ais) {
                const point = harvestingPoints.ais[name];
                if (point.hasContainer) {
                    pointsWithContainer.push(point);
                } else {
                    pointsWithoutContainer.push(point);
                }
            }
            if (pointsWithContainer.length > 0) {
                this.memory.hasContainer = true;
                for (const point of pointsWithContainer) {
                    point.memory.enabled = true;
                }
                for (const point of pointsWithoutContainer) {
                    point.memory.enabled = false;
                }
            } else if (this.memory.hasContainer) {
                for (const point of pointsWithoutContainer) {
                    point.suicide();
                }
                this.memory.harvestingPoints = [];
                harvestingPoints.findPoints();
            }
        }
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
