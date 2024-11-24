export const initRoom = () => {
    Room.prototype.creepMoveRequests = function (this: Room) {
        const self = this as any;
        if (!self.__creepMoveRequests) {
            self.__creepMoveRequests = {};
        }
        return self.__creepMoveRequests;
    };
};
