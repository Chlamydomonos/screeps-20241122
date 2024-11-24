import { initCreep } from './prototypes/Creep';
import { initRoom } from './prototypes/Room';
import { initRoomPosition } from './prototypes/RoomPosition';

const MEMORY_VERSION = 1;

const initMemory = () => {
    if (Memory.dead) {
        Memory.version = -1;
        Memory.dead = false;
    }

    if (Memory.version < MEMORY_VERSION) {
        Memory.version = MEMORY_VERSION;
        Memory.creeps = {};
        Memory.flags = {};
        Memory.powerCreeps = {};
        Memory.rooms = {};
        Memory.spawns = {};
        Memory.custom = undefined as any;
    }

    if (!Memory.custom) {
        Memory.custom = {
            containers: {},
        };
    }
};

const initPrototypes = () => {
    initRoomPosition();
    initRoom();
    initCreep();
};

export const init = () => {
    tick = 0;
    initPrototypes();
    initMemory();
};
