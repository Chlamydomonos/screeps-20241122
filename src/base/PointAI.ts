import { VirtualAI, VirtualAIManager } from './VirtualAI';

export class PointAI<M extends VirtualAIManager = VirtualAIManager, Me = any> extends VirtualAI<M, Me> {
    readonly x: number;
    readonly y: number;
    readonly roomName: string;

    constructor(className: string, position: RoomPosition, manager: M, initMemory?: () => Me) {
        super(className, () => `${className}#${position.roomName}-${position.x}-${position.y}`, manager, initMemory);
        this.x = position.x;
        this.y = position.y;
        this.roomName = position.roomName;
    }
}
