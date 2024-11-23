import { CreepAI } from './creep/CreepAI';
import { CreepManager } from './creep/CreepManager';
import { errorMapper } from './error-mapper';
import { init } from './global/init';
import { RoomAI } from './room/RoomAI';
import { RoomManager } from './room/RoomManager';
import { SpawnAI } from './spawn/SpawnAI';
import { SpawnManager } from './spawn/SpawnManager';

init();

const createAI = errorMapper(() => {
    for (const roomName in Game.rooms) {
        RoomAI.of(Game.rooms[roomName]);
    }

    for (const spawnName in Game.spawns) {
        SpawnAI.of(Game.spawns[spawnName]);
    }

    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        const ai = CreepAI.of(creep);
        if (!ai) {
            creep.suicide();
        }
    }
});

const runAI = () => {
    RoomManager.INSTANCE.tick();
    SpawnManager.INSTANCE.tick();
    CreepManager.INSTANCE.tick();
};

export const loop = () => {
    createAI();
    runAI();
};
