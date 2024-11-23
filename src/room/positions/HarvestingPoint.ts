import { CreepAI } from '../../creep/CreepAI';
import { DIRECTIONS } from '../../global/prototypes/RoomPosition';
import { SpawnTask, SpawnTaskStatus } from '../../spawn/SpawnAI';
import { SourceAI } from '../objects/SourceAI';
import { PositionAI, PositionAIManager } from '../PositionAI';
import { RoomAI } from '../RoomAI';

export interface HarvestingPointMemory {
    creepName?: string;
    sourceId: string;
    distance: number;
    enabled: boolean;
}

export class HarvestingPoint extends PositionAI<SourceHarvestingPointManager, HarvestingPointMemory> {
    constructor(source: SourceAI, pos: RoomPosition, manager: HarvestingPointManager) {
        super(
            'harvestingPoint',
            pos,
            manager,
            () => ({
                sourceId: source.name,
                distance: 0xffff_ffff,
                enabled: false,
            }),
            [source.name]
        );
    }

    spawnTask?: SpawnTask;

    get source(): Source {
        return Game.getObjectById(this.memory.sourceId)!;
    }

    get room() {
        return RoomAI.of(Game.rooms[this.pos.roomName]);
    }

    protected override tickSelf() {
        if (!this.memory.enabled) {
            return;
        }

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

export class SourceHarvestingPointManager extends PositionAIManager<
    HarvestingPoint,
    undefined,
    HarvestingPointManager
> {
    constructor(name: string, parent: HarvestingPointManager) {
        super(name, undefined, parent);
    }

    findPoints() {
        const source = this.parent.room.sourceManager.ais[this.name];
        const sourcePos = source.value!.pos;
        const room = RoomAI.of(source.value!.room);
        const terrain = room.value!.getTerrain();
        const poses: { pos: RoomPosition; distance: number }[] = [];
        for (const direction of DIRECTIONS) {
            const pos = sourcePos.offset(direction);
            if (pos && terrain.get(pos.x, pos.y) != TERRAIN_MASK_WALL) {
                const closestSpawn = pos.findClosestByPath(FIND_MY_SPAWNS);
                poses.push({ pos, distance: room.pathCost(pos.findPathTo(closestSpawn!)) });
            }
        }

        const sorted = poses.sort((a, b) => a.distance - b.distance);
        for (let i = 0; i < sorted.length; i++) {
            const ai = new HarvestingPoint(source, poses[i].pos, this.parent);
            ai.memory.distance = poses[i].distance;
            ai.memory.enabled = i < 3;
        }

        return sorted.map((v) => ({ x: v.pos.x, y: v.pos.y }));
    }

    readMemory(memory: { x: number; y: number }[]) {
        const source = this.parent.room.sourceManager.ais[this.name];
        for (const elem of memory) {
            const pos = new RoomPosition(elem.x, elem.y, this.parent.room.name);
            new HarvestingPoint(source, pos, this.parent);
        }
    }
}

export class HarvestingPointManager extends PositionAIManager<
    HarvestingPoint,
    SourceHarvestingPointManager,
    undefined
> {
    constructor(readonly room: RoomAI) {
        super('HarvestingPointManager', SourceHarvestingPointManager, undefined);
    }
}
