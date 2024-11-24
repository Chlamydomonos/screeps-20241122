export const initCreep = () => {
    Creep.prototype.getDodgeRequests = function (this: Creep) {
        const self = this as any;
        if (!self.__dodgeRequests) {
            self.__dodgeRequests = [];
        }

        return self.__dodgeRequests;
    };
};
