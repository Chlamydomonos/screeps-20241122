import { AI } from '../base/AI';
import { RoomAI } from '../room/RoomAI';
import { RoleCreepManager, CreepManager } from './CreepManager';
import { CreepRole } from './CreepRole';
import { CreepRoleName, CreepRoles } from './CreepRoles';
import { CreepTask } from './CreepTask';
import { IdleTask } from './tasks/IdleTask';

export class CreepAI extends AI<Creep, RoleCreepManager> {
    readonly roleName: string;
    readonly role: CreepRole;

    private constructor(creep: Creep) {
        super(
            creep,
            CreepManager.INSTANCE,
            (creep) => creep.name,
            (name) => Game.creeps[name],
            [creep.room.name, creep.memory.role!]
        );

        this.roleName = creep.memory.role!;
        this.role = new CreepRoles[this.roleName as CreepRoleName](this);
    }
    static of(creep: Creep) {
        if (creep.memory.spawned && creep.memory.role && creep.memory.role in CreepRoles) {
            return CreepManager.INSTANCE.getOrCreateAI(creep.name, creep, (c) => new CreepAI(c));
        }
        return undefined;
    }

    override onDeath() {
        delete Memory.creeps[this.name];
    }

    get memory() {
        return this.value!.memory;
    }

    get room() {
        return RoomAI.of(this.value!.room);
    }

    currentTask: CreepTask = new IdleTask(this);

    clearTask() {
        this.currentTask = new IdleTask(this);
    }

    protected override tickSelf() {
        const taskResult = this.currentTask.tick();
        this.role.tick(taskResult, this.value!.getDodgeRequests());
    }

    protected override initSelf() {
        this.role.init();
    }

    requestMove(direction: DirectionConstant, priority: number = 1000) {
        if (this.value!.fatigue > 0) {
            return ERR_TIRED;
        } else {
            this.room.creepMovementManager.onRequest(this, direction, priority);
            return OK;
        }
    }
}
