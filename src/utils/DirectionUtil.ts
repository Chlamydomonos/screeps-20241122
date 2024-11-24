export const oppositeDirection = (direction: DirectionConstant) => {
    switch (direction) {
        case TOP:
            return BOTTOM;
        case TOP_RIGHT:
            return BOTTOM_LEFT;
        case RIGHT:
            return LEFT;
        case BOTTOM_RIGHT:
            return TOP_LEFT;
        case BOTTOM:
            return TOP;
        case BOTTOM_LEFT:
            return TOP_RIGHT;
        case LEFT:
            return RIGHT;
        case TOP_LEFT:
            return BOTTOM_RIGHT;
    }
};
