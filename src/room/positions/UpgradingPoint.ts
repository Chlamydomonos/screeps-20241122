import { DIRECTIONS } from '../../global/prototypes/RoomPosition';
import { CreepCountController } from '../../spawn/CreepCountController';
import { PositionAI, PositionAIManager } from '../PositionAI';
import { RoomAI } from '../RoomAI';

export interface UpgradingPointMemory {
    creepName?: string;
    controllerId: Id<StructureController>;
    enabled: boolean;
    distance: number;
}

export class UpgradingPoint extends PositionAI<UpgradingPointManager, UpgradingPointMemory> {
    constructor(pos: RoomPosition, controller: StructureController, manager: UpgradingPointManager) {
        super(
            'upgradingPoint',
            pos,
            manager,
            () => ({
                controllerId: controller.id,
                distance: 0xffff_ffff,
                enabled: false,
            }),
            []
        );
    }

    ccc = this.registerChild(
        new CreepCountController(
            this.name,
            this.room,
            (room) => this.memory.enabled && room.creepManager.count >= 1,
            () => 1,
            (m) => m.createTask('EarlyUpgrader', this)
        )
    );
}

export class UpgradingPointManager extends PositionAIManager<UpgradingPoint, undefined, undefined> {
    constructor(readonly room: RoomAI) {
        super('UpgradingPointManager', undefined, undefined);
    }

    findPoints() {
        const controller = this.room.value!.controller;
        if (controller) {
            const terrain = this.room.value!.getTerrain();

            const poses: { pos: RoomPosition; pathLen: number }[] = [];
            for (const direction of DIRECTIONS) {
                const pos = controller.pos.offset(direction);
                if (pos && terrain.get(pos.x, pos.y) != TERRAIN_MASK_WALL) {
                    const closestSpawn = pos.findClosestByPath(FIND_MY_SPAWNS);
                    poses.push({ pos, pathLen: this.room.pathCost(pos.findPathTo(closestSpawn!)) });
                }
            }

            const sorted = poses.sort((a, b) => a.pathLen - b.pathLen);
            for (let i = 0; i < sorted.length; i++) {
                const pos = sorted[i];
                const point = new UpgradingPoint(pos.pos, controller, this);
                point.memory.distance = pos.pathLen;
                point.memory.enabled = i < 3;
            }

            return sorted.map((v) => ({ x: v.pos.x, y: v.pos.y }));
        }
    }

    readMemory(memory: { x: number; y: number }[]) {
        const controller = this.room.value!.controller;
        if (controller) {
            for (const elem of memory) {
                const pos = new RoomPosition(elem.x, elem.y, this.room.name);
                new UpgradingPoint(pos, controller, this);
            }
        }
    }
}
