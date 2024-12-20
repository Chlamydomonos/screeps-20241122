import { CreepAI } from './creep/CreepAI';
import { CreepManager } from './creep/CreepManager';
import { errorMapper } from './errorMapper';
import { init } from './global/init';
import { CreepMovementManager } from './room/CreepMovementManager';
import { RoomAI } from './room/RoomAI';
import { RoomManager } from './room/RoomManager';
import { SpawnAI } from './spawn/SpawnAI';
import { SpawnManager } from './spawn/SpawnManager';

init();

const createAI = () => {
    for (const roomName in Game.rooms) {
        RoomAI.of(Game.rooms[roomName]);
    }

    for (const spawnName in Game.spawns) {
        SpawnAI.of(Game.spawns[spawnName]);
    }

    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        if (creep.spawning) {
            continue;
        }

        if (creep.memory.spawned === undefined) {
            creep.memory.spawned = false;
        } else if (creep.memory.spawned === false) {
            creep.suicide();
        } else {
            const ai = CreepAI.of(creep);
            if (!ai) {
                creep.suicide();
            }
        }
    }
};

const runAI = () => {
    RoomManager.INSTANCE.tick();
    SpawnManager.INSTANCE.tick();
    CreepManager.INSTANCE.tick();
};

const handleMovement = () => {
    for (const roomName in Game.rooms) {
        CreepMovementManager.handleRequests(Game.rooms[roomName]);
    }
};

export const loop = errorMapper(() => {
    if (!Memory.dead) {
        createAI();
        runAI();
        handleMovement();
    } else {
        console.log('--------DEAD--------');
        if (Object.keys(Game.spawns).length > 0) {
            init();
        }
    }
    tick++;
});
