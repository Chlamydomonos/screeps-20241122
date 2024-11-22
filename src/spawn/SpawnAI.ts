import { AIWithMemory } from '../base/AIWithMemory';
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

export class SpawnAI extends AIWithMemory<StructureSpawn> {
    private constructor(spawn: StructureSpawn) {
        super(spawn, SpawnManager.INSTANCE, (spawn) => spawn.name);
    }

    static of(spawn: StructureSpawn) {
        return SpawnManager.INSTANCE.data[spawn.name] ?? new SpawnAI(spawn);
    }

    override get value(): StructureSpawn | undefined {
        return Game.spawns[this.id];
    }

    override onDeath(): void {
        delete Memory.spawns[this.id];
    }

    readonly taskQueue: SpawnTask[] = [];
    taskSpawning?: SpawnTask;

    override tick() {
        console.log(!!this.taskSpawning);
        console.log(this.taskSpawning?.name);
        console.log(this.taskSpawning?.status);
        console.log(this.taskQueue.length);
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
            this.taskSpawning.status = SpawnTaskStatus.FINISHED;
            this.taskSpawning = undefined;
        }
    }
}
