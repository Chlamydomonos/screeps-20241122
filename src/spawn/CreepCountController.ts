import { TreeAI } from '../base/TreeAI';
import { RoomAI } from '../room/RoomAI';
import { SpawnTask, SpawnTaskStatus } from './SpawnAI';
import { RoomSpawnManager } from './SpawnManager';

interface CreepCountControllerMemory {
    creepNames: string[];
}

export class CreepCountController extends TreeAI<CreepCountControllerMemory> {
    constructor(
        name: string,
        readonly room: RoomAI,
        readonly enableCondition: (room: RoomAI) => boolean,
        readonly count: (room: RoomAI) => number,
        readonly taskFactory: (spawn: RoomSpawnManager, room: RoomAI) => SpawnTask | undefined
    ) {
        super(`ccc#${name}`, () => ({ creepNames: [] }));
    }

    spawnTasks: SpawnTask[] = [];

    protected override tickSelf() {
        if (!this.enableCondition(this.room)) {
            return;
        }

        this.memory.creepNames = this.memory.creepNames.filter((n) => !!Game.creeps[n]);

        for (const creepName in this.spawnTasks) {
            const task = this.spawnTasks[creepName];
            if (task.status == SpawnTaskStatus.FINISHED) {
                if (Game.creeps[task.name]) {
                    this.memory.creepNames.push(task.name);
                }
                delete this.spawnTasks[creepName];
            } else if (task.status == SpawnTaskStatus.CANCELED) {
                delete this.spawnTasks[creepName];
            }
        }

        const total = this.memory.creepNames.length + Object.keys(this.spawnTasks).length;
        const needed = this.count(this.room);
        for (let i = total; i < needed; i++) {
            const task = this.taskFactory(this.room.spawnManager, this.room);
            if (!task) {
                return;
            }
            this.spawnTasks.push(task);
        }
    }
}
