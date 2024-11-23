import { CreepRole } from '../../CreepRole';

export const rememberSpawn = <T extends CreepRole & { memory: { spawnName?: string } }>(role: T) => {
    if (!role.memory.spawnName) {
        const spawn = role.creep.value!.pos.findInRange(FIND_MY_SPAWNS, 1)[0];
        role.memory.spawnName = spawn.name;
    }
};
