const MAX_ID = 0xffff_ffff;

export class GlobalNamePool {
    static readonly INSTANCE = new GlobalNamePool();

    private constructor() {}

    public increment() {
        if (!Memory.custom.globalId) {
            Memory.custom.globalId = 0;
        }

        Memory.custom.globalId++;
        if (Memory.custom.globalId > MAX_ID) {
            Memory.custom.globalId = 0;
        }
    }

    public genName(prefix: string, increment: boolean = true) {
        if (!Memory.custom.globalId) {
            Memory.custom.globalId = 0;
        }

        const result = `${prefix}${Memory.custom.globalId}`;

        if (increment) {
            Memory.custom.globalId++;
            if (Memory.custom.globalId > MAX_ID) {
                Memory.custom.globalId = 0;
            }
        }

        return result;
    }
}
