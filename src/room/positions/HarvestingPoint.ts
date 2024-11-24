import { DIRECTIONS } from '../../global/prototypes/RoomPosition';
import { CreepCountController } from '../../spawn/CreepCountController';
import { SpawnTask } from '../../spawn/SpawnAI';
import { SourceAI } from '../objects/SourceAI';
import { PositionAI, PositionAIManager } from '../PositionAI';
import { RoomAI } from '../RoomAI';

export interface HarvestingPointMemory {
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

    readonly ccc = this.registerChild(
        new CreepCountController(
            this.name,
            this.room,
            () => this.memory.enabled,
            () => 1,
            (m, room) => {
                if (room.value!.controller!.level < 2) {
                    return m.createTask('EarlyHarvester', this);
                }

                const lookStructure = room.value!.lookForAt(LOOK_STRUCTURES, this.x, this.y);
                let hasContainer = false;
                for (const structure of lookStructure) {
                    if (structure.structureType == STRUCTURE_CONTAINER) {
                        hasContainer = true;
                    }
                }

                if (hasContainer) {
                    return m.createTask('Harvester', this);
                } else {
                    return m.createTask('EarlyHarvester', this);
                }
            }
        )
    );

    spawnTask?: SpawnTask;
    hasContainer = false;

    get source(): Source {
        return Game.getObjectById(this.memory.sourceId)!;
    }

    get room() {
        return RoomAI.of(Game.rooms[this.pos.roomName]);
    }

    protected override tickSelf() {
        if (tick % 10 == 0) {
            this.hasContainer = false;
            const lookFor = this.room.value!.lookForAt(LOOK_STRUCTURES, this.x, this.y);
            for (const structure of lookFor) {
                if (structure.structureType == STRUCTURE_CONTAINER) {
                    this.hasContainer = true;
                }
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
