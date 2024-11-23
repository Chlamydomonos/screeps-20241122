import { AI, AIManager, ManagerNames, RootManager } from '../base/AI';
import { RoomAI } from './RoomAI';

export class PositionAI<M extends PositionAIManager<any, undefined, any>, Me> extends AI<undefined, M> {
    readonly x: number;
    readonly y: number;
    readonly roomName: string;

    private _alive = true;

    constructor(
        readonly className: string,
        pos: RoomPosition,
        manager: RootManager<M>,
        initMemory: () => Me,
        managerNames: ManagerNames<M>
    ) {
        super(
            undefined,
            manager,
            () => `${className}#${pos.roomName}-${pos.x}-${pos.y}`,
            () => undefined,
            managerNames
        );
        this.x = pos.x;
        this.y = pos.y;
        this.roomName = pos.roomName;
        if (!Memory.custom.containers[this.name]) {
            Memory.custom.containers[this.name] = initMemory();
        }
    }

    get memory(): Me {
        return Memory.custom.containers[this.name];
    }

    get pos() {
        return new RoomPosition(this.x, this.y, this.roomName);
    }

    get room() {
        return RoomAI.of(Game.rooms[this.roomName]);
    }

    override get alive() {
        return this._alive;
    }

    suicide() {
        this._alive = false;
    }

    override onDeath() {
        delete Memory.custom.containers[this.name];
    }
}

export class PositionAIManager<
    A extends PositionAI<any, any>,
    C extends PositionAIManager<A, any, any> | undefined,
    P extends PositionAIManager<A, any, any> | undefined
> extends AIManager<undefined, A, C, P> {}
