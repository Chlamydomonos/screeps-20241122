import { AIWithMemory } from '../base/AIWithMemory';
import { SpawnManager } from '../spawn/SpawnManager';
import { HarvestingPointManager } from './points/HarvestingPoint';
import { UpgradingPointManager } from './points/UpgradingPoint';
import { RoomManager } from './RoomManager';

interface Tickable {
    tick: () => void;
}

export class RoomAI extends AIWithMemory<Room, RoomManager> {
    readonly tickables: Tickable[] = [];
    private registerTickable<T extends Tickable>(tickable: T) {
        this.tickables.push(tickable);
        return tickable;
    }

    readonly harvestingPoints = this.registerTickable(new HarvestingPointManager(this));
    readonly upgradingPoints = this.registerTickable(new UpgradingPointManager(this));

    private constructor(room: Room) {
        super(room, RoomManager.INSTANCE, (room) => room.name);
    }

    static of(room: Room) {
        return RoomManager.INSTANCE.data[room.name] ?? new RoomAI(room);
    }

    override get value() {
        return Game.rooms[this.id];
    }

    get spawnManager() {
        return SpawnManager.INSTANCE.ofRoom(this.id);
    }

    override onDeath() {
        delete Memory.rooms[this.id];
    }

    override tick() {
        for (const tickable of this.tickables) {
            tickable.tick();
        }
    }

    pathCost(path: PathStep[]) {
        const terrain = this.value!.getTerrain();
        let cost = 0;
        for (const step of path) {
            const hasRoad = new RoomPosition(step.x, step.y, this.id).lookFor(LOOK_STRUCTURES).some((structure) => {
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
