import { TreeAI } from '../base/TreeAI';
import { CreepRoleName, CreepRoles } from '../creep/CreepRoles';
import { IBuilder } from '../creep/roles/base/IBuilder';
import { CreepCountController } from '../spawn/CreepCountController';
import { SpawnTask } from '../spawn/SpawnAI';
import { Heap } from '../utils/Heap';
import { BuilderTask, BuilderTaskType, ConstructionTask, RepairTask } from './BuilderTask';
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

export class BuilderManager extends TreeAI<undefined> {
    readonly tasks: Record<string, BuilderTask> = {};

    spawnTasks: SpawnTask[] = [];

    constructor(readonly room: RoomAI) {
        super(`builderManager#${room.name}`, () => undefined);
    }

    readonly ccc = this.registerChild(
        new CreepCountController(
            this.name,
            this.room,
            (room) => room.value!.controller!.level >= 2,
            () => BUILDER_COUNT,
            (m) => m.createTask('EarlyBuilder')
        )
    );

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

    override tickSelf() {
        this.gatherTasks();

        const creepManager = this.room.creepManager;
        const builderList: IBuilder[] = [];

        if (creepManager) {
            for (const role of builderRoles) {
                const roleManager = creepManager.childManagers[role];
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
                if (task.type == BuilderTaskType.CONSTRUCTION) {
                    const structures = this.room.value!.lookForAt(LOOK_STRUCTURES, task.x, task.y);
                    for (const structure of structures) {
                        this.room.handleNewStructure(structure);
                    }
                }
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
}
