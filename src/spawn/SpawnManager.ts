import { AIManager } from '../base/AI';
import { type CreepRoleConstructor } from '../creep/CreepRole';
import { type CreepRoleName, CreepRoles } from '../creep/CreepRoles';
import { SpawnAI, SpawnTask, SpawnTaskStatus } from './SpawnAI';

type ArgsOf<T extends CreepRoleName> = (typeof CreepRoles)[T] extends CreepRoleConstructor<any, infer P> ? P : never;

export class RoomSpawnManager extends AIManager<StructureSpawn, SpawnAI> {
    readonly tasks: Record<string, Record<string, SpawnTask>> = {};

    createTask<T extends CreepRoleName>(role: T, ...args: ArgsOf<T>) {
        if (Object.keys(this.data).length == 0) {
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
        for (const spawnName in this.data) {
            const spawn = this.data[spawnName];
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

export class SpawnManager extends AIManager<StructureSpawn, SpawnAI> {
    readonly rooms: Record<string, RoomSpawnManager> = {};

    static readonly INSTANCE = new SpawnManager();
    private constructor() {
        super();
    }

    override registerAI(ai: SpawnAI, fromChild: boolean = false) {
        if (!fromChild) {
            const roomName = ai.value!.room.name;
            if (!this.rooms[roomName]) {
                this.rooms[roomName] = new RoomSpawnManager(this);
            }
            this.rooms[roomName].registerAI(ai);
        } else {
            super.registerAI(ai);
        }
    }

    override tick() {
        for (const name in this.rooms) {
            this.rooms[name].tick();
        }
    }

    ofRoom(roomName: string) {
        if (!this.rooms[roomName]) {
            this.rooms[roomName] = new RoomSpawnManager();
        }

        return this.rooms[roomName];
    }
}
