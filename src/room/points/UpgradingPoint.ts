import { PointAI } from '../../base/PointAI';
import { VirtualAIManager } from '../../base/VirtualAI';
import { CreepAI } from '../../creep/CreepAI';
import { DIRECTIONS } from '../../global/prototypes/RoomPosition';
import { SpawnTask, SpawnTaskStatus } from '../../spawn/SpawnAI';
import { RoomAI } from '../RoomAI';

interface UpgradingPointMemory {
    creepName?: string;
    controllerId: Id<StructureController>;
}

export class UpgradingPoint extends PointAI<UpgradingPointManager, UpgradingPointMemory> {
    constructor(pos: RoomPosition, controller: StructureController, manager: UpgradingPointManager) {
        super('upgradingPoint', pos, manager, () => ({
            controllerId: controller.id,
        }));
    }

    get pos() {
        return new RoomPosition(this.x, this.y, this.roomName);
    }

    get source() {
        return Game.getObjectById(this.memory.controllerId)!;
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
                this.spawnTask = this.room.spawnManager.createTask('EarlyUpgrader', this);
            }
        }
    }
}

export class UpgradingPointManager extends VirtualAIManager<UpgradingPoint> {
    constructor(readonly room: RoomAI) {
        super();

        const controller = room.value!.controller;
        if (controller) {
            const terrain = room.value!.getTerrain();

            const poses: { pos: RoomPosition; pathLen: number }[] = [];
            for (const direction of DIRECTIONS) {
                const pos = controller.pos.offset(direction);
                if (pos && terrain.get(pos.x, pos.y) != TERRAIN_MASK_WALL) {
                    const closestSpawn = pos.findClosestByPath(FIND_MY_SPAWNS);
                    poses.push({ pos, pathLen: room.pathCost(pos.findPathTo(closestSpawn!)) });
                }
            }

            const sorted = poses.sort((a, b) => a.pathLen - b.pathLen).filter((_, index) => index < 3);
            for (const pos of sorted) {
                new UpgradingPoint(pos.pos, controller, this);
            }
        }
    }
}
