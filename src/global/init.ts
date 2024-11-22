import { initRoomPosition } from './prototypes/RoomPosition';

const initMemory = () => {
    Memory.custom = {
        containers: {},
    };
};

const initPrototypes = () => {
    initRoomPosition();
};

export const init = () => {
    initPrototypes();
    initMemory();
};
