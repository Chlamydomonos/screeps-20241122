interface Memory {
    version: number;
    dead?: boolean;
    custom: Record<string, any> & { containers: Record<string, any> };
}

interface CreepMemory {
    spawned?: boolean;
    role?: import('./creep/CreepRoles').CreepRoleName;
    data?: any;
}

interface RoomMemory {
    data?: import('./room/RoomAI').RoomMemory;
}

interface RoomPosition {
    offset(direction: DirectionConstant): RoomPosition | undefined;
}

interface Room {
    creepMoveRequests(): Record<number, Record<number, import('./room/CreepMovementManager').CreepMovementRequest[]>>;
}

interface Creep {
    getDodgeRequests(): import('./room/CreepMovementManager').DodgeRequest[];
}

declare var tick: number;
