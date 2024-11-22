import { PointAI } from '../../base/PointAI';
import { VirtualAIManager } from '../../base/VirtualAI';
import { CreepAI } from '../../creep/CreepAI';
import { DIRECTIONS } from '../../global/prototypes/RoomPosition';
import { SpawnTask, SpawnTaskStatus } from '../../spawn/SpawnAI';
import { RoomAI } from '../RoomAI';

interface HarvestingPointMemory {
    creepName?: string;
    sourceId: Id<Source>;
}

export class HarvestingPoint extends PointAI<HarvestingPointManager, HarvestingPointMemory> {
    constructor(pos: RoomPosition, source: Source, manager: HarvestingPointManager) {
        super('harvestingPoint', pos, manager, () => ({
            sourceId: source.id,
        }));
    }

    get pos() {
        return new RoomPosition(this.x, this.y, this.roomName);
    }

    get source() {
        return Game.getObjectById(this.memory.sourceId)!;
    }

    get room() {
        return RoomAI.of(Game.rooms[this.roomName]);
    }

    spawnTask?: SpawnTask;

    override tick() {
        if (this.spawnTask) {
            if (this.spawnTask.status == SpawnTaskStatus.CANCELED) {
                this.spawnTask = undefined;
            } else if (this.spawnTask.status == SpawnTaskStatus.FINISHED) {
                this.memory.creepName = this.spawnTask.name;
                const creep = CreepAI.of(Game.creeps[this.memory.creepName]);
                if (!creep) {
                    this.memory.creepName = undefined;
                }

                this.spawnTask = undefined;
            }
        } else {
            if (this.memory.creepName && !Game.creeps[this.memory.creepName]) {
                this.memory.creepName = undefined;
            }

            if (!this.memory.creepName) {
                this.spawnTask = this.room.spawnManager.createTask('EarlyHarvester', this);
            }
        }
    }
}

export class HarvestingPointManager extends VirtualAIManager<HarvestingPoint> {
    constructor(readonly room: RoomAI) {
        super();

        const sources = room.value!.find(FIND_SOURCES);
        const terrain = room.value!.getTerrain();
        for (const source of sources) {
            const poses: { pos: RoomPosition; pathLen: number }[] = [];
            for (const direction of DIRECTIONS) {
                const pos = source.pos.offset(direction);
                if (pos && terrain.get(pos.x, pos.y) != TERRAIN_MASK_WALL) {
                    const closestSpawn = pos.findClosestByPath(FIND_MY_SPAWNS);
                    poses.push({ pos, pathLen: room.pathCost(pos.findPathTo(closestSpawn!)) });
                }
            }

            const sorted = poses.sort((a, b) => a.pathLen - b.pathLen).filter((_, index) => index < 3);
            for (const pos of sorted) {
                new HarvestingPoint(pos.pos, source, this);
            }
        }
    }
}
