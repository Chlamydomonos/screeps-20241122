import { CreepAI } from '../creep/CreepAI';
import { BuilderManager } from './BuilderManager';
import { RoomAI } from './RoomAI';

export enum BuilderTaskType {
    CONSTRUCTION,
    REPAIR,
}

export interface BuilderTaskBase<T extends _HasId> {
    builder?: CreepAI;
    readonly room: RoomAI;
    readonly objectId: Id<T>;
    readonly alive: boolean;
    readonly manager: BuilderManager;
}

export class ConstructionTask implements BuilderTaskBase<ConstructionSite> {
    readonly objectId;
    finished = false;
    readonly type: BuilderTaskType.CONSTRUCTION = BuilderTaskType.CONSTRUCTION;

    readonly x: number;
    readonly y: number;

    private constructor(readonly site: ConstructionSite) {
        this.objectId = site.id;
        this.x = site.pos.x;
        this.y = site.pos.y;
        RoomAI.of(site.room!).builderManager.registerTask(this);
    }

    static of(site: ConstructionSite) {
        return RoomAI.of(site.room!).builderManager.tasks[site.id] ?? new ConstructionTask(site);
    }

    builder?: CreepAI = undefined;

    get alive() {
        if (this.finished) {
            return false;
        }

        const obj = Game.getObjectById(this.objectId);
        return !!obj;
    }

    get room() {
        return RoomAI.of(this.site.room!);
    }

    get manager() {
        return this.room.builderManager;
    }

    get value() {
        return this.site;
    }
}

export class RepairTask implements BuilderTaskBase<Structure<BuildableStructureConstant>> {
    readonly objectId;
    finished = false;
    readonly type: BuilderTaskType.REPAIR = BuilderTaskType.REPAIR;

    constructor(readonly structure: Structure<BuildableStructureConstant>) {
        this.objectId = structure.id;
        RoomAI.of(structure.room).builderManager.registerTask(this);
    }

    static of(structure: Structure<BuildableStructureConstant>) {
        return RoomAI.of(structure.room).builderManager.tasks[structure.id] ?? new RepairTask(structure);
    }

    builder?: CreepAI = undefined;

    get alive() {
        if (this.finished) {
            return false;
        }

        const obj = Game.getObjectById(this.objectId);
        return !!obj;
    }

    get room() {
        return RoomAI.of(this.structure.room);
    }

    get manager() {
        return this.room.builderManager;
    }

    get value() {
        return this.structure;
    }
}

export type BuilderTask = ConstructionTask | RepairTask;
