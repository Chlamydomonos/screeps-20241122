import { AIManager } from '../base/AI';
import { CreepRoleConstructor } from '../creep/CreepRole';
import { CreepRoleName, CreepRoles } from '../creep/CreepRoles';
import { SpawnAI, SpawnTask, SpawnTaskStatus } from './SpawnAI';

type ArgsOf<T extends CreepRoleName> = (typeof CreepRoles)[T] extends CreepRoleConstructor<any, infer P> ? P : never;

export class RoomSpawnManager extends AIManager<StructureSpawn, SpawnAI, undefined, SpawnManager> {
    constructor(name: string, parent: SpawnManager) {
        super(name, undefined, parent);
    }

    readonly tasks: Record<string, Record<string, SpawnTask>> = {};

    createTask<T extends CreepRoleName>(role: T, ...args: ArgsOf<T>) {
        if (Object.keys(this.ais).length == 0) {
            return undefined;
        }

        const memory = (CreepRoles[role].initMemory as (...args: any[]) => any)(...(args as any[]));
        const task = new SpawnTask(role, this, memory);
        if (!this.tasks[role]) {
            this.tasks[role] = {};
        }
        this.tasks[role][task.name] = task;

        let minTaskCount = 0xffff_ffff;
        let minSpawn: SpawnAI | undefined = undefined;
        for (const spawnName in this.ais) {
            const spawn = this.ais[spawnName];
            if (spawn.taskQueue.length < minTaskCount) {
                minTaskCount = spawn.taskQueue.length;
                minSpawn = spawn;
            }
        }
        minSpawn!.taskQueue.push(task);
        return task;
    }

    taskCount(role: CreepRoleName) {
        if (!this.tasks[role]) {
            this.tasks[role] = {};
        }
        return Object.keys(this.tasks[role]).length;
    }

    cancelTask(task: SpawnTask) {
        task.status = SpawnTaskStatus.CANCELED;
        delete this.tasks[task.name];
    }
}

export class SpawnManager extends AIManager<StructureSpawn, SpawnAI, RoomSpawnManager, undefined> {
    private constructor() {
        super('SpawnManager', RoomSpawnManager, undefined);
    }
    static readonly INSTANCE = new SpawnManager();

    override afterAIDeath(ai: SpawnAI) {
        if (Object.keys(this.ais).length == 0) {
            Memory.dead = true;
        }
    }
}
