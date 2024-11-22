export const ROOM_SIZE = 50;

export const DIRECTIONS = [TOP, TOP_LEFT, LEFT, BOTTOM_LEFT, BOTTOM, BOTTOM_RIGHT, RIGHT, TOP_RIGHT];

export const initRoomPosition = () => {
    RoomPosition.prototype.offset = function (this: RoomPosition, direction: DirectionConstant) {
        switch (direction) {
            case TOP:
                if (this.y == 0) {
                    return undefined;
                }
                return new RoomPosition(this.x, this.y - 1, this.roomName);
            case TOP_LEFT:
                if (this.x == 0 || this.y == 0) {
                    return undefined;
                }
                return new RoomPosition(this.x - 1, this.y - 1, this.roomName);
            case LEFT:
                if (this.x == 0) {
                    return undefined;
                }
                return new RoomPosition(this.x - 1, this.y, this.roomName);
            case BOTTOM_LEFT:
                if (this.x == 0 || this.y == ROOM_SIZE - 1) {
                    return undefined;
                }
                return new RoomPosition(this.x - 1, this.y + 1, this.roomName);
            case BOTTOM:
                if (this.y == ROOM_SIZE - 1) {
                    return undefined;
                }
                return new RoomPosition(this.x, this.y + 1, this.roomName);
            case BOTTOM_RIGHT:
                if (this.x == ROOM_SIZE - 1 && this.y == ROOM_SIZE - 1) {
                    return undefined;
                }
                return new RoomPosition(this.x + 1, this.y + 1, this.roomName);
            case RIGHT:
                if (this.x == ROOM_SIZE - 1) {
                    return undefined;
                }
                return new RoomPosition(this.x + 1, this.y, this.roomName);
            case TOP_RIGHT:
                if (this.x == ROOM_SIZE - 1 && this.y == 0) {
                    return undefined;
                }
                return new RoomPosition(this.x + 1, this.y - 1, this.roomName);
        }
    };
};
