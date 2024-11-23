import { AI } from '../base/AI';
import { CreepManager } from '../creep/CreepManager';
import { SpawnManager } from '../spawn/SpawnManager';
import { BuilderManager } from './BuilderManager';
import { SourceManager } from './objects/SourceAI';
import { HarvestingPointManager } from './positions/HarvestingPoint';
import { UpgradingPointManager } from './positions/UpgradingPoint';
import { RoomManager } from './RoomManager';

export interface RoomMemory {
    upgradingPoints?: { x: number; y: number }[];
}

export class RoomAI extends AI<Room, RoomManager> {
    private constructor(room: Room) {
        super(
            room,
            RoomManager.INSTANCE,
            (room) => room.name,
            (name) => Game.rooms[name],
            []
        );

        if (!room.memory.data) {
            room.memory.data = {};
        }
    }

    protected override initSelf(): void {
        if (!this.memory.upgradingPoints) {
            this.memory.upgradingPoints = this.upgradingPoints.findPoints();
        } else {
            this.upgradingPoints.readMemory(this.memory.upgradingPoints);
        }
    }

    static of(room: Room) {
        return RoomManager.INSTANCE.getOrCreateAI(room.name, room, (r) => new RoomAI(r));
    }

    get memory() {
        return this.value!.memory.data!;
    }

    override onDeath() {
        delete Memory.rooms[this.name];
    }

    get creepManager() {
        return CreepManager.INSTANCE.getOrCreateChild(this.name);
    }

    get spawnManager() {
        return SpawnManager.INSTANCE.getOrCreateChild(this.name);
    }

    readonly harvestingPoints = this.registerTickable(new HarvestingPointManager(this));
    readonly sourceManager = this.registerTickable(new SourceManager(this));
    readonly upgradingPoints = this.registerTickable(new UpgradingPointManager(this));
    readonly builderManager = this.registerTickable(new BuilderManager(this));

    pathCost(path: PathStep[]) {
        const terrain = this.value!.getTerrain();
        let cost = 0;
        for (const step of path) {
            const hasRoad = new RoomPosition(step.x, step.y, this.name).lookFor(LOOK_STRUCTURES).some((structure) => {
                structure.structureType == STRUCTURE_ROAD;
            });
            if (hasRoad) {
                cost += 1;
            } else {
                const terrainType = terrain.get(step.x, step.y);
                if (terrainType == TERRAIN_MASK_SWAMP) {
                    cost += 5;
                } else {
                    cost += 2;
                }
            }
        }
        return cost;
    }
}
