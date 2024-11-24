import { MemoryContainer } from '../base/MemoryContainer';
import { CreepAI } from '../creep/CreepAI';
import { CreepManager } from '../creep/CreepManager';
import { CreepRoleName, CreepRoles } from '../creep/CreepRoles';
import { IBuilder } from '../creep/roles/base/IBuilder';
import { SpawnTask, SpawnTaskStatus } from '../spawn/SpawnAI';
import { Heap } from '../utils/Heap';
import { BuilderTask, ConstructionTask, RepairTask } from './BuilderTask';
import { RoomAI } from './RoomAI';

const BUILDER_COUNT = 2;

const buildableStructureTypes = new Set([
    STRUCTURE_EXTENSION,
    STRUCTURE_RAMPART,
    STRUCTURE_ROAD,
    STRUCTURE_SPAWN,
    STRUCTURE_LINK,
    STRUCTURE_WALL,
    STRUCTURE_STORAGE,
    STRUCTURE_TOWER,
    STRUCTURE_OBSERVER,
    STRUCTURE_POWER_SPAWN,
    STRUCTURE_EXTRACTOR,
    STRUCTURE_LAB,
    STRUCTURE_TERMINAL,
    STRUCTURE_CONTAINER,
    STRUCTURE_NUKER,
    STRUCTURE_FACTORY,
]);

function isBuildable(structure: Structure): structure is Structure<BuildableStructureConstant> {
    return structure.structureType in buildableStructureTypes;
}

type BuilderRoleName = {
    [Key in CreepRoleName]: (typeof CreepRoles)[Key] extends { new (...args: any[]): IBuilder } ? Key : never;
}[CreepRoleName];

const builderRoles: BuilderRoleName[] = ['EarlyBuilder'];

interface BuilderManagerMemory {
    creepNames: string[];
}

export class BuilderManager extends MemoryContainer<BuilderManagerMemory> {
    readonly tasks: Record<string, BuilderTask> = {};

    spawnTasks: SpawnTask[] = [];

    constructor(readonly room: RoomAI) {
        super(`builderManager#${room.name}`, () => ({ creepNames: [] }));
    }

    registerTask(task: BuilderTask) {
        this.tasks[task.objectId] = task;
    }

    gatherTasks() {
        const constructionSites = this.room.value!.find(FIND_CONSTRUCTION_SITES);
        for (const site of constructionSites) {
            ConstructionTask.of(site);
        }

        const repairSites = this.room.value!.find(FIND_MY_STRUCTURES, {
            filter: (structure) => isBuildable(structure) && structure.hits * 2 < structure.hitsMax,
        });
        for (const site of repairSites) {
            RepairTask.of(site as Structure<BuildableStructureConstant>);
        }
    }

    trySpawn() {
        const creepManager = this.room.creepManager;
        const spawnManager = this.room.spawnManager;

        if (Object.keys(creepManager.ais).length < 3) {
            return;
        }

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
        for (let i = total; i < BUILDER_COUNT; i++) {
            const task = spawnManager.createTask('EarlyBuilder');
            if (!task) {
                return;
            }
            this.spawnTasks.push(task);
        }
    }

    tick() {
        this.gatherTasks();
        this.trySpawn();

        const creepManager = this.room.creepManager;
        const builderList: IBuilder[] = [];

        if (creepManager) {
            for (const role of builderRoles) {
                const roleManager = creepManager.children[role];
                if (roleManager) {
                    for (const creepName in roleManager.ais) {
                        const creep = roleManager.ais[creepName];
                        if (creep.alive) {
                            builderList.push(creep.role as any);
                        }
                    }
                }
            }
        }

        const builders = new Heap((a, b) => a.taskCount - b.taskCount, builderList);

        for (const taskName in this.tasks) {
            const task = this.tasks[taskName];
            if (!task.alive) {
                delete this.tasks[taskName];
            } else if (!task.builder) {
                const minBuilder = builders.removeTop();
                if (minBuilder) {
                    minBuilder.addTask(task);
                    builders.insert(minBuilder);
                }
            }
        }
    }

    onCreepDeath(creep: CreepAI) {
        this.memory.creepNames = this.memory.creepNames.filter((n) => n != creep.name);
    }
}
