import { AI, AIManager } from '../base/AI';
import { CreepRoleConstructor } from '../creep/CreepRole';
import { CreepRoleName, CreepRoles } from '../creep/CreepRoles';
import { GlobalNamePool } from '../global/GlobalNamePool';
import { RoomAI } from '../room/RoomAI';
import { RoomSpawnManager, SpawnManager } from './SpawnManager';

export enum SpawnTaskStatus {
    IN_QUEUE,
    SPAWNING,
    CANCELED,
    FINISHED,
}

export class SpawnTask {
    readonly name: string;

    constructor(readonly role: CreepRoleName, readonly manager: RoomSpawnManager, readonly memory: any) {
        this.name = GlobalNamePool.INSTANCE.genName(role);
    }
    status: SpawnTaskStatus = SpawnTaskStatus.IN_QUEUE;

    destroy() {
        delete this.manager.tasks[this.role][this.name];
    }
}

export class SpawnAI extends AI<StructureSpawn, RoomSpawnManager> {
    private constructor(spawn: StructureSpawn) {
        super(
            spawn,
            SpawnManager.INSTANCE,
            (spawn) => spawn.name,
            (name) => Game.spawns[name],
            [spawn.room.name]
        );
    }

    static of(spawn: StructureSpawn) {
        return SpawnManager.INSTANCE.getOrCreateAI(spawn.name, spawn, (s) => new SpawnAI(s));
    }

    protected override onSelfDeath() {
        delete Memory.spawns[this.name];
    }

    readonly taskQueue: SpawnTask[] = [];
    taskSpawning?: SpawnTask;

    protected override tickSelf() {
        if (!this.taskSpawning) {
            let firstTask: SpawnTask;
            while (true) {
                if (this.taskQueue.length == 0) {
                    return;
                }

                const task = this.taskQueue[0];
                if (task.status == SpawnTaskStatus.CANCELED) {
                    this.taskQueue.shift();
                } else {
                    firstTask = task;
                    break;
                }
            }
            const role = firstTask.role;
            const name = firstTask.name;

            const statusCode = this.value!.spawnCreep(
                (CreepRoles[role].bodyParts as (...args: any[]) => any)(RoomAI.of(this.value!.room)),
                name,
                {
                    memory: { role, data: firstTask.memory },
                }
            );

            if (statusCode == OK) {
                this.taskQueue.shift();
                this.taskSpawning = firstTask;
                firstTask.status = SpawnTaskStatus.SPAWNING;
            }
        } else if (!this.value!.spawning) {
            console.log(`Spawn finished, creep: ${this.taskSpawning.name}`);
            const creep = Game.creeps[this.taskSpawning.name];
            console.log(creep ? 'found' : 'not found');
            creep.memory.spawned = true;
            this.taskSpawning.status = SpawnTaskStatus.FINISHED;
            this.taskSpawning = undefined;
        }
    }
}
