export class MemoryContainer<M> {
    constructor(readonly name: string, initMemory: () => M) {
        if (!Memory.custom.containers[name]) {
            Memory.custom.containers[name] = initMemory();
        }
    }

    get memory(): M {
        return Memory.custom.containers[this.name];
    }

    onDeath() {
        delete Memory.custom.containers[this.name];
    }
}
