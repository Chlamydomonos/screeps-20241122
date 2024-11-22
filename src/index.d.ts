interface Memory {
    custom: Record<string, any>;
}

interface CreepMemory {
    role?: import('./creep/CreepRoles').CreepRoleName;
    data?: any;
}

interface RoomPosition {
    offset(direction: DirectionConstant): RoomPosition | undefined;
}
