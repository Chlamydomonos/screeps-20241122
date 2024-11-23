import { AI, AIManager, ManagerNames, RootManager } from '../base/AI';

export class RoomObjectAI<T extends _HasId, M extends RoomObjectAIManager<T, any, undefined, any>, Me> extends AI<
    T,
    M
> {
    readonly memoryName: string;
    constructor(obj: T, manager: RootManager<M>, initMemory: () => Me, managerNames: ManagerNames<M>) {
        super(
            obj,
            manager,
            (o) => o.id,
            (id) => Game.getObjectById(id) as T,
            managerNames
        );
        this.memoryName = `roomObj#${this.name}`;

        if (!Memory.custom.containers[this.memoryName]) {
            Memory.custom.containers[this.memoryName] = initMemory();
        }
    }

    get memory(): Me {
        return Memory.custom.containers[this.memoryName];
    }

    override onDeath() {
        delete Memory.custom.containers[this.memoryName];
    }
}

export class RoomObjectAIManager<
    T extends _HasId,
    A extends RoomObjectAI<T, any, any>,
    C extends RoomObjectAIManager<T, A, any, any> | undefined,
    P extends RoomObjectAIManager<T, A, any, any> | undefined
> extends AIManager<T, A, C, P> {}
