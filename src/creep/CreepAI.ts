import { AIWithMemory } from '../base/AIWithMemory';
import { RoomAI } from '../room/RoomAI';
import { CreepManager } from './CreepManager';
import { CreepRole } from './CreepRole';
import { CreepRoles } from './CreepRoles';
import { CreepTask } from './CreepTask';
import { IdleTask } from './tasks/IdleTask';

export class CreepAI extends AIWithMemory<Creep> {
    readonly role: CreepRole;

    private constructor(creep: Creep) {
        super(creep, CreepManager.INSTANCE, (creep) => creep.name);
        this.role = new CreepRoles[creep.memory.role!](this);
    }

    static of(creep: Creep) {
        const existing = CreepManager.INSTANCE.data[creep.name];
        if (existing) {
            return existing;
        }

        if (creep.memory.role && creep.memory.role in CreepRoles) {
            return new CreepAI(creep);
        }

        return undefined;
    }

    override get value(): Creep | undefined {
        return Game.creeps[this.id];
    }

    get roleName() {
        return this.value!.memory.role!;
    }

    get room() {
        return RoomAI.of(this.value!.room);
    }

    override onDeath(): void {
        this.role.onDeath();
        delete Memory.creeps[this.id];
    }

    currentTask: CreepTask = new IdleTask(this);
    defaultTask: () => CreepTask = () => new IdleTask(this);

    clearTask() {
        this.currentTask = this.defaultTask();
    }

    override tick() {
        const taskResult = this.currentTask.tick();
        this.role.tick(taskResult);
    }
}
